begin;

alter table public.shift_location_pings
  add column if not exists organization_id uuid;

update public.shift_location_pings lp
set organization_id = s.organization_id
from public.shifts s
where lp.shift_id = s.id
  and lp.organization_id is null;

create index if not exists shift_location_pings_org_idx
  on public.shift_location_pings (organization_id);

do $do$
begin
  if to_regclass('public.shift_location_pings') is not null
     and to_regclass('public.organizations') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'shift_location_pings_organization_id_fkey'
         and conrelid = to_regclass('public.shift_location_pings')
     ) then
    alter table public.shift_location_pings
      add constraint shift_location_pings_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade
      not valid;
  end if;

  if to_regclass('public.shift_location_pings') is not null
     and to_regclass('public.organizations') is not null
     and exists (
       select 1
       from pg_constraint
       where conname = 'shift_location_pings_organization_id_fkey'
         and conrelid = to_regclass('public.shift_location_pings')
         and not convalidated
     ) and not exists (
       select 1
       from public.shift_location_pings lp
       left join public.organizations o on o.id = lp.organization_id
       where lp.organization_id is not null
         and o.id is null
     ) then
    alter table public.shift_location_pings
      validate constraint shift_location_pings_organization_id_fkey;
  end if;

  if to_regclass('public.shift_location_pings') is not null
     and not exists (
       select 1
       from public.shift_location_pings
       where organization_id is null
     ) then
    alter table public.shift_location_pings
      alter column organization_id set not null;
  end if;
end
$do$;

create or replace function public.set_shift_location_ping_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_org_id uuid;
begin
  if new.shift_id is null then
    return new;
  end if;

  select s.organization_id
  into shift_org_id
  from public.shifts s
  where s.id = new.shift_id;

  if shift_org_id is null then
    return new;
  end if;

  if new.organization_id is not null and new.organization_id <> shift_org_id then
    raise exception 'location ping organization_id must match the related shift';
  end if;

  new.organization_id := shift_org_id;
  return new;
end;
$$;

do $do$
begin
  if to_regclass('public.shift_location_pings') is not null then
    drop trigger if exists shift_location_pings_set_organization_id on public.shift_location_pings;
    create trigger shift_location_pings_set_organization_id
    before insert or update on public.shift_location_pings
    for each row
    execute function public.set_shift_location_ping_organization_id();
  end if;
end
$do$;

commit;
