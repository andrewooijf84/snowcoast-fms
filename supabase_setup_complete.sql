-- ============================================================
-- Snow Coast FMS — Complete Setup / Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run — all statements use IF NOT EXISTS / IF EXISTS
-- ============================================================

-- ── 1. RELAX NOT NULL CONSTRAINTS on orders ────────────────────────────────
-- The original schema required style, smv, start_date, end_date, ship_date.
-- The app now allows saving orders with only order_no + buyer filled in.
ALTER TABLE orders ALTER COLUMN style     DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN smv       DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN end_date   DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN ship_date  DROP NOT NULL;

-- ── 2. ADD v2 COLUMNS to orders ────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS season               text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS material_arrival_date date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cut_start_date        date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS emb_start_date        date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sew_start_date        date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completion_date       date;

-- ── 3. ADD v2 COLUMNS to section_output ────────────────────────────────────
ALTER TABLE section_output ADD COLUMN IF NOT EXISTS order_id      uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE section_output ADD COLUMN IF NOT EXISTS wip_received  integer DEFAULT 0;
ALTER TABLE section_output ADD COLUMN IF NOT EXISTS wip_passed_out integer DEFAULT 0;
ALTER TABLE section_output ADD COLUMN IF NOT EXISTS remarks       text;

-- ── 4. ADD v2 COLUMNS to shipment_milestones ────────────────────────────────
ALTER TABLE shipment_milestones ADD COLUMN IF NOT EXISTS actual_date  date;
ALTER TABLE shipment_milestones ADD COLUMN IF NOT EXISTS qty_shipped  integer DEFAULT 0;
ALTER TABLE shipment_milestones ADD COLUMN IF NOT EXISTS remarks      text;
ALTER TABLE shipment_milestones ADD COLUMN IF NOT EXISTS status       text DEFAULT 'pending'
  CHECK (status IN ('pending','completed','delayed'));

-- Also make milestone_date nullable (milestones may be added before dates are known)
ALTER TABLE shipment_milestones ALTER COLUMN milestone_date DROP NOT NULL;

-- ── 5. CREATE line_allocations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS line_allocations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_pair_no     integer NOT NULL CHECK (line_pair_no BETWEEN 1 AND 20),
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  allocated_qty    integer NOT NULL DEFAULT 0,
  target_daily_pcs integer NOT NULL DEFAULT 0,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE line_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'line_allocations' AND policyname = 'auth all on line_allocations'
  ) THEN
    CREATE POLICY "auth all on line_allocations"
      ON line_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 6. CREATE daily_line_output ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_line_output (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date             date NOT NULL,
  line_pair_no     integer NOT NULL CHECK (line_pair_no BETWEEN 1 AND 20),
  order_id         uuid REFERENCES orders(id) ON DELETE SET NULL,
  target_pcs       integer NOT NULL DEFAULT 0,
  actual_pcs       integer NOT NULL DEFAULT 0,
  workers_present  integer DEFAULT 0,
  downtime_hours   numeric(4,1) DEFAULT 0,
  downtime_reason  text,
  remarks          text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE daily_line_output ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_line_output' AND policyname = 'auth all on daily_line_output'
  ) THEN
    CREATE POLICY "auth all on daily_line_output"
      ON daily_line_output FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 7. INDEXES for common query patterns ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_section_output_order_section ON section_output(order_id, section);
CREATE INDEX IF NOT EXISTS idx_section_output_period_date   ON section_output(period_date DESC);
CREATE INDEX IF NOT EXISTS idx_line_allocations_order       ON line_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_daily_line_output_order_date ON daily_line_output(order_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_order             ON shipment_milestones(order_id, sort_order);

-- ── DONE ─────────────────────────────────────────────────────────────────────
-- Next step: create a login user in Supabase Dashboard → Authentication → Users
-- Use: email = admin@snowcoast.com, password = your-choice
-- Then set user_metadata.role = 'admin' via the dashboard or below RPC.
