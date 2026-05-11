begin;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid null references public.shifts(id) on delete set null,
  client_id uuid null references public.clients(id) on delete set null,
  reported_by uuid not null references public.profiles(id) on delete restrict,
  category text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint incident_reports_client_or_shift_check
    check (shift_id is not null or client_id is not null),
  constraint incident_reports_category_check
    check (char_length(btrim(category)) > 0),
  constraint incident_reports_description_check
    check (char_length(btrim(description)) > 0)
);

create index if not exists incident_reports_org_created_idx
  on public.incident_reports (organization_id, created_at desc);

create index if not exists incident_reports_client_created_idx
  on public.incident_reports (client_id, created_at desc);

create index if not exists incident_reports_shift_idx
  on public.incident_reports (shift_id);

create index if not exists incident_reports_reported_by_idx
  on public.incident_reports (reported_by, created_at desc);

alter table public.incident_reports enable row level security;

drop trigger if exists set_incident_reports_updated_at on public.incident_reports;
create trigger set_incident_reports_updated_at
before update on public.incident_reports
for each row
execute function public.touch_updated_at();

grant select, insert, update, delete on public.incident_reports to authenticated;

drop policy if exists "incident_reports org members can view accessible reports" on public.incident_reports;
create policy "incident_reports org members can view accessible reports"
on public.incident_reports
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or public.is_client()
    or exists (
      select 1
      from public.client_user_assignments a
      where a.client_id = incident_reports.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
    or exists (
      select 1
      from public.shifts s
      where s.id = incident_reports.shift_id
        and s.caregiver_id = auth.uid()
    )
  )
);

drop policy if exists "incident_reports caregivers can create scoped reports" on public.incident_reports;
create policy "incident_reports caregivers can create scoped reports"
on public.incident_reports
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and reported_by = auth.uid()
  and (
    public.is_admin()
    or public.is_client()
    or (
      shift_id is not null
      and exists (
        select 1
        from public.shifts s
        join public.check_ins c on c.shift_id = s.id
        where s.id = incident_reports.shift_id
          and s.organization_id = public.current_org_id()
          and s.caregiver_id = auth.uid()
          and c.check_in_time is not null
          and c.check_out_time is null
      )
    )
    or (
      shift_id is null
      and client_id is not null
      and exists (
        select 1
        from public.client_user_assignments a
        where a.client_id = incident_reports.client_id
          and a.user_id = auth.uid()
          and a.is_active = true
      )
    )
  )
);

drop policy if exists "incident_reports admins manage all reports" on public.incident_reports;
create policy "incident_reports admins manage all reports"
on public.incident_reports
for all
to authenticated
using (
  organization_id = public.current_org_id()
  and (public.is_admin() or public.is_client())
)
with check (
  organization_id = public.current_org_id()
  and (public.is_admin() or public.is_client())
);

commit;
