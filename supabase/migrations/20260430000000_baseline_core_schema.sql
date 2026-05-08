-- Baseline public schema for a blank Carer Vista Pro Supabase project.
-- This migration creates only structure, helper functions, views, and RLS.
-- It intentionally does not insert private, family, demo, test, schedule,
-- message, medication, Wi-Fi, incident, or client seed data.

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid null references public.organizations(id) on delete set null,
  full_name text not null default '',
  email text not null default '',
  phone text null,
  role text not null default 'caregiver',
  language text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('admin', 'client', 'caregiver', 'family')),
  constraint profiles_language_check
    check (language is null or language in ('en', 'es'))
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  address text null,
  latitude double precision null,
  longitude double precision null,
  geofence_radius_meters integer not null default 150,
  timezone text null,
  wifi_ssid text null,
  wifi_password text null,
  emergency_contact_1_name text null,
  emergency_contact_1_phone text null,
  emergency_contact_1_relationship text null,
  emergency_contact_2_name text null,
  emergency_contact_2_phone text null,
  emergency_contact_2_relationship text null,
  home_notes text null,
  preferred_hospital_name text null,
  preferred_hospital_address text null,
  preferred_hospital_phone text null,
  primary_physician_name text null,
  primary_physician_address text null,
  primary_physician_phone text null,
  has_panic_button boolean not null default false,
  panic_button_location text null,
  has_medical_alert boolean not null default false,
  medical_alert_location text null,
  first_aid_location text null,
  hypoglycemia_kit_location text null,
  fire_extinguisher_location text null,
  aed_location text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_geofence_radius_check
    check (geofence_radius_meters > 0)
);

create table if not exists public.client_allergies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  severity text not null default 'mild',
  notes text null,
  created_at timestamptz not null default now(),
  constraint client_allergies_severity_check
    check (severity in ('critical', 'mild', 'minor'))
);

create table if not exists public.shift_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null default '#0D6587',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid null references public.clients(id) on delete set null,
  caregiver_id uuid null references public.profiles(id) on delete set null,
  shift_type_id uuid null references public.shift_types(id) on delete set null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  assignment_status text null,
  notes text null,
  bonus_amount numeric(10,2) not null default 0,
  bonus_reason text null,
  created_by uuid null references public.profiles(id) on delete set null,
  is_released boolean not null default false,
  released_by uuid null references public.profiles(id) on delete set null,
  release_reason text null,
  released_at timestamptz null,
  first_viewed_at timestamptz null,
  handoff_note text null,
  handoff_note_at timestamptz null,
  pay_override_amount numeric(10,2) null,
  pay_override_hours numeric(10,2) null,
  pay_override_rate numeric(10,2) null,
  pay_override_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_check check (scheduled_end > scheduled_start),
  constraint shifts_assignment_status_check
    check (assignment_status is null or assignment_status in ('pending', 'accepted', 'declined'))
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  check_in_time timestamptz null,
  check_in_latitude double precision null,
  check_in_longitude double precision null,
  check_in_within_geofence boolean null,
  check_out_time timestamptz null,
  check_out_latitude double precision null,
  check_out_longitude double precision null,
  check_out_within_geofence boolean null,
  check_out_method text null,
  check_out_by uuid null references public.profiles(id) on delete set null,
  check_out_reason text null,
  total_minutes integer null,
  flagged_outside_geofence boolean not null default false,
  flag_reason text null,
  last_location_at timestamptz null,
  last_location_latitude double precision null,
  last_location_longitude double precision null,
  last_location_accuracy_meters numeric null,
  last_location_distance_meters numeric null,
  last_location_within_geofence boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todo_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caregiver_id uuid null references public.profiles(id) on delete set null,
  task_name text not null,
  description text null,
  default_for_new_shifts boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shift_todos (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  template_id uuid null references public.todo_templates(id) on delete set null,
  task_name text not null,
  description text null,
  is_completed boolean not null default false,
  completed_at timestamptz null,
  completed_by uuid null references public.profiles(id) on delete set null,
  notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'general',
  title text not null,
  body text null,
  link text null,
  related_shift_id uuid null references public.shifts(id) on delete cascade,
  is_read boolean not null default false,
  dismissed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null,
  token text not null default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending',
  invited_by uuid null references public.profiles(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  accepted_by uuid null references public.profiles(id) on delete set null,
  accepted_at timestamptz null,
  caregiver_hourly_rate numeric(10,2) null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token),
  constraint invitations_role_check
    check (role in ('admin', 'client', 'caregiver', 'family')),
  constraint invitations_status_check
    check (status in ('pending', 'accepted', 'expired', 'revoked'))
);

