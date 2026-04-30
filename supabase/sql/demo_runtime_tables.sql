create table if not exists public.demo_users (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.demo_accounts (
  user_id text primary key references public.demo_users(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.demo_transactions (
  id text primary key,
  from_user text not null,
  to_user text not null,
  amount numeric not null,
  reference text default '',
  counterparty_name text default '',
  created_at timestamptz default now()
);

create table if not exists public.demo_profiles (
  user_id text primary key references public.demo_users(id) on delete cascade,
  name text not null,
  finance_competency text,
  interests text[] default '{}',
  avatar_url text default '',
  helper text,
  updated_at timestamptz default now()
);

alter table public.demo_users enable row level security;
alter table public.demo_accounts enable row level security;
alter table public.demo_transactions enable row level security;
alter table public.demo_profiles enable row level security;

create policy if not exists "demo_users_public_all"
  on public.demo_users
  for all
  using (true)
  with check (true);

create policy if not exists "demo_accounts_public_all"
  on public.demo_accounts
  for all
  using (true)
  with check (true);

create policy if not exists "demo_transactions_public_all"
  on public.demo_transactions
  for all
  using (true)
  with check (true);

create policy if not exists "demo_profiles_public_all"
  on public.demo_profiles
  for all
  using (true)
  with check (true);
