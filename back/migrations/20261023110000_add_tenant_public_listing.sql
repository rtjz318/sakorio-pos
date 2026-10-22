-- Allow retired demos and QA tenants to stay accessible by direct URL without
-- appearing on the public restaurant picker.
ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS is_publicly_listed BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS ix_tenant_is_publicly_listed
    ON tenant (is_publicly_listed);

-- The legacy tenant literally named "test" is not a customer-facing venue.
-- Keep its records for QA/history, but remove it from public discovery.
UPDATE tenant
SET is_publicly_listed = FALSE
WHERE LOWER(TRIM(name)) = 'test'
  AND is_demo = TRUE;
