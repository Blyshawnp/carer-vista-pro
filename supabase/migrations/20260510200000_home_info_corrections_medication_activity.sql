begin;

alter table public.client_medications
  add column if not exists reminder_frequency text not null default 'as_needed',
  add column if not exists remind_caregiver boolean not null default false,
  add column if not exists notify_client_family_when_marked boolean not null default false;

alter table public.client_medications
  drop constraint if exists client_medications_reminder_frequency_check;

alter table public.client_medications
  add constraint client_medications_reminder_frequency_check
    check (reminder_frequency in ('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'custom_times', 'as_needed'));

create table if not exists public.client_info_correction_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  message text not null,
  status text not null default 'pending',
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_info_correction_requests_category_check
    check (category in ('emergency_contact', 'medication', 'allergy', 'safety_item', 'address', 'home_note', 'other')),
  constraint client_info_correction_requests_status_check
    check (status in ('pending', 'reviewed', 'approved', 'rejected'))
);

create table if not exists public.client_medication_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  medication_id uuid not null references public.client_medications(id) on delete cascade,
  reminder_time time not null,
  label text null,
  days_of_week text[] null,
  is_active boolean not null default true,
  notify_caregiver boolean not null default true,
  notify_client_family boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_reminder_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  medication_id uuid not null references public.client_medications(id) on delete cascade,
  reminder_id uuid null references public.client_medication_reminders(id) on delete set null,
  shift_id uuid null references public.shifts(id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  marked_by uuid null references public.profiles(id) on delete set null,
  marked_at timestamptz null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medication_reminder_events_status_check
    check (status in ('pending', 'reminded', 'taken', 'skipped', 'refused', 'not_available', 'needs_follow_up'))
);

create index if not exists client_info_correction_requests_client_status_idx
  on public.client_info_correction_requests (client_id, status, created_at desc);
create index if not exists client_medication_reminders_medication_time_idx
  on public.client_medication_reminders (medication_id, is_active, reminder_time);
create index if not exists medication_reminder_events_client_time_idx
  on public.medication_reminder_events (client_id, scheduled_for desc);
create index if not exists medication_reminder_events_shift_idx
  on public.medication_reminder_events (shift_id);

drop trigger if exists set_client_info_correction_requests_updated_at on public.client_info_correction_requests;
create trigger set_client_info_correction_requests_updated_at
before update on public.client_info_correction_requests
for each row execute function public.touch_updated_at();

drop trigger if exists set_client_medication_reminders_updated_at on public.client_medication_reminders;
create trigger set_client_medication_reminders_updated_at
before update on public.client_medication_reminders
for each row execute function public.touch_updated_at();

drop trigger if exists set_medication_reminder_events_updated_at on public.medication_reminder_events;
create trigger set_medication_reminder_events_updated_at
before update on public.medication_reminder_events
for each row execute function public.touch_updated_at();

alter table public.shift_events
  drop constraint if exists shift_events_event_type_check;

alter table public.shift_events
  add constraint shift_events_event_type_check
    check (
      event_type in (
        'check_in_reminder_sent',
        'checkout_reminder_sent',
        'auto_checkout_completed',
        'auto_checkout_skipped_location_unknown',
        'auto_checkout_skipped_inside_geofence',
        'auto_checkout_skipped_stale_location',
        'caregiver_checked_in',
        'caregiver_checked_out',
        'task_completed',
        'task_reopened',
        'medication_reminder_marked',
        'incident_reported',
        'shift_released',
        'shift_removed'
      )
    );

create or replace function public.record_shift_todo_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts%rowtype;
begin
  if tg_op = 'UPDATE' and new.is_completed is distinct from old.is_completed then
    select * into v_shift from public.shifts where id = new.shift_id;
    if v_shift.id is not null then
      insert into public.shift_events (
        organization_id,
        shift_id,
        caregiver_id,
        client_id,
        event_type,
        event_time,
        metadata,
        created_by
      )
      values (
        v_shift.organization_id,
        v_shift.id,
        coalesce(new.completed_by, v_shift.caregiver_id),
        v_shift.client_id,
        case when new.is_completed then 'task_completed' else 'task_reopened' end,
        coalesce(new.completed_at, now()),
        jsonb_build_object('task_id', new.id, 'task_name', new.task_name),
        coalesce(new.completed_by, auth.uid())
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists record_shift_todo_activity on public.shift_todos;
create trigger record_shift_todo_activity
after update on public.shift_todos
for each row execute function public.record_shift_todo_activity();

create or replace function public.record_check_in_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts%rowtype;
begin
  select * into v_shift from public.shifts where id = new.shift_id;
  if v_shift.id is null then
    return new;
  end if;

  if new.check_in_time is not null and (tg_op = 'INSERT' or old.check_in_time is null) then
    insert into public.shift_events (
      organization_id,
      shift_id,
      caregiver_id,
      client_id,
      event_type,
      event_time,
      metadata,
      created_by
    )
    values (
      new.organization_id,
      new.shift_id,
      new.caregiver_id,
      v_shift.client_id,
      'caregiver_checked_in',
      new.check_in_time,
      jsonb_build_object('within_geofence', new.check_in_within_geofence),
      new.caregiver_id
    );
  end if;

  if new.check_out_time is not null and (tg_op = 'INSERT' or old.check_out_time is null) then
    insert into public.shift_events (
      organization_id,
      shift_id,
      caregiver_id,
      client_id,
      event_type,
      event_time,
      metadata,
      created_by
    )
    values (
      new.organization_id,
      new.shift_id,
      new.caregiver_id,
      v_shift.client_id,
      'caregiver_checked_out',
      new.check_out_time,
      jsonb_build_object('method', new.check_out_method, 'total_minutes', new.total_minutes),
      coalesce(new.check_out_by, new.caregiver_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists record_check_in_activity on public.check_ins;
create trigger record_check_in_activity
after insert or update on public.check_ins
for each row execute function public.record_check_in_activity();

alter table public.client_info_correction_requests enable row level security;
alter table public.client_medication_reminders enable row level security;
alter table public.medication_reminder_events enable row level security;

drop policy if exists "linked users create correction requests" on public.client_info_correction_requests;
create policy "linked users create correction requests"
on public.client_info_correction_requests
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and submitted_by = auth.uid()
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1 from public.client_user_assignments a
      where a.client_id = client_info_correction_requests.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
  )
);

drop policy if exists "linked users view correction requests" on public.client_info_correction_requests;
create policy "linked users view correction requests"
on public.client_info_correction_requests
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or submitted_by = auth.uid()
    or exists (
      select 1 from public.client_user_assignments a
      where a.client_id = client_info_correction_requests.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and a.relationship_role in ('family', 'client')
    )
  )
);

