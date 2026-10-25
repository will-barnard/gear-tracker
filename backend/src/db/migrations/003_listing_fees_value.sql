-- Keep-vs-flip, market value for keepers, listing details, and sale fees so
-- profit is net of what Reverb/eBay/shipping actually took.
ALTER TABLE items ADD COLUMN IF NOT EXISTS intent varchar(10) NOT NULL DEFAULT 'flip';
ALTER TABLE items ADD COLUMN IF NOT EXISTS estimated_value numeric(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS listing_platform varchar(40);
ALTER TABLE items ADD COLUMN IF NOT EXISTS listing_url text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS listed_at date;
ALTER TABLE items ADD COLUMN IF NOT EXISTS sale_fees numeric(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS sale_shipping numeric(10,2);

ALTER TABLE bundles ADD COLUMN IF NOT EXISTS sale_fees numeric(10,2);
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS sale_shipping numeric(10,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_intent_check') THEN
    ALTER TABLE items ADD CONSTRAINT items_intent_check CHECK (intent IN ('flip', 'keep'));
  END IF;
END $$;
