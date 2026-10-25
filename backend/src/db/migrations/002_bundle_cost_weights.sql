-- Buy-bundle cost allocation used to live in items.purchase_price: "rebalance"
-- wrote each item's dollar share there, and every screen guessed "rebalanced"
-- from whether ANY item had a price. One hand-entered price made the whole
-- bundle look rebalanced, the other items cost $0, and the bundle stopped
-- adding up to what you paid.
--
-- Now an item stores a relative weight; the bundle price is split by weight
-- only when every item in the bundle has one, and evenly otherwise. Existing
-- per-item prices become weights, so a fully rebalanced bundle allocates
-- exactly as before — and keeps tracking if the bundle price changes later.
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_weight numeric(12,4);

UPDATE items
SET cost_weight = purchase_price, purchase_price = NULL
WHERE purchase_bundle_id IS NOT NULL
  AND purchase_price IS NOT NULL
  AND purchase_price > 0
  AND cost_weight IS NULL;

-- A bundled item's own price is ignored from here on; clear zeros/leftovers so
-- nothing downstream mistakes them for a real cost.
UPDATE items SET purchase_price = NULL
WHERE purchase_bundle_id IS NOT NULL AND purchase_price IS NOT NULL;
