-- Dynamic attendance: planned shifts become optional and factual work sessions
-- carry their origin plus a client idempotency key.

ALTER TABLE work_session
    ADD COLUMN IF NOT EXISTS source VARCHAR(32),
    ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(96);

UPDATE work_session
SET source = CASE
    WHEN shift_id IS NOT NULL THEN 'legacy_planned'
    ELSE 'legacy_unscheduled'
END
WHERE source IS NULL OR BTRIM(source) = '';

ALTER TABLE work_session
    ALTER COLUMN source SET DEFAULT 'self_clock',
    ALTER COLUMN source SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_session_one_open_per_user
    ON work_session (tenant_id, user_id)
    WHERE ended_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_session_client_request
    ON work_session (tenant_id, user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_work_session_source
    ON work_session (tenant_id, source);