create table if not exists public.caregiver_rates (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  base_hourly_rate numeric(10,2) not null default 0,
  effective_from date not null,
  effective_to date null,
  created_at timestamptz not null default now(),
  constraint caregiver_rates_effective_check
    check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.recurring_shift_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  caregiver_id uuid null references public.profiles(id) on delete set null,
  shift_type_id uuid null references public.shift_types(id) on delete set null,
  days_of_week integer[] not null default '{}',
  start_time time not null,
  end_time time not null,
  start_date date not null,
  end_date date null,
  repeat_frequency text not null default 'weekly',
  is_active boolean not null default true,
  is_paused boolean not null default false,
  last_generated_through date null,
  notes text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_shift_templates_frequency_check
    check (repeat_frequency in ('daily', 'weekly')),
  constraint recurring_shift_templates_time_check
    check (end_time > start_time)
);

create table if not exists public.pay_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  is_locked boolean not null default false,
  released_at timestamptz null,
  total_amount numeric(12,2) not null default 0,
  total_hours numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end)
);

create table if not exists public.pay_period_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pay_period_id uuid not null references public.pay_periods(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  total_hours numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  shift_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (pay_period_id, caregiver_id)
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references public.organizations(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  pay_multiplier numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  unique (organization_id, holiday_date)
);

create table if not exists public.shift_location_pings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  check_in_id uuid null references public.check_ins(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters numeric null,
  distance_meters numeric null,
  within_geofence boolean null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'client', false)
$$;

create or replace function public.is_caregiver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'caregiver', false)
$$;

create or replace function public.is_family()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'family', false)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_unsafe_self_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() and old.organization_id is not null then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'Users cannot change their own organization.';
    end if;

    if new.role is distinct from old.role then
      raise exception 'Users cannot change their own role.';
    end if;

    if new.is_active is distinct from old.is_active then
      raise exception 'Users cannot change their own active status.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_check_in_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_org_id uuid;
begin
  select s.organization_id
  into shift_org_id
  from public.shifts s
  where s.id = new.shift_id;

  if shift_org_id is null then
    raise exception 'shift_id % does not reference an existing shift', new.shift_id;
  end if;

  if new.organization_id is not null and new.organization_id <> shift_org_id then
    raise exception 'check-in organization_id must match the related shift';
  end if;

  new.organization_id := shift_org_id;
  return new;
end;
$$;

drop trigger if exists prevent_unsafe_self_profile_update on public.profiles;
create trigger prevent_unsafe_self_profile_update
before update on public.profiles
for each row
execute function public.prevent_unsafe_self_profile_update();

drop trigger if exists check_ins_set_organization_id on public.check_ins;
create trigger check_ins_set_organization_id
before insert or update on public.check_ins
for each row
execute function public.set_check_in_organization_id();

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations',
    'profiles',
    'clients',
    'shift_types',
    'shifts',
    'check_ins',
    'todo_templates',
    'shift_todos',
    'invitations',
    'recurring_shift_templates',
    'pay_periods'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t,
      t
    );
  end loop;
end $$;

