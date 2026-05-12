-- Helper used by incident reporting policies for organization owners.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.organizations o
      on o.id = p.organization_id
    where p.id = auth.uid()
      and (
        coalesce(p.is_owner, false) = true
        or o.owner_id = auth.uid()
      )
  );
$$;

grant execute on function public.is_owner() to authenticated;

-- Create incident_reports table
create table if not exists public.incident_reports (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    shift_id uuid null references public.shifts(id) on delete set null,
    client_id uuid null references public.clients(id) on delete set null,
    reported_by uuid not null references public.profiles(id) on delete cascade,
    category text not null,
    description text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS Policies
-- Caregiver can insert only if current shift OR assigned client
drop policy if exists "caregiver insert incidents" on public.incident_reports;
create policy "caregiver insert incidents"
  on public.incident_reports
  for insert
  to authenticated
  with check (
    reported_by = auth.uid() and (
      shift_id in (select id from public.shifts where caregiver_id = auth.uid())
      or client_id in (select client_id from public.client_user_assignments where user_id = auth.uid() and relationship_role='caregiver')
    )
  );

-- Family can view only assigned clients
drop policy if exists "family view incidents" on public.incident_reports;
create policy "family view incidents"
  on public.incident_reports
  for select
  to authenticated
  using (
    client_id in (select client_id from public.client_user_assignments where user_id = auth.uid() and is_active=true)
    or public.is_admin()
  );

-- Admin full access
drop policy if exists "admin full access incidents" on public.incident_reports;
create policy "admin full access incidents"
  on public.incident_reports
  for all
  to authenticated
  using (public.is_admin() or public.is_owner())
  with check (public.is_admin() or public.is_owner());
