begin;

-- Add custom branding settings to public.organizations table
alter table public.organizations add column if not exists enable_custom_branding boolean not null default false;
alter table public.organizations add column if not exists custom_logo_url text null;
alter table public.organizations add column if not exists custom_icon_url text null;
alter table public.organizations add column if not exists brand_primary_color text null;
alter table public.organizations add column if not exists brand_accent_color text null;
alter table public.organizations add column if not exists custom_brand_name text null;
alter table public.organizations add column if not exists custom_branding_enabled_by uuid null references public.profiles(id) on delete set null;
alter table public.organizations add column if not exists custom_branding_enabled_at timestamptz null;
alter table public.organizations add column if not exists plan_allows_custom_branding boolean not null default true;

commit;
