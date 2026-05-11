begin;

alter table public.clients
  add column if not exists street_address_1 text,
  add column if not exists street_address_2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'US',
  add column if not exists formatted_address text,
  add column if not exists location_set_at timestamptz,
  add column if not exists location_source text not null default 'unknown';

alter table public.clients
  alter column geofence_radius_meters set default 150;

update public.clients
set
  formatted_address = coalesce(
    nullif(trim(concat_ws(', ',
      nullif(trim(coalesce(street_address_1, '')), ''),
      nullif(trim(coalesce(street_address_2, '')), ''),
      nullif(trim(coalesce(city, '')), ''),
      nullif(trim(coalesce(state, '')), ''),
      nullif(trim(coalesce(postal_code, '')), ''),
      nullif(trim(coalesce(country, '')), '')
    )), ''),
    address
  ),
  address = coalesce(
    nullif(trim(concat_ws(', ',
      nullif(trim(coalesce(street_address_1, '')), ''),
      nullif(trim(coalesce(street_address_2, '')), ''),
      nullif(trim(coalesce(city, '')), ''),
      nullif(trim(coalesce(state, '')), ''),
      nullif(trim(coalesce(postal_code, '')), ''),
      nullif(trim(coalesce(country, '')), '')
    )), ''),
    address
  ),
  location_source = coalesce(location_source, 'unknown'),
  location_set_at = coalesce(location_set_at, now())
where formatted_address is null and address is not null;

create or replace function public.sync_client_location_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_formatted text;
  v_location_changed boolean;
begin
  v_formatted := nullif(trim(concat_ws(', ',
    nullif(trim(coalesce(new.street_address_1, '')), ''),
    nullif(trim(coalesce(new.street_address_2, '')), ''),
    nullif(trim(coalesce(new.city, '')), ''),
    nullif(trim(coalesce(new.state, '')), ''),
    nullif(trim(coalesce(new.postal_code, '')), ''),
    nullif(trim(coalesce(new.country, '')), '')
  )), '');

  if v_formatted is null then
    v_formatted := nullif(trim(coalesce(new.address, '')), '');
  end if;

  new.formatted_address := v_formatted;
  new.address := v_formatted;

  if new.country is null or trim(new.country) = '' then
    new.country := 'US';
  end if;

  if new.location_source is null or trim(new.location_source) = '' then
    new.location_source := 'unknown';
  end if;

  if tg_op = 'INSERT' then
    v_location_changed := true;
  else
    v_location_changed :=
      old.street_address_1 is distinct from new.street_address_1
      or old.street_address_2 is distinct from new.street_address_2
      or old.city is distinct from new.city
      or old.state is distinct from new.state
      or old.postal_code is distinct from new.postal_code
      or old.country is distinct from new.country
      or old.latitude is distinct from new.latitude
      or old.longitude is distinct from new.longitude
      or old.location_source is distinct from new.location_source;
  end if;

  if v_location_changed then
    if new.latitude is not null and new.longitude is not null then
      new.location_set_at := coalesce(new.location_set_at, now());
      if new.location_source = 'unknown' then
        new.location_source := 'manual';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_client_location_fields on public.clients;
create trigger sync_client_location_fields
before insert or update on public.clients
for each row execute function public.sync_client_location_fields();

alter table public.client_user_assignments
  add column if not exists role text not null default 'viewer';

alter table public.client_user_assignments
  drop constraint if exists client_user_assignments_role_check;

alter table public.client_user_assignments
  add constraint client_user_assignments_role_check
    check (role in ('caregiver', 'family', 'client', 'admin', 'viewer', 'client-like'));

update public.client_user_assignments
set role = case
  when role = 'client-like' then 'client-like'
  when relationship_role = 'family' then 'viewer'
  when relationship_role in ('caregiver', 'client', 'admin') then relationship_role
  else 'viewer'
end;

alter table public.client_user_assignments
  alter column role set default 'viewer';

create index if not exists client_user_assignments_role_idx
  on public.client_user_assignments (organization_id, role, is_active);

drop policy if exists "assigned users view client assignments" on public.client_user_assignments;
create policy "assigned users view client assignments"
on public.client_user_assignments
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and is_active = true
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

drop policy if exists "org users view permitted shifts" on public.shifts;
create policy "org users view permitted shifts"
on public.shifts
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or public.is_client()
    or caregiver_id = auth.uid()
    or exists (
      select 1
      from public.client_user_assignments a
      where a.client_id = shifts.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
    or caregiver_id is null
    or is_released = true
  )
);

drop policy if exists "org users view permitted check ins" on public.check_ins;
create policy "org users view permitted check ins"
on public.check_ins
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or public.is_client()
    or caregiver_id = auth.uid()
    or exists (
      select 1
      from public.shifts s
      join public.client_user_assignments a on a.client_id = s.client_id
      where s.id = check_ins.shift_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

drop policy if exists "org members view shift todos" on public.shift_todos;
create policy "org members view shift todos"
on public.shift_todos
for select
to authenticated
using (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and (
        public.is_admin()
        or public.is_client()
        or s.caregiver_id = auth.uid()
        or exists (
          select 1
          from public.client_user_assignments a
          where a.client_id = s.client_id
            and a.user_id = auth.uid()
            and a.is_active = true
        )
      )
  )
);

drop policy if exists "assigned caregivers update shift todos" on public.shift_todos;
create policy "assigned caregivers update shift todos"
on public.shift_todos
for update
to authenticated
using (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and (
        s.caregiver_id = auth.uid()
        or public.is_admin()
        or public.is_client()
        or exists (
          select 1
          from public.client_user_assignments a
          where a.client_id = s.client_id
            and a.user_id = auth.uid()
            and a.is_active = true
            and a.role = 'client-like'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and (
        s.caregiver_id = auth.uid()
        or public.is_admin()
        or public.is_client()
        or exists (
          select 1
          from public.client_user_assignments a
          where a.client_id = s.client_id
            and a.user_id = auth.uid()
            and a.is_active = true
            and a.role = 'client-like'
        )
      )
  )
);

drop policy if exists "org users view permitted incidents" on public.incidents;
create policy "org users view permitted incidents"
on public.incidents
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or public.is_client()
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

drop policy if exists "org members view todo templates" on public.todo_templates;
create policy "org members view todo templates"
on public.todo_templates
for select
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "assigned users view visible client allergies" on public.client_allergies;
create policy "assigned users view visible client allergies"
on public.client_allergies
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
      join public.clients c on c.id = a.client_id
      where a.client_id = client_allergies.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and (
          a.role = 'client-like'
          or (public.current_role() = 'caregiver' and c.show_allergies_to_caregivers = true)
        )
    )
  )
);

drop policy if exists "assigned users view visible client medications" on public.client_medications;
create policy "assigned users view visible client medications"
on public.client_medications
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
      join public.clients c on c.id = a.client_id
      where a.client_id = client_medications.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and (
          a.role = 'client-like'
          or (public.current_role() = 'caregiver' and c.show_medications_to_caregivers = true)
        )
    )
  )
);

drop policy if exists "assigned users view visible client safety items" on public.client_safety_items;
create policy "assigned users view visible client safety items"
on public.client_safety_items
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
      where a.client_id = client_safety_items.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and (
          a.role = 'client-like'
          or (public.current_role() = 'caregiver' and client_safety_items.visible_to_caregivers = true)
        )
    )
  )
);

drop policy if exists "org users view permitted clients" on public.clients;
create policy "org users view permitted clients"
on public.clients
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
      where a.client_id = clients.id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

notify pgrst, 'reload schema';

commit;
