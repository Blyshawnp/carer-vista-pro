-- Harden public first-run onboarding bootstrap.
-- The app calls create_initial_organization() once from the authenticated
-- onboarding route. The function runs as SECURITY DEFINER so RLS does not need
-- broad insert policies for first-run organization/profile creation.

alter table public.clients
  add column if not exists emergency_contact_1_name text,
  add column if not exists emergency_contact_1_phone text,
  add column if not exists emergency_contact_1_relationship text,
  add column if not exists home_notes text;

create unique index if not exists organizations_one_owned_org_per_user_idx
on public.organizations(owner_id)
where owner_id is not null;

create or replace function public.set_organization_onboarding_completed_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.onboarding_complete = true and new.onboarding_completed_at is null then
      new.onboarding_completed_at = now();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.onboarding_complete = true and old.onboarding_complete is distinct from true then
      new.onboarding_completed_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_organization_onboarding_completed_at on public.organizations;
create trigger set_organization_onboarding_completed_at
before insert or update on public.organizations
for each row
execute function public.set_organization_onboarding_completed_at();

create or replace function public.create_initial_organization(
  p_organization_name text,
  p_setup_type text,
  p_first_role text,
  p_full_name text,
  p_client_name text,
  p_client_address text default null,
  p_emergency_name text default null,
  p_emergency_phone text default null,
  p_emergency_relationship text default null,
  p_home_notes text default null,
  p_invite_emails text[] default array[]::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_owner_role_label text;
  v_invite_email text;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if nullif(trim(p_organization_name), '') is null then
    raise exception 'Organization name is required.';
  end if;

  if p_setup_type not in ('personal_family', 'organization') then
    raise exception 'Setup type is invalid.';
  end if;

  if p_first_role not in ('client', 'family', 'admin') then
    raise exception 'First user role is invalid.';
  end if;

  if nullif(trim(p_client_name), '') is null then
    raise exception 'Care recipient name is required.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_user_id
      and organization_id is not null
  ) or exists (
    select 1
    from public.organizations
    where owner_id = v_user_id
  ) then
    raise exception 'This account is already set up.';
  end if;

  select email
  into v_email
  from auth.users
  where id = v_user_id;

  v_owner_role_label :=
    case
      when p_first_role in ('client', 'family') then 'Client/Family Admin'
      else null
    end;

  insert into public.organizations (
    name,
    setup_type,
    owner_id,
    onboarding_complete
  )
  values (
    trim(p_organization_name),
    p_setup_type,
    v_user_id,
    false
  )
  returning id into v_org_id;

  insert into public.profiles (
    id,
    organization_id,
    role,
    owner_role,
    owner_role_label,
    is_owner,
    full_name,
    email,
    phone,
    is_active
  )
  values (
    v_user_id,
    v_org_id,
    'admin',
    p_first_role,
    v_owner_role_label,
    true,
    coalesce(nullif(trim(p_full_name), ''), v_email, 'Account owner'),
    coalesce(v_email, ''),
    null,
    true
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    role = excluded.role,
    owner_role = excluded.owner_role,
    owner_role_label = excluded.owner_role_label,
    is_owner = excluded.is_owner,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    is_active = excluded.is_active;

  insert into public.clients (
    organization_id,
    full_name,
    address,
    emergency_contact_1_name,
    emergency_contact_1_phone,
    emergency_contact_1_relationship,
    home_notes
  )
  values (
    v_org_id,
    trim(p_client_name),
    nullif(trim(coalesce(p_client_address, '')), ''),
    nullif(trim(coalesce(p_emergency_name, '')), ''),
    nullif(trim(coalesce(p_emergency_phone, '')), ''),
    nullif(trim(coalesce(p_emergency_relationship, '')), ''),
    nullif(trim(coalesce(p_home_notes, '')), '')
  );

  foreach v_invite_email in array coalesce(p_invite_emails, array[]::text[])
  loop
    v_invite_email := lower(trim(v_invite_email));

    if v_invite_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      insert into public.invitations (
        organization_id,
        full_name,
        email,
        role,
        invited_by,
        created_by,
        status
      )
      values (
        v_org_id,
        split_part(v_invite_email, '@', 1),
        v_invite_email,
        'caregiver',
        v_user_id,
        v_user_id,
        'pending'
      );
    end if;
  end loop;

  update public.organizations
  set onboarding_complete = true
  where id = v_org_id;

  return v_org_id;
end;
$$;

revoke all on function public.create_initial_organization(
  text, text, text, text, text, text, text, text, text, text, text[]
) from public;

grant execute on function public.create_initial_organization(
  text, text, text, text, text, text, text, text, text, text, text[]
) to authenticated;
