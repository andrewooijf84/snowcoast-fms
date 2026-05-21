-- ============================================================
-- Snow Coast FMS — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. ORDERS (Master Plan)
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique,
  style           text not null,
  buyer           text not null,
  qty             integer not null default 0,
  smv             numeric(6,2) not null default 0,
  start_date      date not null,
  end_date        date not null,
  ship_date       date not null,
  status          text not null default 'pending'
                  check (status in ('active','pending','completed','delayed')),
  progress        integer not null default 0 check (progress between 0 and 100),
  component_line  text,
  assembly_line   text,
  requires_embroidery boolean not null default false,
  color           text default '#3b82f6',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. LINES (20 pairs = 40 sewing lines)
create table if not exists lines (
  id              uuid primary key default gen_random_uuid(),
  pair_no         integer not null unique,
  component_line  text not null unique,
  assembly_line   text not null unique
);

-- Seed the 20 line pairs
insert into lines (pair_no, component_line, assembly_line)
select
  n,
  'C' || lpad(n::text, 2, '0'),
  'A' || lpad(n::text, 2, '0')
from generate_series(1, 20) as n
on conflict do nothing;

-- 3. CAPACITY DATA (weekly capacity loading)
create table if not exists capacity_data (
  id              uuid primary key default gen_random_uuid(),
  week_label      text not null,
  week_start      date not null,
  capacity_pcs    integer not null default 0,
  loaded_pcs      integer not null default 0,
  capacity_mins   integer not null default 0,
  loaded_mins     integer not null default 0,
  loading_pct     integer not null default 0,
  created_at      timestamptz default now()
);

-- 4. SECTION OUTPUT (daily/weekly/monthly per section)
create table if not exists section_output (
  id              uuid primary key default gen_random_uuid(),
  section         text not null
                  check (section in ('cutting','embroidery','downFilling','template','component','assembly','packing')),
  period_type     text not null
                  check (period_type in ('daily','weekly','monthly')),
  period_label    text not null,
  period_date     date,
  target          integer not null default 0,
  actual          integer not null default 0,
  efficiency      integer not null default 0,
  created_at      timestamptz default now()
);

-- 5. SHIPMENT MILESTONES
create table if not exists shipment_milestones (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  name            text not null,
  milestone_date  date not null,
  done            boolean not null default false,
  sort_order      integer not null default 0
);

-- ============================================================
-- ROW LEVEL SECURITY (allow authenticated users full access)
-- ============================================================
alter table orders enable row level security;
alter table lines enable row level security;
alter table capacity_data enable row level security;
alter table section_output enable row level security;
alter table shipment_milestones enable row level security;

-- Policy: authenticated users can read/write everything
create policy "Authenticated users can do everything on orders"
  on orders for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on lines"
  on lines for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on capacity_data"
  on capacity_data for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on section_output"
  on section_output for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on shipment_milestones"
  on shipment_milestones for all to authenticated using (true) with check (true);

-- ============================================================
-- AUTO-UPDATE updated_at on orders
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();
