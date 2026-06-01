-- Migration: Create shift_removal_requests table and secure RLS policies.
create table if not exists public.shift_removal_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  admin_response text null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  cancellation_fee_applies boolean not null default false,
  cancellation_fee_amount numeric null,
  cancellation_fee_reason text null,
  cancellation_fee_waived boolean not null default false,
  client_notice_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.shift_removal_requests enable row level security;

-- Row Level Security Policies
create policy "users view shift removal requests"
on public.shift_removal_requests
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.organization_id = shift_removal_requests.organization_id
    and (
      p.role = 'admin'
      or (p.role = 'client' and p.id = shift_removal_requests.requested_by)
      or (p.role = 'caregiver' and exists (
        select 1 from public.shifts s
        where s.id = shift_removal_requests.shift_id
        and s.caregiver_id = p.id
      ))
    )
  )
);

create policy "users insert shift removal requests"
on public.shift_removal_requests
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.organization_id = shift_removal_requests.organization_id
    and p.role = 'client'
  )
);

create policy "users update shift removal requests"
on public.shift_removal_requests
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.organization_id = shift_removal_requests.organization_id
    and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.organization_id = shift_removal_requests.organization_id
    and p.role = 'admin'
  )
);
