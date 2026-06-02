begin;

alter table public.notifications
  add column if not exists read_at timestamptz,
  add column if not exists dismissed_at timestamptz;

create index if not exists notifications_recipient_read_idx
  on public.notifications(recipient_id, read_at);

create index if not exists notifications_recipient_dismissed_idx
  on public.notifications(recipient_id, dismissed_at);

alter table public.shifts
  add column if not exists pay_override_at timestamptz,
  add column if not exists pay_override_by uuid references public.profiles(id) on delete set null,
  add column if not exists pay_override_reason text,
  add column if not exists pay_override_amount numeric,
  add column if not exists pay_override_hours numeric,
  add column if not exists pay_override_rate numeric;

alter table public.shifts
  drop constraint if exists shifts_pay_override_amount_nonnegative,
  add constraint shifts_pay_override_amount_nonnegative
    check (pay_override_amount is null or pay_override_amount >= 0),
  drop constraint if exists shifts_pay_override_hours_nonnegative,
  add constraint shifts_pay_override_hours_nonnegative
    check (pay_override_hours is null or pay_override_hours >= 0),
  drop constraint if exists shifts_pay_override_rate_nonnegative,
  add constraint shifts_pay_override_rate_nonnegative
    check (pay_override_rate is null or pay_override_rate >= 0);

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
  v_has_structured_address boolean;
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

  v_has_structured_address :=
    nullif(trim(coalesce(new.street_address_1, '')), '') is not null
    or nullif(trim(coalesce(new.street_address_2, '')), '') is not null
    or nullif(trim(coalesce(new.city, '')), '') is not null
    or nullif(trim(coalesce(v_state, '')), '') is not null
    or nullif(trim(coalesce(new.postal_code, '')), '') is not null;

  if v_has_structured_address then
    v_formatted := nullif(trim(concat_ws(', ',
      nullif(trim(coalesce(new.street_address_1, '')), ''),
      nullif(trim(coalesce(new.street_address_2, '')), ''),
      nullif(trim(coalesce(new.city, '')), ''),
      nullif(trim(coalesce(v_state, '')), ''),
      nullif(trim(coalesce(new.postal_code, '')), ''),
      nullif(trim(coalesce(v_country, '')), '')
    )), '');
  else
    v_formatted := nullif(trim(coalesce(new.address, '')), '');
    if v_formatted = v_country then
      v_formatted := null;
    end if;
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

update public.clients
set
  address = null,
  formatted_address = null
where trim(coalesce(address, formatted_address, '')) = trim(coalesce(country, ''))
  and nullif(trim(coalesce(street_address_1, '')), '') is null
  and nullif(trim(coalesce(street_address_2, '')), '') is null
  and nullif(trim(coalesce(city, '')), '') is null
  and nullif(trim(coalesce(state_or_region, state, '')), '') is null
  and nullif(trim(coalesce(postal_code, '')), '') is null;

notify pgrst, 'reload schema';

commit;
