-- Purchase/sale/cost dates were TIMESTAMPTZ. The app writes calendar dates
-- ("2026-03-05"), which landed as midnight UTC and rendered as the previous
-- day anywhere west of Greenwich. Convert them to DATE, reading each stored
-- instant back in UTC so the 5th stays the 5th.
--
-- Guarded on the current type so this is a no-op on a fresh database, where
-- sequelize.sync() already created these columns as DATE.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'purchase_date') = 'timestamp with time zone' THEN
    ALTER TABLE items ALTER COLUMN purchase_date TYPE date USING (purchase_date AT TIME ZONE 'UTC')::date;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'sale_date') = 'timestamp with time zone' THEN
    ALTER TABLE items ALTER COLUMN sale_date TYPE date USING (sale_date AT TIME ZONE 'UTC')::date;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'additional_costs' AND column_name = 'date') = 'timestamp with time zone' THEN
    ALTER TABLE additional_costs ALTER COLUMN date DROP DEFAULT;
    ALTER TABLE additional_costs ALTER COLUMN date TYPE date USING (date AT TIME ZONE 'UTC')::date;
    ALTER TABLE additional_costs ALTER COLUMN date SET DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- The old JS migration that copied bundle dates onto their items exported the
-- wrong shape and was silently skipped on every boot. Do its job once here.
UPDATE items i SET purchase_date = b.purchase_date
FROM bundles b
WHERE i.purchase_bundle_id = b.id AND b.purchase_date IS NOT NULL
  AND i.purchase_date IS DISTINCT FROM b.purchase_date;

UPDATE items i SET sale_date = b.sale_date
FROM bundles b
WHERE i.sale_bundle_id = b.id AND b.sale_date IS NOT NULL
  AND i.sale_date IS DISTINCT FROM b.sale_date;