drop policy if exists "admins clients review correction requests" on public.client_info_correction_requests;
create policy "admins clients review correction requests"
on public.client_info_correction_requests
for update
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
    select 1 from public.client_medications m
    where m.id = client_medication_reminders.medication_id
      and (
        public.current_role() in ('admin', 'client')
        or exists (
          select 1 from public.client_user_assignments a
          join public.clients c on c.id = a.client_id
          where a.client_id = client_medication_reminders.client_id
            and a.user_id = auth.uid()
            and a.is_active = true
            and (
              public.current_role() <> 'caregiver'
              or c.show_medications_to_caregivers = true
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

drop policy if exists "linked users view medication reminder events" on public.medication_reminder_events;
create policy "linked users view medication reminder events"
on public.medication_reminder_events
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1 from public.client_user_assignments a
      where a.client_id = medication_reminder_events.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
    )
    or exists (
      select 1 from public.shifts s
      where s.id = medication_reminder_events.shift_id
        and s.caregiver_id = auth.uid()
    )
  )
);

drop policy if exists "care team marks medication reminder events" on public.medication_reminder_events;
create policy "care team marks medication reminder events"
on public.medication_reminder_events
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and marked_by = auth.uid()
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1 from public.client_user_assignments a
      where a.client_id = medication_reminder_events.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and a.relationship_role in ('caregiver', 'admin')
    )
    or exists (
      select 1 from public.shifts s
      where s.id = medication_reminder_events.shift_id
        and s.caregiver_id = auth.uid()
    )
  )
);

drop policy if exists "care team updates own medication reminder events" on public.medication_reminder_events;
create policy "care team updates own medication reminder events"
on public.medication_reminder_events
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or marked_by = auth.uid()
  )
)
with check (
  organization_id = public.current_org_id()
  and (
    public.current_role() in ('admin', 'client')
    or marked_by = auth.uid()
  )
);

drop policy if exists "clients and family view client shift events" on public.shift_events;
create policy "clients and family view client shift events"
on public.shift_events
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and client_id is not null
  and (
    public.current_role() in ('admin', 'client')
    or exists (
      select 1 from public.client_user_assignments a
      where a.client_id = shift_events.client_id
        and a.user_id = auth.uid()
        and a.is_active = true
        and a.relationship_role in ('family', 'client')
    )
  )
);

grant select, insert, update on public.client_info_correction_requests to authenticated;
grant select, insert, update, delete on public.client_medication_reminders to authenticated;
grant select, insert, update on public.medication_reminder_events to authenticated;

notify pgrst, 'reload schema';

commit;
