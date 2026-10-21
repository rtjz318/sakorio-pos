-- Follow-up is deliberately separate from the schema migration so deployments
-- that already applied 20261021120000 still mark every known legacy QA tenant.
UPDATE tenant
SET is_demo = TRUE,
    hitpay_mode = 'sandbox'
WHERE LOWER(BTRIM(name)) IN (
    'ajisen ramen',
    'ajisen ramen restaurant',
    'demo restaurant',
    'test'
);
