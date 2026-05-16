-- Repair medication visibility so assigned caregivers can read medication
-- details only when the client/admin toggle allows it. Official medication
-- rows remain writable only by organization admins/client-family admins.

alter table public.clients
  add column if not exists show_medications_to_caregivers boolean not null default false;

alter table public.client_medications enable row level security;
alter table public.client_medication_reminders enable row level security;

create index if not exists client_user_assignments_client_user_active_idx
  on public.client_user_assignments (client_id, user_id, is_active);

drop policy if exists "assigned users view visible client medications" on public.client_medications;
create policy "assigned users view visible client medications"
on public.client_medications
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1
      from public.client_user_assignments a
      join public.clients c on c.id = a.client_id
      where a.client_id = client_medications.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and a.organization_id = public.current_org_id()
        and (
          a.role = 'client-like'
          or (
            public.current_role() = 'caregiver'
            and c.show_medications_to_caregivers = true
            and (
              a.role in ('caregiver', 'admin', 'viewer')
              or a.relationship_role in ('caregiver', 'admin', 'viewer')
            )
          )
        )
    )
  )
);

drop policy if exists "admins clients manage client medications" on public.client_medications;
create policy "admins clients manage client medications"
on public.client_medications
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

drop policy if exists "assigned users view visible medication reminders" on public.client_medication_reminders;
create policy "assigned users view visible medication reminders"
on public.client_medication_reminders
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and exists (
    select 1
    from public.client_medications m
    join public.clients c on c.id = m.client_id
    where m.id = client_medication_reminders.medication_id
      and m.client_id = client_medication_reminders.client_id
      and (
        public.current_role() in ('admin', 'client')
        or exists (
          select 1
          from public.client_user_assignments a
          where a.client_id = client_medication_reminders.client_id
            and a.user_id = auth.uid()
            and a.is_active = true
            and a.organization_id = public.current_org_id()
            and (
              a.role = 'client-like'
              or (
                public.current_role() = 'caregiver'
                and c.show_medications_to_caregivers = true
                and (
                  a.role in ('caregiver', 'admin', 'viewer')
                  or a.relationship_role in ('caregiver', 'admin', 'viewer')
                )
              )
            )
        )
      )
  )
);

drop policy if exists "admins clients manage medication reminders" on public.client_medication_reminders;
create policy "admins clients manage medication reminders"
on public.client_medication_reminders
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

grant select, insert, update, delete on public.client_medications to authenticated;
grant select, insert, update, delete on public.client_medication_reminders to authenticated;

notify pgrst, 'reload schema';
