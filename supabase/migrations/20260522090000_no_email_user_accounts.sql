begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists has_real_email boolean not null default true;

update public.profiles
set has_real_email = false,
    username = coalesce(
      username,
      nullif(regexp_replace(split_part(email, '@', 1), '[^a-z0-9]', '', 'g'), '')
    )
where lower(email) like '%@noemail.local'
  and has_real_email is distinct from false;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9]{2,32}$');

create unique index if not exists profiles_org_username_unique_idx
on public.profiles(organization_id, username)
where username is not null;

create unique index if not exists profiles_no_email_username_unique_idx
on public.profiles(username)
where has_real_email = false and username is not null;

create index if not exists profiles_no_email_username_idx
on public.profiles(username)
where has_real_email = false and username is not null and is_active = true;

drop function if exists public.resolve_no_email_username(text);

create or replace function public.resolve_no_email_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where p.username = lower(trim(p_username))
    and p.has_real_email = false
    and p.is_active = true
  limit 1
$$;

revoke all on function public.resolve_no_email_username(text) from public;

drop function if exists public.accept_invitation(text, text);

create or replace function public.accept_invitation(
  invitation_token text,
  invited_phone text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'A signed-in session is required to accept this invitation.';
  end if;

  select *
  into inv
  from public.invitations
  where token = invitation_token
  for update;

  if not found then
    return false;
  end if;

  if inv.status <> 'pending' or inv.accepted_at is not null or inv.expires_at < now() then
    return false;
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.profiles (
    id,
    organization_id,
    full_name,
    email,
    phone,
    role,
    has_real_email,
    is_active
  )
  values (
    v_user_id,
    inv.organization_id,
    inv.full_name,
    coalesce(v_email, inv.email, ''),
    invited_phone,
    inv.role,
    coalesce(v_email, inv.email, '') not like '%@noemail.local',
    true
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role,
    has_real_email = excluded.has_real_email,
    is_active = true;

  if inv.role = 'caregiver' and inv.caregiver_hourly_rate is not null then
    insert into public.caregiver_rates (
      caregiver_id,
      base_hourly_rate,
      effective_from
    )
    values (
      v_user_id,
      inv.caregiver_hourly_rate,
      current_date
    )
    on conflict do nothing;
  end if;

  update public.invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now(),
      updated_at = now()
  where id = inv.id;

  return true;
end;
$$;

commit;
