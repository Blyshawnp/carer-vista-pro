-- Add rate limiting support to profiles
alter table public.profiles add column if not exists last_action_at timestamptz;

-- Helper function to check and update rate limit
create or replace function public.check_rate_limit(p_user_id uuid, p_seconds integer default 2)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  select last_action_at into v_last from public.profiles where id = p_user_id;
  
  if v_last is not null and v_last > now() - (p_seconds || ' seconds')::interval then
    return false;
  end if;
  
  update public.profiles set last_action_at = now() where id = p_user_id;
  return true;
end;
$$;