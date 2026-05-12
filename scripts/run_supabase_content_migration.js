#!/usr/bin/env node

// Runs the one-off Supabase content/schema tidy requested for the prototype.
// The script uses the Supabase CLI token already stored in macOS Keychain, then
// calls the Supabase Management API SQL endpoint for the linked project.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PROJECT_REF = "ipxomjjvygcpyhhmwcbt";
const ROOT = path.resolve(__dirname, "..");

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlArray(values) {
  if (!Array.isArray(values) || !values.length) return "'{}'::text[]";
  return `array[${values.map(sql).join(", ")}]::text[]`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function getSupabaseAccessToken() {
  const raw = execFileSync("security", ["find-generic-password", "-a", "supabase", "-w"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
  const encoded = raw.startsWith("go-keyring-base64:") ? raw.slice("go-keyring-base64:".length) : raw;
  return Buffer.from(encoded, "base64").toString("utf8");
}

const moneyModules = [
  {
    id: "mod-foundations",
    title: "Money Foundations",
    description: "Budgeting, goals, and smart habits.",
    difficulty: "Beginner",
    difficultyLevel: 1,
    quizIds: ["q1", "q2"],
    sortOrder: 1
  },
  {
    id: "mod-safety",
    title: "Safe Spending",
    description: "Avoiding overspend and building buffers.",
    difficulty: "Beginner",
    difficultyLevel: 1,
    quizIds: ["q3"],
    sortOrder: 2
  },
  {
    id: "mod-growth",
    title: "Growing Savings",
    description: "Pots, interest, and long-term wins.",
    difficulty: "Intermediate",
    difficultyLevel: 2,
    quizIds: ["q4", "q5"],
    sortOrder: 3
  },
  {
    id: "mod-investing",
    title: "Investing Essentials",
    description: "Risk, returns, and long-term portfolio basics.",
    difficulty: "Advanced",
    difficultyLevel: 3,
    quizIds: ["q6"],
    sortOrder: 4
  },
  {
    id: "mod-credit",
    title: "Credit & Borrowing",
    description: "Credit scores, interest costs, and debt strategy.",
    difficulty: "Advanced",
    difficultyLevel: 3,
    quizIds: ["q7"],
    sortOrder: 5
  }
];

function buildMigrationSql() {
  const studentDeals = readJson("assets/data/student-deals.json");
  const groceryDeals = readJson("assets/data/deal-dash.json");

  const moneyValues = moneyModules.map((item) => `(
    ${sql(item.id)},
    ${sql(item.title)},
    ${sql(item.description)},
    ${sql(item.difficulty)},
    ${item.difficultyLevel},
    ${sqlArray(item.quizIds)},
    ${sql("./Video-17.mp4")},
    ${sql("module")},
    ${item.sortOrder}
  )`).join(",\n");

  const studentDealValues = studentDeals.map((item) => `(
    ${sql(item.id)},
    ${sql("student_offer")},
    ${sql(item.title)},
    ${sql(item.summary)},
    ${sql((item.interestTags || []).join(","))},
    ${sql(item.category)},
    ${sql(item.brand)},
    ${sql(item.discount)},
    ${sql(item.code)},
    ${sql(item.expires)},
    ${Number(item.popularity || 0)},
    null,
    null,
    null,
    null,
    null,
    ${sql(item.accent)},
    null
  )`);

  const groceryDealValues = groceryDeals.map((item) => `(
    ${sql(item.id)},
    ${sql("grocery_price")},
    ${sql(item.name)},
    ${sql(`${item.brand || item.store || "Store"} price at ${item.store || "nearby store"}.`)},
    ${sql(item.category || "")},
    ${sql(item.category)},
    ${sql(item.brand)},
    null,
    null,
    null,
    ${Number(item.popularity || 0)},
    ${Number(item.price || 0)},
    ${sql(item.unit)},
    ${sql(item.store)},
    ${Number(item.distanceMiles || 0)},
    ${sql(item.address)},
    null,
    ${item.lastUpdated ? sql(item.lastUpdated) : "null"}
  )`);

  return `
begin;

create table if not exists public.profiles_backup_20260511 as
select * from public.profiles;

create table if not exists public.profiles_auth_backup_20260511 as
select * from public.profiles;

create temp table dataset_customer_profiles_source as
select * from public.dataset_customer_profiles;

drop view if exists public.dataset_customer_profiles;
drop table if exists public.profiles cascade;

create table public.profiles (
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

insert into public.profiles (
  profile_id, auth_user_id, name, display_name, finance_competency, interests,
  avatar_url, helper, source, updated_at
)
select
  user_id::text,
  user_id,
  name,
  name,
  finance_competency,
  coalesce(interests, '{}'::text[]),
  coalesce(avatar_url, ''),
  helper,
  'app',
  coalesce(updated_at, now())
from public.profiles_auth_backup_20260511
on conflict (profile_id) do update set
  name = excluded.name,
  display_name = excluded.display_name,
  finance_competency = excluded.finance_competency,
  interests = excluded.interests,
  avatar_url = excluded.avatar_url,
  helper = excluded.helper,
  updated_at = excluded.updated_at;

insert into public.profiles (
  profile_id, customer_id, name, display_name, city, nationality, monthly_income,
  income_band, marital_status, account_count, product_count, linked_products,
  latest_visit_date, source, updated_at
)
select
  customer_id,
  customer_id,
  coalesce(display_name, customer_id),
  display_name,
  city,
  nationality,
  monthly_income,
  income_band,
  marital_status,
  account_count,
  product_count,
  linked_products,
  latest_visit_date,
  'dataset_customer_profiles',
  now()
from dataset_customer_profiles_source
where customer_id is not null
on conflict (profile_id) do update set
  customer_id = excluded.customer_id,
  name = excluded.name,
  display_name = excluded.display_name,
  city = excluded.city,
  nationality = excluded.nationality,
  monthly_income = excluded.monthly_income,
  income_band = excluded.income_band,
  marital_status = excluded.marital_status,
  account_count = excluded.account_count,
  product_count = excluded.product_count,
  linked_products = excluded.linked_products,
  latest_visit_date = excluded.latest_visit_date,
  source = excluded.source,
  updated_at = excluded.updated_at;

alter table public.profiles enable row level security;
drop policy if exists profiles_public_select on public.profiles;
drop policy if exists profiles_public_insert on public.profiles;
drop policy if exists profiles_public_update on public.profiles;
create policy profiles_public_select on public.profiles for select using (true);
create policy profiles_public_insert on public.profiles for insert with check (true);
create policy profiles_public_update on public.profiles for update using (true) with check (true);

create view public.dataset_customer_profiles as
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

drop table if exists public.money_minutes;
create table public.money_minutes (
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

insert into public.money_minutes (
  video_id, title, description, difficulty_rating, difficulty_level,
  quiz_ids, video_src, content_type, sort_order
) values
${moneyValues};

alter table public.money_minutes enable row level security;
create policy money_minutes_public_select on public.money_minutes for select using (true);

drop table if exists public.deal_nest;
create table public.deal_nest (
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

insert into public.deal_nest (
  deal_id, source_type, title, description, interests, category, brand,
  discount, code, expires, popularity, price, unit, store, distance_miles,
  address, accent, last_updated
) values
${studentDealValues.concat(groceryDealValues).join(",\n")};

alter table public.deal_nest enable row level security;
create policy deal_nest_public_select on public.deal_nest for select using (true);

commit;
`;
}

async function run() {
  const token = getSupabaseAccessToken();
  const query = buildMigrationSql();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
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
