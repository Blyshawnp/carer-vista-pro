begin;

alter table public.clients
  add column if not exists show_medications_to_caregivers boolean not null default false,
  add column if not exists show_allergies_to_caregivers boolean not null default true;

alter table public.client_allergies
  add column if not exists reaction text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.client_allergies
  alter column severity drop not null,
  alter column severity drop default;

alter table public.client_allergies
  drop constraint if exists client_allergies_severity_check;

alter table public.client_allergies
  add constraint client_allergies_severity_check
  check (severity is null or severity in ('critical', 'mild', 'minor'));

create table if not exists public.client_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  relationship text not null,
  phone text not null,
  alternate_phone text,
  email text,
  notes text,
  priority_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_emergency_contacts_priority_order_check
    check (priority_order between 1 and 5)
);

create table if not exists public.client_medications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  medication_name text not null,
  dose text,
  schedule_instructions text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_safety_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  value_location text not null,
  notes text,
  visible_to_caregivers boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_emergency_contacts_client_order_idx
  on public.client_emergency_contacts (client_id, priority_order);

create index if not exists client_medications_client_order_idx
  on public.client_medications (client_id, sort_order);

create index if not exists client_allergies_client_order_idx
  on public.client_allergies (client_id, sort_order);

create index if not exists client_safety_items_client_order_idx
  on public.client_safety_items (client_id, sort_order);

drop trigger if exists set_client_emergency_contacts_updated_at on public.client_emergency_contacts;
create trigger set_client_emergency_contacts_updated_at
before update on public.client_emergency_contacts
for each row execute function public.touch_updated_at();

drop trigger if exists set_client_medications_updated_at on public.client_medications;
create trigger set_client_medications_updated_at
before update on public.client_medications
for each row execute function public.touch_updated_at();

drop trigger if exists set_client_allergies_updated_at on public.client_allergies;
create trigger set_client_allergies_updated_at
before update on public.client_allergies
for each row execute function public.touch_updated_at();

drop trigger if exists set_client_safety_items_updated_at on public.client_safety_items;
create trigger set_client_safety_items_updated_at
before update on public.client_safety_items
for each row execute function public.touch_updated_at();

create or replace function public.enforce_client_emergency_contact_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.client_emergency_contacts c
    where c.client_id = new.client_id
      and c.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 5 then
    raise exception 'A client can have at most 5 emergency contacts.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_client_emergency_contact_limit on public.client_emergency_contacts;
create trigger enforce_client_emergency_contact_limit
before insert or update on public.client_emergency_contacts
for each row execute function public.enforce_client_emergency_contact_limit();

