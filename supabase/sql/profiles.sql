create table if not exists public.profiles (
  profile_id text primary key,
  auth_user_id uuid unique,
  customer_id text unique,
  name text not null,
  display_name text,
  finance_competency text,
  interests text[] default '{}',
  avatar_url text default '',
  helper text,
  city text,
  nationality text,
  monthly_income numeric,
  income_band text,
  marital_status text,
  account_count integer,
  product_count integer,
  linked_products text,
  latest_visit_date date,
  source text not null default 'app',
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "profiles_public_select"
  on public.profiles for select
  using (true);

create policy if not exists "profiles_public_insert"
  on public.profiles for insert
  with check (true);

create policy if not exists "profiles_public_update"
  on public.profiles for update
  using (true)
  with check (true);

create or replace view public.dataset_customer_profiles as
select
  customer_id,
  display_name,
  city,
  nationality,
  monthly_income,
  income_band,
  marital_status,
  account_count,
  product_count,
  linked_products,
  latest_visit_date
from public.profiles
where source = 'dataset_customer_profiles';