create index if not exists profiles_org_role_idx on public.profiles (organization_id, role, is_active);
create index if not exists clients_org_name_idx on public.clients (organization_id, full_name);
create index if not exists shifts_org_start_idx on public.shifts (organization_id, scheduled_start);
create index if not exists shifts_caregiver_start_idx on public.shifts (caregiver_id, scheduled_start);
create index if not exists shifts_client_start_idx on public.shifts (client_id, scheduled_start);
create index if not exists check_ins_org_idx on public.check_ins (organization_id);
create unique index if not exists check_ins_shift_key on public.check_ins (shift_id);
create index if not exists check_ins_shift_idx on public.check_ins (shift_id);
create index if not exists check_ins_caregiver_idx on public.check_ins (caregiver_id, check_in_time desc);
create index if not exists shift_todos_shift_sort_idx on public.shift_todos (shift_id, sort_order);
create index if not exists messages_participants_idx on public.messages (organization_id, sender_id, recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id, is_read, created_at desc);
create index if not exists invitations_org_status_idx on public.invitations (organization_id, status, created_at desc);
create index if not exists caregiver_rates_lookup_idx on public.caregiver_rates (caregiver_id, effective_from desc);
create index if not exists recurring_shift_templates_org_active_idx on public.recurring_shift_templates (organization_id, is_active, is_paused);
create index if not exists pay_periods_org_period_idx on public.pay_periods (organization_id, period_start desc);
create index if not exists pay_period_snapshots_caregiver_idx on public.pay_period_snapshots (caregiver_id, created_at desc);
create index if not exists shift_location_pings_check_in_recorded_idx on public.shift_location_pings (check_in_id, recorded_at desc);
create index if not exists holidays_lookup_idx on public.holidays (holiday_date, organization_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_allergies enable row level security;
alter table public.shift_types enable row level security;
alter table public.shifts enable row level security;
alter table public.check_ins enable row level security;
alter table public.todo_templates enable row level security;
alter table public.shift_todos enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;
alter table public.caregiver_rates enable row level security;
alter table public.recurring_shift_templates enable row level security;
alter table public.pay_periods enable row level security;
alter table public.pay_period_snapshots enable row level security;
alter table public.holidays enable row level security;
alter table public.shift_location_pings enable row level security;

drop policy if exists "org members view organizations" on public.organizations;
create policy "org members view organizations"
on public.organizations
for select
to authenticated
using (
  id = public.current_org_id()
);

drop policy if exists "admins update organizations" on public.organizations;
create policy "admins update organizations"
on public.organizations
for update
to authenticated
using (id = public.current_org_id() and public.is_admin())
with check (id = public.current_org_id() and public.is_admin());

drop policy if exists "org members view profiles" on public.profiles;
create policy "org members view profiles"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (organization_id = public.current_org_id() and public.current_org_id() is not null)
);

drop policy if exists "users update own profile basics" on public.profiles;
create policy "users update own profile basics"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "admins manage profiles in org" on public.profiles;
create policy "admins manage profiles in org"
on public.profiles
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "org members view clients" on public.clients;
create policy "org members view clients"
on public.clients
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "admins clients manage clients" on public.clients;
create policy "admins clients manage clients"
on public.clients
for all
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()))
with check (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "org members view client allergies" on public.client_allergies;
create policy "org members view client allergies"
on public.client_allergies
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "admins clients manage client allergies" on public.client_allergies;
create policy "admins clients manage client allergies"
on public.client_allergies
for all
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()))
with check (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "org members view shift types" on public.shift_types;
create policy "org members view shift types"
on public.shift_types
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "admins manage shift types" on public.shift_types;
create policy "admins manage shift types"
on public.shift_types
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
    public.current_role() in ('admin', 'client', 'family')
    or caregiver_id = auth.uid()
    or caregiver_id is null
    or is_released = true
  )
);

drop policy if exists "admins clients manage shifts" on public.shifts;
create policy "admins clients manage shifts"
on public.shifts
for all
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()))
with check (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "caregivers update own shifts" on public.shifts;
create policy "caregivers update own shifts"
on public.shifts
for update
to authenticated
using (organization_id = public.current_org_id() and caregiver_id = auth.uid())
with check (organization_id = public.current_org_id());

drop policy if exists "org users view permitted check ins" on public.check_ins;
create policy "org users view permitted check ins"
on public.check_ins
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (public.current_role() in ('admin', 'client', 'family') or caregiver_id = auth.uid())
);

