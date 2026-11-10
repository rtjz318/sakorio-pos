-- Tenant billing configuration and immutable order snapshots.
ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS service_charge_percent INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prices_include_tax BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "order"
    ADD COLUMN IF NOT EXISTS service_charge_percent_applied INTEGER,
    ADD COLUMN IF NOT EXISTS prices_include_tax_applied BOOLEAN;

-- Morinaga advertises menu prices before a 10% service charge and 9% GST.
INSERT INTO tax (tenant_id, name, rate_percent, valid_from, valid_to, created_at)
SELECT t.id, 'GST 9%', 9, DATE '2024-01-01', NULL, NOW()
FROM tenant t
WHERE LOWER(TRIM(t.name)) = 'morinaga ramen izakaya'
  AND NOT EXISTS (
      SELECT 1 FROM tax x
      WHERE x.tenant_id = t.id AND x.rate_percent = 9
        AND x.valid_from <= CURRENT_DATE
        AND (x.valid_to IS NULL OR x.valid_to >= CURRENT_DATE)
  );

UPDATE tenant t
SET service_charge_percent = 10,
    prices_include_tax = FALSE,
    default_tax_id = (
    SELECT x.id
    FROM tax x
    WHERE x.tenant_id = t.id AND x.rate_percent = 9
      AND valid_from <= CURRENT_DATE
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    ORDER BY valid_from DESC, id DESC
    LIMIT 1
)
WHERE LOWER(TRIM(t.name)) = 'morinaga ramen izakaya';
