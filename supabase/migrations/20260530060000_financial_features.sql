begin;

-- 1. Add billing rate columns to clients and shifts
alter table public.clients add column if not exists hourly_billing_rate numeric(10,2) not null default 40.00;
alter table public.shifts add column if not exists billing_rate_override numeric(10,2) null;

-- 2. Add custom invoice schedule settings to organizations table
alter table public.organizations add column if not exists invoice_frequency text not null default 'weekly'
  check (invoice_frequency in ('weekly', 'every_other_week', 'twice_monthly', 'monthly', 'custom'));
alter table public.organizations add column if not exists invoice_period_start_date date null;
alter table public.organizations add column if not exists invoice_period_end_rule text null;
alter table public.organizations add column if not exists invoice_release_day text not null default 'Friday';
alter table public.organizations add column if not exists invoice_release_time time not null default '09:00:00';
alter table public.organizations add column if not exists invoice_timezone text not null default 'America/New_York';

-- 3. Add client caregiver bonus settings to organizations table
alter table public.organizations add column if not exists allow_client_caregiver_bonuses boolean not null default true;
alter table public.organizations add column if not exists bonus_requires_admin_approval boolean not null default true;
alter table public.organizations add column if not exists bonus_visible_to_caregiver_before_approval boolean not null default false;
alter table public.organizations add column if not exists bonus_added_to_client_invoice boolean not null default true;
alter table public.organizations add column if not exists bonus_included_in_year_end_summary boolean not null default true;

-- 4. Create the client_invoices table
create table if not exists public.client_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  pay_period_id uuid references public.pay_periods(id) on delete set null,
  subtotal numeric(12,2) not null default 0.00,
  adjustments numeric(12,2) not null default 0.00,
  adjustments_reason text null,
  total_hours numeric(12,2) not null default 0.00,
  total_amount numeric(12,2) not null default 0.00,
  payments_applied numeric(12,2) not null default 0.00,
  balance_due numeric(12,2) not null default 0.00,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'voided')),
  released_at timestamptz null,
  released_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, pay_period_id)
);

-- 5. Create the invoice_payments table
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.client_invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  payment_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'check', 'bank_transfer', 'credit_card', 'other')),
  note text null,
  recorded_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. Create the invoice_audit_logs table
create table if not exists public.invoice_audit_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.client_invoices(id) on delete cascade,
  action text not null,
  user_id uuid not null references public.profiles(id) on delete set null,
  note text null,
  created_at timestamptz not null default now()
);

-- 7. Create the client_caregiver_bonuses table
create table if not exists public.client_caregiver_bonuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  pay_period_id uuid references public.pay_periods(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  bonus_type text not null check (bonus_type in ('appreciation_bonus', 'holiday_bonus', 'performance_bonus', 'manual_adjustment', 'other')) default 'appreciation_bonus',
  status text not null check (status in ('pending_review', 'approved', 'declined', 'paid', 'voided')) default 'pending_review',
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  notes text null,
  admin_notes text null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Add triggers for touched updated_at
drop trigger if exists set_client_invoices_updated_at on public.client_invoices;
create trigger set_client_invoices_updated_at
before update on public.client_invoices
for each row execute function public.touch_updated_at();

drop trigger if exists set_client_caregiver_bonuses_updated_at on public.client_caregiver_bonuses;
create trigger set_client_caregiver_bonuses_updated_at
before update on public.client_caregiver_bonuses
for each row execute function public.touch_updated_at();

-- 9. Enable Row-Level Security
alter table public.client_invoices enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_audit_logs enable row level security;
alter table public.client_caregiver_bonuses enable row level security;

-- 10. Security Policies for client_invoices
-- Admins view all; clients/family see released invoices if allowed
create policy "admins manage client invoices"
on public.client_invoices
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

create policy "members select client invoices"
on public.client_invoices
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_admin()
    or (
      released_at is not null
      and (
        exists (
          select 1 from public.client_user_assignments assignment
          where assignment.client_id = client_invoices.client_id
            and assignment.user_id = auth.uid()
            and assignment.is_active = true
            and assignment.relationship_role in ('client', 'family')
        )
      )
    )
  )
);

-- 11. Security Policies for invoice_payments
create policy "admins manage payments"
on public.invoice_payments
for all
to authenticated
using (exists (select 1 from public.client_invoices inv where inv.id = invoice_id and inv.organization_id = public.current_org_id() and public.is_admin()))
with check (exists (select 1 from public.client_invoices inv where inv.id = invoice_id and inv.organization_id = public.current_org_id() and public.is_admin()));

create policy "members select payments"
on public.invoice_payments
for select
to authenticated
using (
  exists (
    select 1 from public.client_invoices inv
    where inv.id = invoice_payments.invoice_id
      and inv.organization_id = public.current_org_id()
      and (
        public.is_admin()
        or (
          inv.released_at is not null
          and exists (
            select 1 from public.client_user_assignments assignment
            where assignment.client_id = inv.client_id
              and assignment.user_id = auth.uid()
              and assignment.is_active = true
              and assignment.relationship_role in ('client', 'family')
          )
        )
      )
  )
);

-- 12. Security Policies for invoice_audit_logs
create policy "admins manage invoice audit logs"
on public.invoice_audit_logs
for all
to authenticated
using (exists (select 1 from public.client_invoices inv where inv.id = invoice_id and inv.organization_id = public.current_org_id() and public.is_admin()))
with check (exists (select 1 from public.client_invoices inv where inv.id = invoice_id and inv.organization_id = public.current_org_id() and public.is_admin()));

-- 13. Security Policies for client_caregiver_bonuses
create policy "admins manage client caregiver bonuses"
on public.client_caregiver_bonuses
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

create policy "caregivers select approved caregiver bonuses"
on public.client_caregiver_bonuses
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and caregiver_id = auth.uid()
  and (
    status in ('approved', 'paid')
    or exists (
      select 1 from public.organizations org
      where org.id = client_caregiver_bonuses.organization_id
        and org.bonus_visible_to_caregiver_before_approval = true
    )
  )
);

create policy "clients manage caregiver bonuses"
on public.client_caregiver_bonuses
for all
to authenticated
using (
  organization_id = public.current_org_id()
  and exists (
    select 1 from public.client_user_assignments assignment
    where assignment.client_id = client_caregiver_bonuses.client_id
      and assignment.user_id = auth.uid()
      and assignment.is_active = true
      and assignment.relationship_role in ('client', 'family', 'admin')
  )
)
with check (
  organization_id = public.current_org_id()
  and exists (
    select 1 from public.client_user_assignments assignment
    where assignment.client_id = client_caregiver_bonuses.client_id
      and assignment.user_id = auth.uid()
      and assignment.is_active = true
      and assignment.relationship_role in ('client', 'family', 'admin')
  )
);

commit;
