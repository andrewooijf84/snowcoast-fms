-- ============================================================
-- Snow Coast FMS — Order Portions Migration
-- Run this ENTIRE script in your Supabase SQL Editor.
-- Run BEFORE deploying the new app code.
-- ============================================================

-- STEP 1: Create order_portions table
CREATE TABLE IF NOT EXISTS order_portions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  portion_name text not null default 'Full order',
  portion_qty integer not null default 0,
  sort_order integer default 1,
  date_material_arrival date,
  date_cut_start date,
  date_emb_start date,
  date_sew_start date,
  date_completion date,
  date_exfactory date,
  status text default 'pending'
    check (status in ('pending','in-production','completed','shipped','cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_portions_order ON order_portions(order_id);

-- STEP 2: Migrate existing orders → one "Full order" portion each
-- (uses actual orders table column names: qty, material_arrival_date, etc.)
INSERT INTO order_portions (
  order_id, portion_name, portion_qty, sort_order,
  date_material_arrival, date_cut_start, date_emb_start,
  date_sew_start, date_completion, date_exfactory,
  status
)
SELECT
  id,
  'Full order',
  COALESCE(qty, 0),
  1,
  material_arrival_date,
  cut_start_date,
  emb_start_date,
  sew_start_date,
  completion_date,
  ship_date,
  CASE
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'active'    THEN 'in-production'
    ELSE 'pending'
  END
FROM orders
WHERE id NOT IN (
  SELECT DISTINCT order_id
  FROM order_portions
  WHERE order_id IS NOT NULL
);

-- STEP 3: Add portion_id to line_allocations
ALTER TABLE line_allocations
  ADD COLUMN IF NOT EXISTS portion_id uuid
    references order_portions(id) on delete set null;

-- STEP 4: Add portion_id to shipment_milestones
ALTER TABLE shipment_milestones
  ADD COLUMN IF NOT EXISTS portion_id uuid
    references order_portions(id) on delete cascade;

-- STEP 5: Link existing line_allocations to their "Full order" portion
UPDATE line_allocations la
SET portion_id = op.id
FROM order_portions op
WHERE la.order_id = op.order_id
  AND la.portion_id IS NULL
  AND op.portion_name = 'Full order';

-- STEP 6: Link existing shipment_milestones to their "Full order" portion
UPDATE shipment_milestones sm
SET portion_id = op.id
FROM order_portions op
WHERE sm.order_id = op.order_id
  AND sm.portion_id IS NULL
  AND op.portion_name = 'Full order';

-- ── Verification queries (run these to confirm success) ──
-- SELECT count(*) as total_portions FROM order_portions;
-- SELECT count(*) as alloc_linked   FROM line_allocations WHERE portion_id IS NOT NULL;
-- SELECT count(*) as ms_linked      FROM shipment_milestones WHERE portion_id IS NOT NULL;
-- SELECT o.order_no, op.portion_name, op.portion_qty FROM orders o JOIN order_portions op ON op.order_id = o.id ORDER BY o.order_no LIMIT 20;
