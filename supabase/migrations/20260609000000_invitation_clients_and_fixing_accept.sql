begin;

-- Add client_id and client_ids columns to invitations table
alter table public.invitations
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists client_ids uuid[] null;

-- Recreate accept_invitation function to auto-assign accepted users to client(s)
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

  -- Auto-create assignments in client_user_assignments
  if inv.client_id is not null then
    insert into public.client_user_assignments (
      organization_id,
      client_id,
      user_id,
      relationship_role,
      assigned_by,
      is_active
    )
    values (
      inv.organization_id,
      inv.client_id,
      v_user_id,
      inv.role,
      inv.invited_by,
      true
    )
    on conflict (client_id, user_id) where is_active = true do update set
      relationship_role = excluded.relationship_role,
      organization_id = excluded.organization_id,
      assigned_by = excluded.assigned_by;
  end if;

  if inv.client_ids is not null then
    insert into public.client_user_assignments (
      organization_id,
      client_id,
      user_id,
      relationship_role,
      assigned_by,
      is_active
    )
    select 
      inv.organization_id,
      c_id,
      v_user_id,
      inv.role,
      inv.invited_by,
      true
    from unnest(inv.client_ids) as c_id
    on conflict (client_id, user_id) where is_active = true do update set
      relationship_role = excluded.relationship_role,
      organization_id = excluded.organization_id,
      assigned_by = excluded.assigned_by;
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