drop policy if exists "caregivers manage own check ins" on public.check_ins;
create policy "caregivers manage own check ins"
on public.check_ins
for all
to authenticated
using (organization_id = public.current_org_id() and caregiver_id = auth.uid())
with check (organization_id = public.current_org_id() and caregiver_id = auth.uid());

drop policy if exists "admins clients manage check ins" on public.check_ins;
create policy "admins clients manage check ins"
on public.check_ins
for all
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()))
with check (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "org members view todo templates" on public.todo_templates;
create policy "org members view todo templates"
on public.todo_templates
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "admins clients manage todo templates" on public.todo_templates;
create policy "admins clients manage todo templates"
on public.todo_templates
for all
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()))
with check (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

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
  )
);

drop policy if exists "assigned caregivers update shift todos" on public.shift_todos;
create policy "assigned caregivers update shift todos"
on public.shift_todos
for update
to authenticated
using (
  exists (
    select 1 from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and s.caregiver_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and s.caregiver_id = auth.uid()
  )
);

drop policy if exists "admins clients manage shift todos" on public.shift_todos;
create policy "admins clients manage shift todos"
on public.shift_todos
for all
to authenticated
using (
  exists (
    select 1 from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and (public.is_admin() or public.is_client())
  )
)
with check (
  exists (
    select 1 from public.shifts s
    where s.id = shift_todos.shift_id
      and s.organization_id = public.current_org_id()
      and (public.is_admin() or public.is_client())
  )
);

drop policy if exists "participants view messages" on public.messages;
create policy "participants view messages"
on public.messages
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "participants create messages" on public.messages;
create policy "participants create messages"
on public.messages
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and sender_id = auth.uid()
);

drop policy if exists "recipients update message read state" on public.messages;
create policy "recipients update message read state"
on public.messages
for update
to authenticated
using (organization_id = public.current_org_id() and recipient_id = auth.uid())
with check (organization_id = public.current_org_id() and recipient_id = auth.uid());

drop policy if exists "recipients view notifications" on public.notifications;
create policy "recipients view notifications"
on public.notifications
for select
to authenticated
using (organization_id = public.current_org_id() and recipient_id = auth.uid());

drop policy if exists "recipients update notifications" on public.notifications;
create policy "recipients update notifications"
on public.notifications
for update
to authenticated
using (organization_id = public.current_org_id() and recipient_id = auth.uid())
with check (organization_id = public.current_org_id() and recipient_id = auth.uid());

drop policy if exists "admins view invitations" on public.invitations;
create policy "admins view invitations"
on public.invitations
for select
to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "admins manage invitations" on public.invitations;
create policy "admins manage invitations"
on public.invitations
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "caregivers view own rates" on public.caregiver_rates;
create policy "caregivers view own rates"
on public.caregiver_rates
for select
to authenticated
using (
  caregiver_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = caregiver_rates.caregiver_id
      and p.organization_id = public.current_org_id()
      and (public.is_admin() or public.is_client())
  )
);

drop policy if exists "admins manage caregiver rates" on public.caregiver_rates;
create policy "admins manage caregiver rates"
on public.caregiver_rates
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = caregiver_rates.caregiver_id
      and p.organization_id = public.current_org_id()
      and public.is_admin()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = caregiver_rates.caregiver_id
      and p.organization_id = public.current_org_id()
      and public.is_admin()
  )
);

drop policy if exists "org members view recurring templates" on public.recurring_shift_templates;
create policy "org members view recurring templates"
on public.recurring_shift_templates
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "admins clients manage recurring templates" on public.recurring_shift_templates;
create policy "admins clients manage recurring templates"
on public.recurring_shift_templates
for all
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()))
with check (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "admins clients view pay periods" on public.pay_periods;
create policy "admins clients view pay periods"
on public.pay_periods
for select
to authenticated
using (organization_id = public.current_org_id() and (public.is_admin() or public.is_client()));

drop policy if exists "view pay period snapshots" on public.pay_period_snapshots;
create policy "view pay period snapshots"
on public.pay_period_snapshots
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (caregiver_id = auth.uid() or public.is_admin() or public.is_client())
);

