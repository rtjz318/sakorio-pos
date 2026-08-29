-- Stable tenant-local daily queue numbers with atomic allocation and monotonic versions.
-- The trigger protects every insert path, including maintenance scripts and legacy callers.

ALTER TABLE guest_queue_entry
    ADD COLUMN IF NOT EXISTS service_date DATE,
    ADD COLUMN IF NOT EXISTS queue_number INTEGER,
    ADD COLUMN IF NOT EXISTS status_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS guest_queue_counter (
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number >= 1),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, service_date)
);

-- Backfill the service date in each restaurant's configured timezone. Invalid or empty
-- legacy timezone values fall back to UTC so migration remains recoverable.
UPDATE guest_queue_entry AS q
SET service_date = (
    q.requested_at AT TIME ZONE CASE
        WHEN t.timezone IS NULL OR BTRIM(t.timezone) = '' THEN 'UTC'
        WHEN EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = t.timezone) THEN t.timezone
        ELSE 'UTC'
    END
)::DATE
FROM tenant AS t
WHERE t.id = q.tenant_id
  AND q.service_date IS NULL;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, service_date
            ORDER BY requested_at ASC, id ASC
        )::INTEGER AS allocated_number
    FROM guest_queue_entry
    WHERE queue_number IS NULL
)
UPDATE guest_queue_entry AS q
SET queue_number = ranked.allocated_number
FROM ranked
WHERE ranked.id = q.id;

INSERT INTO guest_queue_counter (tenant_id, service_date, next_number, updated_at)
SELECT tenant_id, service_date, MAX(queue_number) + 1, NOW()
FROM guest_queue_entry
GROUP BY tenant_id, service_date
ON CONFLICT (tenant_id, service_date) DO UPDATE
SET next_number = GREATEST(guest_queue_counter.next_number, EXCLUDED.next_number),
    updated_at = NOW();

CREATE OR REPLACE FUNCTION allocate_guest_queue_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    tenant_timezone TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW IS DISTINCT FROM OLD THEN
            NEW.status_version := OLD.status_version + 1;
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.service_date IS NULL THEN
        SELECT CASE
            WHEN t.timezone IS NULL OR BTRIM(t.timezone) = '' THEN 'UTC'
            WHEN EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = t.timezone) THEN t.timezone
            ELSE 'UTC'
        END
        INTO tenant_timezone
        FROM tenant AS t
        WHERE t.id = NEW.tenant_id;

        NEW.service_date := (
            COALESCE(NEW.requested_at, NOW()) AT TIME ZONE COALESCE(tenant_timezone, 'UTC')
        )::DATE;
    END IF;

    IF NEW.queue_number IS NULL THEN
        INSERT INTO guest_queue_counter (tenant_id, service_date, next_number, updated_at)
        VALUES (NEW.tenant_id, NEW.service_date, 2, NOW())
        ON CONFLICT (tenant_id, service_date) DO UPDATE
        SET next_number = guest_queue_counter.next_number + 1,
            updated_at = NOW()
        RETURNING next_number - 1 INTO NEW.queue_number;
    END IF;

    NEW.status_version := COALESCE(NEW.status_version, 1);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guest_queue_identity ON guest_queue_entry;
CREATE TRIGGER trg_guest_queue_identity
BEFORE INSERT OR UPDATE ON guest_queue_entry
FOR EACH ROW
EXECUTE FUNCTION allocate_guest_queue_identity();

ALTER TABLE guest_queue_entry
    ALTER COLUMN service_date SET NOT NULL,
    ALTER COLUMN queue_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_queue_tenant_service_number
    ON guest_queue_entry (tenant_id, service_date, queue_number);
CREATE INDEX IF NOT EXISTS idx_guest_queue_tenant_service_status
    ON guest_queue_entry (tenant_id, service_date, status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_guest_queue_number_positive'
    ) THEN
        ALTER TABLE guest_queue_entry
            ADD CONSTRAINT ck_guest_queue_number_positive CHECK (queue_number >= 1);
    END IF;
END
$$;
