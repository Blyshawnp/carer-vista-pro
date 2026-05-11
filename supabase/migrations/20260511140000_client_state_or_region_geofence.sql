begin;

alter table public.clients
  add column if not exists state_or_region text;

alter table public.clients
  alter column country set default 'United States';

alter table public.clients
  alter column geofence_radius_meters set default 150;

update public.clients
set
  state_or_region = coalesce(nullif(trim(state_or_region), ''), nullif(trim(state), '')),
  state = coalesce(nullif(trim(state_or_region), ''), nullif(trim(state), '')),
  country = case
    when country is null or trim(country) = '' then 'United States'
    when upper(trim(country)) in ('US', 'USA') then 'United States'
    when upper(trim(country)) in ('CA', 'CAN') then 'Canada'
    when upper(trim(country)) in ('UK', 'GB', 'GREAT BRITAIN', 'UNITED KINGDOM') then 'United Kingdom'
    else country
  end,
  geofence_radius_meters = coalesce(geofence_radius_meters, 150),
  location_source = coalesce(nullif(trim(location_source), ''), 'unknown')
where true;

create or replace function public.sync_client_location_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_country text;
  v_formatted text;
begin
  v_state := coalesce(
    nullif(trim(new.state_or_region), ''),
    nullif(trim(new.state), '')
  );

  v_country := case
    when new.country is null or trim(new.country) = '' then 'United States'
    when upper(trim(new.country)) in ('US', 'USA') then 'United States'
    when upper(trim(new.country)) in ('CA', 'CAN') then 'Canada'
    when upper(trim(new.country)) in ('UK', 'GB', 'GREAT BRITAIN', 'UNITED KINGDOM') then 'United Kingdom'
    else trim(new.country)
  end;

  new.state_or_region := v_state;
  new.state := v_state;
  new.country := v_country;
  new.geofence_radius_meters := coalesce(new.geofence_radius_meters, 150);

  v_formatted := nullif(trim(concat_ws(', ',
    nullif(trim(coalesce(new.street_address_1, '')), ''),
    nullif(trim(coalesce(new.street_address_2, '')), ''),
    nullif(trim(coalesce(new.city, '')), ''),
    nullif(trim(coalesce(v_state, '')), ''),
    nullif(trim(coalesce(new.postal_code, '')), ''),
    nullif(trim(coalesce(v_country, '')), '')
  )), '');

  if v_formatted is null then
    v_formatted := nullif(trim(coalesce(new.address, '')), '');
  end if;

  new.formatted_address := v_formatted;
  new.address := v_formatted;

  if new.location_source is null or trim(new.location_source) = '' then
    new.location_source := 'unknown';
  end if;

  if new.latitude is not null and new.longitude is not null then
    if tg_op = 'INSERT'
       or old.latitude is distinct from new.latitude
       or old.longitude is distinct from new.longitude
       or old.street_address_1 is distinct from new.street_address_1
       or old.street_address_2 is distinct from new.street_address_2
       or old.city is distinct from new.city
       or old.state is distinct from new.state
       or old.state_or_region is distinct from new.state_or_region
       or old.postal_code is distinct from new.postal_code
       or old.country is distinct from new.country
       or old.location_source is distinct from new.location_source
    then
      new.location_set_at := coalesce(new.location_set_at, now());
      if new.location_source = 'unknown' then
        new.location_source := 'manual';
      end if;
    end if;
  else
    new.location_set_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_client_location_fields on public.clients;
create trigger sync_client_location_fields
before insert or update on public.clients
for each row execute function public.sync_client_location_fields();

commit;
