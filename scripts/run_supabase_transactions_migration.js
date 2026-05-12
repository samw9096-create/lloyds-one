#!/usr/bin/env node

// Merges public.dataset_recent_activity into public.transactions.
// Existing transaction rows are backed up and preserved with source='app';
// dataset rows are copied from the existing view and exposed back through a
// compatibility dataset_recent_activity view.

const { execFileSync } = require("child_process");

const PROJECT_REF = "ipxomjjvygcpyhhmwcbt";

function getSupabaseAccessToken() {
  const raw = execFileSync("security", ["find-generic-password", "-a", "supabase", "-w"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
  const encoded = raw.startsWith("go-keyring-base64:") ? raw.slice("go-keyring-base64:".length) : raw;
  return Buffer.from(encoded, "base64").toString("utf8");
}

const migrationSql = `
begin;

create table if not exists public.transactions_backup_20260511 as
select * from public.transactions;

create temp table dataset_recent_activity_source as
select * from public.dataset_recent_activity;

drop view if exists public.dataset_recent_activity;
drop table if exists public.transactions cascade;

create table public.transactions (
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

insert into public.transactions (
  id, source, from_user, to_user, amount, reference, created_at
)
select
  id::text,
  'app',
  from_user::text,
  to_user::text,
  amount,
  reference,
  created_at
from public.transactions_backup_20260511
on conflict (id) do update set
  source = excluded.source,
  from_user = excluded.from_user,
  to_user = excluded.to_user,
  amount = excluded.amount,
  reference = excluded.reference,
  created_at = excluded.created_at;

insert into public.transactions (
  id, source, amount, reference, created_at, account_id, customer_name, city,
  product_name, transaction_date, transaction_time, transaction_amount,
  payment_type, payment_type_description, transaction_category,
  transaction_reference
)
select
  transaction_id::text,
  'dataset_recent_activity',
  abs(coalesce(transaction_amount, 0)),
  transaction_reference,
  case
    when transaction_date is null then now()
    else (transaction_date::text || ' ' || coalesce(transaction_time::text, '00:00:00'))::timestamp
  end,
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
from dataset_recent_activity_source
where transaction_id is not null
on conflict (id) do update set
  source = excluded.source,
  amount = excluded.amount,
  reference = excluded.reference,
  created_at = excluded.created_at,
  account_id = excluded.account_id,
  customer_name = excluded.customer_name,
  city = excluded.city,
  product_name = excluded.product_name,
  transaction_date = excluded.transaction_date,
  transaction_time = excluded.transaction_time,
  transaction_amount = excluded.transaction_amount,
  payment_type = excluded.payment_type,
  payment_type_description = excluded.payment_type_description,
  transaction_category = excluded.transaction_category,
  transaction_reference = excluded.transaction_reference;

alter table public.transactions enable row level security;
drop policy if exists transactions_public_select on public.transactions;
drop policy if exists transactions_public_insert on public.transactions;
drop policy if exists transactions_public_update on public.transactions;
create policy transactions_public_select on public.transactions for select using (true);
create policy transactions_public_insert on public.transactions for insert with check (true);
create policy transactions_public_update on public.transactions for update using (true) with check (true);

create view public.dataset_recent_activity as
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

commit;
`;

async function run() {
  const token = getSupabaseAccessToken();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: migrationSql })
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(text);
    process.exit(1);
  }
  console.log(text);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