drop policy if exists "org members view holidays" on public.holidays;
create policy "org members view holidays"
on public.holidays
for select
to authenticated
using (organization_id is null or organization_id = public.current_org_id());

drop policy if exists "admins manage holidays" on public.holidays;
create policy "admins manage holidays"
on public.holidays
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "caregivers create own location pings" on public.shift_location_pings;
create policy "caregivers create own location pings"
on public.shift_location_pings
for insert
to authenticated
with check (organization_id = public.current_org_id() and caregiver_id = auth.uid());

drop policy if exists "permitted users view location pings" on public.shift_location_pings;
create policy "permitted users view location pings"
on public.shift_location_pings
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (caregiver_id = auth.uid() or public.is_admin() or public.is_client())
);

create or replace function public.get_invitation_by_token(invitation_token text)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  organization_id uuid,
  caregiver_hourly_rate numeric,
  status text,
  expires_at timestamptz,
  accepted_at timestamptz,
  organization_name text
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.email,
    i.full_name,
    i.role,
    i.organization_id,
    i.caregiver_hourly_rate,
    i.status,
    i.expires_at,
    i.accepted_at,
    o.name as organization_name
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = invitation_token
  limit 1
$$;

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
    raise exception 'Unauthorized';
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
    is_active
  )
  values (
    v_user_id,
    inv.organization_id,
    inv.full_name,
    coalesce(v_email, inv.email),
    invited_phone,
    inv.role,
    true
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role,
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

create or replace function public.claim_open_shift(p_shift_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.current_org_id();
begin
  if auth.uid() is null or public.current_role() <> 'caregiver' then
    raise exception 'Caregiver access required';
  end if;

  update public.shifts
  set caregiver_id = auth.uid(),
      assignment_status = 'accepted',
      is_released = false,
      released_by = null,
      released_at = null,
      release_reason = null,
      updated_at = now()
  where id = p_shift_id
    and organization_id = v_org_id
    and scheduled_end > now()
    and (
      caregiver_id is null
      or is_released = true
    )
    and coalesce(released_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid();

  return found;
end;
$$;

create or replace function public.mark_shift_viewed(p_shift_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shifts
  set first_viewed_at = coalesce(first_viewed_at, now()),
      updated_at = now()
  where id = p_shift_id
    and caregiver_id = auth.uid()
    and organization_id = public.current_org_id();

  return found;
end;
$$;

create or replace function public.generate_recurring_shifts(p_template_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tmpl record;
  d date;
  v_start timestamptz;
  v_end timestamptz;
  v_count integer := 0;
  v_until date := current_date + interval '42 days';
begin
  if auth.uid() is null or not (public.is_admin() or public.is_client()) then
    raise exception 'Admin or client access required';
  end if;

  for tmpl in
    select *
    from public.recurring_shift_templates
    where organization_id = public.current_org_id()
      and is_active = true
      and is_paused = false
      and (p_template_id is null or id = p_template_id)
  loop
    d := greatest(tmpl.start_date, coalesce(tmpl.last_generated_through + 1, tmpl.start_date));

    while d <= least(coalesce(tmpl.end_date, v_until), v_until) loop
      if extract(dow from d)::int = any(tmpl.days_of_week) then
        v_start := (d::text || ' ' || tmpl.start_time::text)::timestamp at time zone 'America/New_York';
        v_end := (d::text || ' ' || tmpl.end_time::text)::timestamp at time zone 'America/New_York';

        if not exists (
          select 1
          from public.shifts s
          where s.organization_id = tmpl.organization_id
            and s.client_id = tmpl.client_id
            and s.scheduled_start = v_start
            and s.scheduled_end = v_end
            and coalesce(s.caregiver_id, '00000000-0000-0000-0000-000000000000'::uuid)
              = coalesce(tmpl.caregiver_id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) then
          insert into public.shifts (
            organization_id,
            client_id,
            caregiver_id,
            shift_type_id,
            assignment_status,
            scheduled_start,
            scheduled_end,
            notes,
            created_by
          )
          values (
            tmpl.organization_id,
            tmpl.client_id,
            tmpl.caregiver_id,
            tmpl.shift_type_id,
            case when tmpl.caregiver_id is null then null else 'pending' end,
            v_start,
            v_end,
            tmpl.notes,
            auth.uid()
          );
          v_count := v_count + 1;
        end if;
      end if;

      d := d + 1;
    end loop;

    update public.recurring_shift_templates
    set last_generated_through = least(coalesce(tmpl.end_date, v_until), v_until),
        updated_at = now()
    where id = tmpl.id;
  end loop;

  return v_count;
end;
$$;

drop view if exists public.currently_on_shift;
create view public.currently_on_shift
with (security_invoker = true)
as
select
  s.id as shift_id,
  s.organization_id,
  p.full_name as caregiver_name,
  c.full_name as client_name,
  ci.check_in_time,
  s.scheduled_end,
  (now() > s.scheduled_end) as past_scheduled_end,
  ci.flagged_outside_geofence,
  st.color as shift_type_color
from public.check_ins ci
join public.shifts s on s.id = ci.shift_id
left join public.profiles p on p.id = ci.caregiver_id
left join public.clients c on c.id = s.client_id
left join public.shift_types st on st.id = s.shift_type_id
where ci.check_in_time is not null
  and ci.check_out_time is null;

drop view if exists public.shift_pay_details;
create view public.shift_pay_details
with (security_invoker = true)
as
select
  s.id as shift_id,
  s.organization_id,
  s.caregiver_id,
  s.client_id,
  s.scheduled_start,
  s.scheduled_end,
  ci.check_in_time,
  ci.check_out_time,
  ci.total_minutes,
  case
    when s.pay_override_hours is not null then s.pay_override_hours
    when ci.total_minutes is not null then round((ci.total_minutes::numeric / 60.0), 2)
    when ci.check_in_time is not null and ci.check_out_time is not null
      then round((extract(epoch from (ci.check_out_time - ci.check_in_time)) / 3600.0)::numeric, 2)
    else null
  end as hours_worked,
  coalesce(s.pay_override_rate, cr.base_hourly_rate, 0) as hourly_rate,
  s.bonus_amount,
  s.pay_override_amount,
  case
    when s.pay_override_amount is not null then s.pay_override_amount
    when ci.check_in_time is null then null
    else (
      coalesce(
        s.pay_override_hours,
        case
          when ci.total_minutes is not null then ci.total_minutes::numeric / 60.0
          when ci.check_out_time is not null then extract(epoch from (ci.check_out_time - ci.check_in_time)) / 3600.0
          else 0
        end
      )
      * coalesce(s.pay_override_rate, cr.base_hourly_rate, 0)
      * coalesce(h.pay_multiplier, 1)
      + coalesce(s.bonus_amount, 0)
    )::numeric
  end as total_pay
from public.shifts s
left join lateral (
  select *
  from public.check_ins ci
  where ci.shift_id = s.id
  order by ci.check_in_time desc nulls last, ci.created_at desc
  limit 1
) ci on true
left join lateral (
  select r.base_hourly_rate
  from public.caregiver_rates r
  where r.caregiver_id = s.caregiver_id
    and r.effective_from <= s.scheduled_start::date
    and (r.effective_to is null or r.effective_to >= s.scheduled_start::date)
  order by r.effective_from desc
  limit 1
) cr on true
left join public.holidays h
  on h.holiday_date = s.scheduled_start::date
 and (h.organization_id = s.organization_id or h.organization_id is null);

grant execute on function public.get_invitation_by_token(text) to anon, authenticated;
grant execute on function public.accept_invitation(text, text) to authenticated;
grant execute on function public.claim_open_shift(uuid) to authenticated;
grant execute on function public.mark_shift_viewed(uuid) to authenticated;
grant execute on function public.generate_recurring_shifts(uuid) to authenticated;

commit;
