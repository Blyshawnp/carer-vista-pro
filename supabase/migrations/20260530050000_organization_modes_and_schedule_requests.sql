begin;

-- 1. Add organization mode and permission flags to the organizations table
alter table public.organizations add column if not exists organization_mode text not null default 'personal_family'
  check (organization_mode in ('personal_family', 'agency_company', 'solo_caregiver', 'client_directed_care'));

alter table public.organizations add column if not exists allow_client_admin_for_personal_use boolean not null default true;
alter table public.organizations add column if not exists client_can_request_shifts boolean not null default true;
alter table public.organizations add column if not exists client_can_request_preferred_caregivers boolean not null default true;
alter table public.organizations add column if not exists client_can_view_invoices boolean not null default true;
alter table public.organizations add column if not exists family_can_view_invoices boolean not null default true;
alter table public.organizations add column if not exists client_can_manage_family_access boolean not null default true;
alter table public.organizations add column if not exists client_can_submit_feedback boolean not null default true;
alter table public.organizations add column if not exists family_can_submit_feedback boolean not null default true;

-- Migrate existing setup_type mapping
update public.organizations set organization_mode = 'personal_family' where setup_type = 'personal_family';
update public.organizations set organization_mode = 'agency_company' where setup_type = 'organization';

-- 2. Create the schedule_coverage_requests table
create table if not exists public.schedule_coverage_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requested_date date not null,
  start_time time not null,
  end_time time not null,
  recurring_option text not null default 'none' check (recurring_option in ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  caregiver_preferences text null,
  notes text null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'scheduled', 'cancelled')),
  decline_reason text null,
  assigned_caregiver_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid references public.profiles(id) on delete set null
);

-- Triggers for touching updated_at
drop trigger if exists set_schedule_coverage_requests_updated_at on public.schedule_coverage_requests;
create trigger set_schedule_coverage_requests_updated_at
before update on public.schedule_coverage_requests
for each row execute function public.touch_updated_at();

-- Enable RLS
alter table public.schedule_coverage_requests enable row level security;

-- Drop existing policies if any
drop policy if exists "users view schedule requests" on public.schedule_coverage_requests;
drop policy if exists "users insert schedule requests" on public.schedule_coverage_requests;
drop policy if exists "users update schedule requests" on public.schedule_coverage_requests;

-- 3. Row Level Security Policies
-- SELECT: Admins can see everything in their org; caregivers/clients/family can see requests they requested or where they have relationship assignment to that client
create policy "users view schedule requests"
on public.schedule_coverage_requests
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or requested_by = auth.uid()
    or exists (
      select 1 from public.client_user_assignments assignment
      where assignment.client_id = schedule_coverage_requests.client_id
        and assignment.user_id = auth.uid()
        and assignment.is_active = true
    )
  )
);

-- INSERT: Clients/family can insert if they are assigned to the client. Admins can insert.
create policy "users insert schedule requests"
on public.schedule_coverage_requests
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or requested_by = auth.uid()
    or exists (
      select 1 from public.client_user_assignments assignment
      where assignment.client_id = schedule_coverage_requests.client_id
        and assignment.user_id = auth.uid()
        and assignment.is_active = true
    )
  )
);

-- UPDATE: Admins can update any request in their org; clients/family can cancel/update their own if it is still pending
create policy "users update schedule requests"
on public.schedule_coverage_requests
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or (
      requested_by = auth.uid()
      and status = 'pending'
    )
  )
)
with check (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or (
      requested_by = auth.uid()
      and status in ('pending', 'cancelled')
    )
  )
);

commit;
