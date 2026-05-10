begin;

create table if not exists public.client_user_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  relationship_role text not null default 'caregiver',
  assigned_by uuid null references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_user_assignments_relationship_role_check
    check (relationship_role in ('caregiver', 'family', 'client', 'admin', 'viewer'))
);

create unique index if not exists client_user_assignments_active_key
on public.client_user_assignments(client_id, user_id)
where is_active = true;

create index if not exists client_user_assignments_org_idx
on public.client_user_assignments(organization_id, is_active);

create index if not exists client_user_assignments_user_idx
on public.client_user_assignments(user_id, is_active);

create index if not exists client_user_assignments_client_idx
on public.client_user_assignments(client_id, is_active);

drop trigger if exists set_client_user_assignments_updated_at on public.client_user_assignments;
create trigger set_client_user_assignments_updated_at
before update on public.client_user_assignments
for each row execute function public.touch_updated_at();

alter table public.client_user_assignments enable row level security;

drop policy if exists "assigned users view client assignments" on public.client_user_assignments;
create policy "assigned users view client assignments"
on public.client_user_assignments
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or user_id = auth.uid()
  )
);

drop policy if exists "admins manage client assignments" on public.client_user_assignments;
create policy "admins manage client assignments"
on public.client_user_assignments
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "org members view clients" on public.clients;
create policy "org members view clients"
on public.clients
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.client_user_assignments a
      where a.client_id = clients.id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

drop policy if exists "admins clients manage clients" on public.clients;
drop policy if exists "admins manage clients" on public.clients;
create policy "admins manage clients"
on public.clients
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "incident org members can view allowed incidents" on public.incidents;
create policy "incident org members can view allowed incidents"
on public.incidents
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or reported_by = auth.uid()
    or exists (
      select 1
      from public.shifts s
      where s.id = incidents.shift_id
        and s.caregiver_id = auth.uid()
    )
    or exists (
      select 1
      from public.client_user_assignments a
      where a.client_id = incidents.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

drop policy if exists "care team can create incidents" on public.incidents;
create policy "care team can create incidents"
on public.incidents
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and reported_by = auth.uid()
  and (
    public.is_admin()
    or (
      public.is_caregiver()
      and (
        client_id is null
        or exists (
          select 1
          from public.client_user_assignments a
          where a.client_id = incidents.client_id
            and a.user_id = auth.uid()
            and a.is_active = true
            and a.relationship_role in ('caregiver', 'admin')
        )
      )
    )
  )
);

alter table public.account_deletion_requests
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid null references public.profiles(id) on delete set null,
  add column if not exists admin_notes text;

create index if not exists account_deletion_requests_org_status_idx
on public.account_deletion_requests(organization_id, status, requested_at desc);

notify pgrst, 'reload schema';

commit;
