-- Explicitly distinguish demonstration restaurants from production tenants.
-- Existing Ajisen data is the known demonstration tenant and must never be
-- mistaken for a live restaurant during shared-server operation.
ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_tenant_is_demo ON tenant (is_demo);

UPDATE tenant
SET is_demo = TRUE,
    hitpay_mode = 'sandbox'
WHERE LOWER(BTRIM(name)) IN (
    'ajisen ramen',
    'ajisen ramen restaurant',
    'demo restaurant'
);
