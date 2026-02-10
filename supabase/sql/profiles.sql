create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  name text not null,
  finance_competency text,
  interests text[] default '{}',
  avatar_url text default '',
  helper text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy if not exists "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy if not exists "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);
