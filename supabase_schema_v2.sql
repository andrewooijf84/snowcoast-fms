-- ============================================================
-- Snow Coast FMS — Schema v2 (run in Supabase SQL Editor)
-- ============================================================

-- 1. Extend ORDERS with new date/planning fields
alter table orders add column if not exists season text;
alter table orders add column if not exists material_arrival_date date;
alter table orders add column if not exists cut_start_date date;
alter table orders add column if not exists emb_start_date date;
alter table orders add column if not exists sew_start_date date;
alter table orders add column if not exists completion_date date;

-- 2. LINE ALLOCATIONS — assign an order to a line pair with schedule
create table if not exists line_allocations (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  line_pair_no     integer not null check (line_pair_no between 1 and 20),
  start_date       date not null,
  end_date         date not null,
  allocated_qty    integer not null default 0,
  target_daily_pcs integer not null default 0,
  notes            text,
  created_at       timestamptz default now()
);

-- 3. Extend SECTION_OUTPUT with per-order tracking fields
alter table section_output add column if not exists order_id uuid references orders(id) on delete set null;
alter table section_output add column if not exists wip_received integer default 0;
alter table section_output add column if not exists wip_passed_out integer default 0;
alter table section_output add column if not exists remarks text;

-- 4. Extend SHIPMENT_MILESTONES with actuals
alter table shipment_milestones add column if not exists actual_date date;
alter table shipment_milestones add column if not exists qty_shipped integer default 0;
alter table shipment_milestones add column if not exists remarks text;
alter table shipment_milestones add column if not exists status text default 'pending'
  check (status in ('pending','completed','delayed'));

-- 5. DAILY LINE OUTPUT
create table if not exists daily_line_output (
  id               uuid primary key default gen_random_uuid(),
  date             date not null,
  line_pair_no     integer not null check (line_pair_no between 1 and 20),
  order_id         uuid references orders(id) on delete set null,
  target_pcs       integer not null default 0,
  actual_pcs       integer not null default 0,
  workers_present  integer default 0,
  downtime_hours   numeric(4,1) default 0,
  downtime_reason  text,
  remarks          text,
  created_at       timestamptz default now()
);

-- 6. RLS policies for new tables
alter table line_allocations enable row level security;
alter table daily_line_output enable row level security;

create policy "auth all on line_allocations"
  on line_allocations for all to authenticated using (true) with check (true);

create policy "auth all on daily_line_output"
  on daily_line_output for all to authenticated using (true) with check (true);
