-- Public first-run onboarding and account deletion requests.

alter table public.organizations
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists setup_type text not null default 'personal_family',
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.organizations
  drop constraint if exists organizations_setup_type_check;

alter table public.organizations
  add constraint organizations_setup_type_check
  check (setup_type in ('personal_family', 'organization'));

alter table public.profiles
  add column if not exists is_owner boolean not null default false,
  add column if not exists owner_role text,
  add column if not exists owner_role_label text;

alter table public.profiles
  drop constraint if exists profiles_owner_role_check;

alter table public.profiles
  add constraint profiles_owner_role_check
  check (owner_role is null or owner_role in ('client', 'family', 'admin'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'organization_id'
      and is_nullable = 'NO'
  ) then
    alter table public.profiles
      alter column organization_id drop not null;
  end if;
end $$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid null references public.organizations(id) on delete set null,
  email text,
  reason text,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  admin_notes text
);

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'reviewing', 'completed', 'rejected'));

create index if not exists account_deletion_requests_user_id_idx
  on public.account_deletion_requests(user_id);

create index if not exists account_deletion_requests_organization_id_idx
  on public.account_deletion_requests(organization_id);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "users create own deletion requests" on public.account_deletion_requests;
create policy "users create own deletion requests"
on public.account_deletion_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "users view own deletion requests" on public.account_deletion_requests;
create policy "users view own deletion requests"
on public.account_deletion_requests
for select
using (auth.uid() = user_id);

drop policy if exists "org admins manage deletion requests" on public.account_deletion_requests;
create policy "org admins manage deletion requests"
on public.account_deletion_requests
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = account_deletion_requests.organization_id
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = account_deletion_requests.organization_id
      and p.role = 'admin'
  )
);

drop policy if exists "org owners update own organization onboarding" on public.organizations;
create policy "org owners update own organization onboarding"
on public.organizations
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "org owners view own organization" on public.organizations;
create policy "org owners view own organization"
on public.organizations
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organizations.id
  )
);

create or replace function public.set_organization_onboarding_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.onboarding_complete = true and old.onboarding_complete is distinct from true then
    new.onboarding_completed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_organization_onboarding_completed_at on public.organizations;
create trigger set_organization_onboarding_completed_at
before update on public.organizations
for each row
execute function public.set_organization_onboarding_completed_at();