create or replace function public.seed_client_home_info_from_legacy_columns()
returns trigger
language plpgsql
as $$
begin
  if nullif(trim(new.emergency_contact_1_phone), '') is not null then
    insert into public.client_emergency_contacts (
      organization_id,
      client_id,
      name,
      relationship,
      phone,
      priority_order
    )
    values (
      new.organization_id,
      new.id,
      coalesce(nullif(trim(new.emergency_contact_1_name), ''), 'Emergency contact'),
      coalesce(nullif(trim(new.emergency_contact_1_relationship), ''), 'Contact'),
      new.emergency_contact_1_phone,
      1
    )
    on conflict do nothing;
  end if;

  if nullif(trim(new.emergency_contact_2_phone), '') is not null then
    insert into public.client_emergency_contacts (
      organization_id,
      client_id,
      name,
      relationship,
      phone,
      priority_order
    )
    values (
      new.organization_id,
      new.id,
      coalesce(nullif(trim(new.emergency_contact_2_name), ''), 'Emergency contact'),
      coalesce(nullif(trim(new.emergency_contact_2_relationship), ''), 'Contact'),
      new.emergency_contact_2_phone,
      2
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists seed_client_home_info_from_legacy_columns on public.clients;
create trigger seed_client_home_info_from_legacy_columns
after insert on public.clients
for each row execute function public.seed_client_home_info_from_legacy_columns();

insert into public.client_emergency_contacts (
  organization_id,
  client_id,
  name,
  relationship,
  phone,
  priority_order
)
select
  c.organization_id,
  c.id,
  coalesce(nullif(trim(c.emergency_contact_1_name), ''), 'Emergency contact'),
  coalesce(nullif(trim(c.emergency_contact_1_relationship), ''), 'Contact'),
  c.emergency_contact_1_phone,
  1
from public.clients c
where nullif(trim(c.emergency_contact_1_phone), '') is not null
  and not exists (
    select 1
    from public.client_emergency_contacts ec
    where ec.client_id = c.id
      and ec.priority_order = 1
  );

insert into public.client_emergency_contacts (
  organization_id,
  client_id,
  name,
  relationship,
  phone,
  priority_order
)
select
  c.organization_id,
  c.id,
  coalesce(nullif(trim(c.emergency_contact_2_name), ''), 'Emergency contact'),
  coalesce(nullif(trim(c.emergency_contact_2_relationship), ''), 'Contact'),
  c.emergency_contact_2_phone,
  2
from public.clients c
where nullif(trim(c.emergency_contact_2_phone), '') is not null
  and not exists (
    select 1
    from public.client_emergency_contacts ec
    where ec.client_id = c.id
      and ec.priority_order = 2
  );

insert into public.client_safety_items (
  organization_id,
  client_id,
  label,
  value_location,
  visible_to_caregivers,
  sort_order
)
select c.organization_id, c.id, seed.label, seed.value_location, true, seed.sort_order
from public.clients c
cross join lateral (
  values
    ('Panic button', c.panic_button_location, 10, c.has_panic_button),
    ('Medical alert button', c.medical_alert_location, 20, c.has_medical_alert),
    ('First aid kit', c.first_aid_location, 30, true),
    ('Glucagon kit', c.hypoglycemia_kit_location, 40, true),
    ('Fire extinguisher location', c.fire_extinguisher_location, 50, true),
    ('AED location', c.aed_location, 60, true)
) as seed(label, value_location, sort_order, enabled)
where seed.enabled = true
  and nullif(trim(seed.value_location), '') is not null
  and not exists (
    select 1
    from public.client_safety_items si
    where si.client_id = c.id
      and lower(si.label) = lower(seed.label)
  );

alter table public.client_emergency_contacts enable row level security;
alter table public.client_medications enable row level security;
alter table public.client_safety_items enable row level security;

drop policy if exists "org members view client allergies" on public.client_allergies;
drop policy if exists "assigned users view visible client allergies" on public.client_allergies;
create policy "assigned users view visible client allergies"
on public.client_allergies
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
      where a.client_id = client_allergies.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and (
          public.current_role() <> 'caregiver'
          or c.show_allergies_to_caregivers = true
        )
    )
  )
);

drop policy if exists "admins clients manage client allergies" on public.client_allergies;
create policy "admins clients manage client allergies"
on public.client_allergies
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

drop policy if exists "assigned users view client emergency contacts" on public.client_emergency_contacts;
create policy "assigned users view client emergency contacts"
on public.client_emergency_contacts
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1
      from public.client_user_assignments a
      where a.client_id = client_emergency_contacts.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

drop policy if exists "admins clients manage client emergency contacts" on public.client_emergency_contacts;
create policy "admins clients manage client emergency contacts"
on public.client_emergency_contacts
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

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
        and (
          public.current_role() <> 'caregiver'
          or c.show_medications_to_caregivers = true
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

drop policy if exists "assigned users view visible client safety items" on public.client_safety_items;
create policy "assigned users view visible client safety items"
on public.client_safety_items
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1
      from public.client_user_assignments a
      where a.client_id = client_safety_items.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and (
          public.current_role() <> 'caregiver'
          or client_safety_items.visible_to_caregivers = true
        )
    )
  )
);

