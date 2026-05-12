create table if not exists public.transactions (
  id text primary key,
  source text not null default 'app',
  from_user text,
  to_user text,
  amount numeric not null default 0,
  reference text,
  created_at timestamptz default now(),
  account_id text,
  customer_name text,
  city text,
  product_name text,
  transaction_date date,
  transaction_time time,
  transaction_amount numeric,
  payment_type text,
  payment_type_description text,
  transaction_category text,
  transaction_reference text
);

alter table public.transactions enable row level security;

create policy if not exists "transactions_public_select"
  on public.transactions for select
  using (true);

create policy if not exists "transactions_public_insert"
  on public.transactions for insert
  with check (true);

create policy if not exists "transactions_public_update"
  on public.transactions for update
  using (true)
  with check (true);

create or replace view public.dataset_recent_activity as
select
  id as transaction_id,
  account_id,
  customer_name,
  city,
  product_name,
  transaction_date,
  transaction_time,
  transaction_amount,
  payment_type,
  payment_type_description,
  transaction_category,
  transaction_reference
from public.transactions
where source = 'dataset_recent_activity'
order by transaction_date desc nulls last, transaction_time desc nulls last, id desc;
