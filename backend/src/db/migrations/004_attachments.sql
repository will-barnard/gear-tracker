-- Photos and documents for items and bundles. Bytes live in brew-bucket; see
-- services/storage.js. sequelize.sync() may already have created this table
-- from the model on boot, so everything here is IF NOT EXISTS and the
-- constraints/indexes the model can't express are added separately.
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES bundles(id) ON DELETE CASCADE,
  kind varchar(16) NOT NULL,
  filename varchar(255) NOT NULL,
  content_type varchar(255) NOT NULL,
  size bigint NOT NULL,
  width integer,
  height integer,
  storage_key text NOT NULL,
  storage_hash varchar(64),
  thumb_key text,
  thumb_hash varchar(64),
  position integer NOT NULL DEFAULT 0,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attachments_one_owner') THEN
    ALTER TABLE attachments ADD CONSTRAINT attachments_one_owner
      CHECK ((item_id IS NOT NULL)::int + (bundle_id IS NOT NULL)::int = 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attachments_kind_check') THEN
    ALTER TABLE attachments ADD CONSTRAINT attachments_kind_check
      CHECK (kind IN ('photo', 'document'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS attachments_item_idx ON attachments (item_id, kind, position) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS attachments_bundle_idx ON attachments (bundle_id, kind, position) WHERE bundle_id IS NOT NULL;

-- Object deletes that failed because the NAS was asleep. A sweeper retries
-- them, so deleting an item never has to wait for the storage node.
CREATE TABLE IF NOT EXISTS pending_storage_deletes (
  storage_key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
