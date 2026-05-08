begin;

alter table public.check_ins
  add column if not exists organization_id uuid;

update public.check_ins ci
set organization_id = s.organization_id
from public.shifts s
where ci.shift_id = s.id
  and ci.organization_id is null;

do $do$
begin
  if to_regclass('public.check_ins') is not null then
    create index if not exists check_ins_org_idx
      on public.check_ins (organization_id);

    if not exists (
      select 1
      from public.check_ins
      group by shift_id
      having count(*) > 1
    ) then
      create unique index if not exists check_ins_shift_key
        on public.check_ins (shift_id);
    end if;
  end if;
end
$do$;

do $do$
begin
  if to_regclass('public.check_ins') is not null
     and to_regclass('public.organizations') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'check_ins_organization_id_fkey'
         and conrelid = to_regclass('public.check_ins')
     ) then
    alter table public.check_ins
      add constraint check_ins_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade
      not valid;
  end if;

  if to_regclass('public.check_ins') is not null
     and to_regclass('public.organizations') is not null
     and exists (
    select 1
    from pg_constraint
    where conname = 'check_ins_organization_id_fkey'
      and conrelid = to_regclass('public.check_ins')
      and not convalidated
  ) and not exists (
    select 1
    from public.check_ins ci
    left join public.organizations o on o.id = ci.organization_id
    where ci.organization_id is not null
      and o.id is null
  ) then
    alter table public.check_ins
      validate constraint check_ins_organization_id_fkey;
  end if;
end
$do$;

do $do$
begin
  if to_regclass('public.check_ins') is not null
     and not exists (
       select 1
       from public.check_ins
       where organization_id is null
     ) then
    alter table public.check_ins
      alter column organization_id set not null;
  end if;
end
$do$;

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

do $do$
begin
  if to_regclass('public.check_ins') is not null then
    drop trigger if exists check_ins_set_organization_id on public.check_ins;
    create trigger check_ins_set_organization_id
    before insert or update on public.check_ins
    for each row
    execute function public.set_check_in_organization_id();
  end if;
end
$do$;

commit;
