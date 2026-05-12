create table if not exists public.money_minutes (
  video_id text primary key,
  title text,
  description text,
  difficulty_rating text,
  difficulty_level integer,
  quiz_ids text[] default '{}',
  video_src text,
  content_type text default 'module',
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.money_minutes enable row level security;

create policy if not exists "money_minutes_public_select"
  on public.money_minutes for select
  using (true);

create table if not exists public.deal_nest (
  deal_id text primary key,
  source_type text not null,
  title text,
  description text,
  interests text,
  category text,
  brand text,
  discount text,
  code text,
  expires text,
  popularity integer default 0,
  price numeric,
  unit text,
  store text,
  distance_miles numeric,
  address text,
  accent text,
  last_updated date,
  created_at timestamptz default now()
);

alter table public.deal_nest enable row level security;

create policy if not exists "deal_nest_public_select"
  on public.deal_nest for select
  using (true);