drop policy if exists "admins clients manage client safety items" on public.client_safety_items;
create policy "admins clients manage client safety items"
on public.client_safety_items
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

drop policy if exists "admins manage clients" on public.clients;
drop policy if exists "admins clients manage clients" on public.clients;
create policy "admins clients manage clients"
on public.clients
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

drop policy if exists "admins manage shift types" on public.shift_types;
drop policy if exists "admins clients manage shift types" on public.shift_types;
create policy "admins clients manage shift types"
on public.shift_types
for all
to authenticated
using (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'))
with check (organization_id = public.current_org_id() and public.current_role() in ('admin', 'client'));

create or replace function public.seed_organization_public_app_defaults(p_organization_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.shift_types (organization_id, name, color)
  values
    (p_organization_id, 'Morning', '#0D6587'),
    (p_organization_id, 'Afternoon', '#B75F45'),
    (p_organization_id, 'Evening', '#4F6F52'),
    (p_organization_id, 'Overnight', '#374151'),
    (p_organization_id, 'Full Day', '#7C6F57'),
    (p_organization_id, 'Custom', '#8A6BBE')
  on conflict (organization_id, name) do nothing;

  insert into public.task_categories (organization_id, key, label, sort_order)
  values
    (p_organization_id, 'meals', 'Meals', 10),
    (p_organization_id, 'medication_reminder', 'Medication reminder', 20),
    (p_organization_id, 'mobility', 'Mobility', 30),
    (p_organization_id, 'hygiene_adls', 'Hygiene/ADLs', 40),
    (p_organization_id, 'light_housekeeping', 'Light housekeeping', 50),
    (p_organization_id, 'companionship', 'Companionship', 60),
    (p_organization_id, 'safety_check', 'Safety check', 70),
    (p_organization_id, 'next_caregiver_notes', 'Notes for next caregiver', 80)
  on conflict (organization_id, key) do update
    set label = excluded.label;

  insert into public.todo_templates (
    organization_id,
    task_name,
    description,
    default_for_new_shifts,
    is_active,
    sort_order,
    category
  )
  select
    p_organization_id,
    seed.task_name,
    seed.description,
    true,
    true,
    seed.sort_order,
    seed.category
  from (
    values
      ('Meal support', 'Prepare, serve, or clean up meals as requested.', 10, 'meals'),
      ('Medication reminder', 'Remind the client about their routine medication schedule if requested.', 20, 'medication_reminder'),
      ('Mobility support', 'Assist with safe movement according to the care plan.', 30, 'mobility'),
      ('Hygiene/ADLs', 'Support personal care routines as requested.', 40, 'hygiene_adls'),
      ('Light housekeeping', 'Tidy shared areas used during the shift.', 50, 'light_housekeeping'),
      ('Companionship', 'Spend time with the client and support preferred activities.', 60, 'companionship'),
      ('Safety check', 'Check that the home environment is safe before leaving.', 70, 'safety_check'),
      ('Notes for next caregiver', 'Leave non-urgent handoff notes for the next caregiver.', 80, 'next_caregiver_notes')
  ) as seed(task_name, description, sort_order, category)
  where not exists (
    select 1
    from public.todo_templates t
    where t.organization_id = p_organization_id
      and lower(t.task_name) = lower(seed.task_name)
  );
end;
$$;

create or replace function public.seed_organization_public_app_defaults_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.seed_organization_public_app_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists seed_organization_public_app_defaults on public.organizations;
create trigger seed_organization_public_app_defaults
after insert on public.organizations
for each row execute function public.seed_organization_public_app_defaults_trigger();

select public.seed_organization_public_app_defaults(o.id)
from public.organizations o;

grant select, insert, update, delete on public.client_emergency_contacts to authenticated;
grant select, insert, update, delete on public.client_medications to authenticated;
grant select, insert, update, delete on public.client_safety_items to authenticated;

notify pgrst, 'reload schema';

commit;
