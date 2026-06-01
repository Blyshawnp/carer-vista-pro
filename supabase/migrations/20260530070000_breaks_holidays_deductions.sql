begin;

-- 1. Add break/lunch tracking settings to public.organizations table
alter table public.organizations add column if not exists enable_break_tracking boolean not null default true;
alter table public.organizations add column if not exists require_lunch_check_in_out boolean not null default true;
alter table public.organizations add column if not exists require_break_check_in_out boolean not null default false;
alter table public.organizations add column if not exists lunch_paid_or_unpaid text not null default 'unpaid' check (lunch_paid_or_unpaid in ('paid', 'unpaid'));
alter table public.organizations add column if not exists break_paid_or_unpaid text not null default 'paid' check (break_paid_or_unpaid in ('paid', 'unpaid'));
alter table public.organizations add column if not exists default_lunch_minutes integer not null default 30;
alter table public.organizations add column if not exists default_break_minutes integer not null default 15;

-- 2. Create the shift_breaks table to track start/end of break/lunch times
create table if not exists public.shift_breaks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  break_type text not null check (break_type in ('lunch', 'break')),
  start_time timestamptz not null,
  end_time timestamptz null,
  duration_minutes integer null,
  is_paid boolean not null default false,
  recorded_by uuid null references public.profiles(id) on delete set null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for shift_breaks updated_at
drop trigger if exists set_shift_breaks_updated_at on public.shift_breaks;
create trigger set_shift_breaks_updated_at
before update on public.shift_breaks
for each row execute function public.touch_updated_at();

-- 3. Add holiday and surcharge columns to public.holidays table
alter table public.holidays add column if not exists applies_every_year boolean not null default false;
alter table public.holidays add column if not exists is_active boolean not null default true;
alter table public.holidays add column if not exists flat_caregiver_bonus numeric(10,2) null;
alter table public.holidays add column if not exists bonus_applied_mode text not null default 'in_addition' check (bonus_applied_mode in ('in_addition', 'instead_of', 'bonus_only'));
alter table public.holidays add column if not exists client_charge_multiplier numeric(5,2) null;
alter table public.holidays add column if not exists client_hourly_surcharge numeric(10,2) null;
alter table public.holidays add column if not exists flat_client_surcharge numeric(10,2) null;

-- 4. Add pay deductions / tax estimates settings to public.organizations table
alter table public.organizations add column if not exists enable_pay_deductions boolean not null default false;
alter table public.organizations add column if not exists deduction_label text null;
alter table public.organizations add column if not exists deduction_type text null check (deduction_type in ('flat_amount', 'percentage'));
alter table public.organizations add column if not exists deduction_amount numeric(10,2) null;
alter table public.organizations add column if not exists deduction_applies_to text null check (deduction_applies_to in ('caregiver_pay_summary', 'invoice_record', 'custom'));
alter table public.organizations add column if not exists deduction_active boolean not null default false;
alter table public.organizations add column if not exists deduction_requires_acceptance boolean not null default true;

-- 5. Create the deduction_acknowledgments table to log warning accepts
create table if not exists public.deduction_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  accepted_by uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  warning_version text not null default '1.0',
  unique (organization_id, accepted_by)
);

-- 6. Create the financial_audit_logs table to track audit trails
create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  affected_record_id uuid null,
  affected_record_type text null,
  note text null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.shift_breaks enable row level security;
alter table public.deduction_acknowledgments enable row level security;
alter table public.financial_audit_logs enable row level security;

-- Drop existing policies if any
drop policy if exists "org members view shift breaks" on public.shift_breaks;
drop policy if exists "caregivers edit shift breaks" on public.shift_breaks;
drop policy if exists "admins manage shift breaks" on public.shift_breaks;
drop policy if exists "admins manage deduction acknowledgments" on public.deduction_acknowledgments;
drop policy if exists "admins manage financial audit logs" on public.financial_audit_logs;

-- Policies for shift_breaks
create policy "org members view shift breaks"
on public.shift_breaks
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "caregivers edit shift breaks"
on public.shift_breaks
for all
to authenticated
using (organization_id = public.current_org_id() and (auth.uid() = recorded_by or auth.uid() in (select caregiver_id from public.shifts s where s.id = shift_id)))
with check (organization_id = public.current_org_id() and (auth.uid() = recorded_by or auth.uid() in (select caregiver_id from public.shifts s where s.id = shift_id)));

create policy "admins manage shift breaks"
on public.shift_breaks
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

-- Policies for deduction_acknowledgments
create policy "admins manage deduction acknowledgments"
on public.deduction_acknowledgments
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

-- Policies for financial_audit_logs
create policy "admins manage financial audit logs"
on public.financial_audit_logs
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

commit;
