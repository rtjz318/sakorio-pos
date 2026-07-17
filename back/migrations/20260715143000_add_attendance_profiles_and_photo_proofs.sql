-- Scheduled attendance, employee profile, camera proof, and hourly pay support.

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(128),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS employment_start_date DATE,
    ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

ALTER TABLE "user"
    DROP CONSTRAINT IF EXISTS ck_user_hourly_rate_non_negative;
ALTER TABLE "user"
    ADD CONSTRAINT ck_user_hourly_rate_non_negative CHECK (hourly_rate_cents >= 0);

ALTER TABLE work_session
    ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shift(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_work_session_shift_id ON work_session(shift_id);

CREATE TABLE IF NOT EXISTS work_session_photo (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    work_session_id INTEGER NOT NULL REFERENCES work_session(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    proof_type VARCHAR(16) NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    content_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
    image_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_session_photo_type UNIQUE (work_session_id, proof_type),
    CONSTRAINT ck_work_session_photo_type CHECK (proof_type IN ('clock_in', 'clock_out'))
);

CREATE INDEX IF NOT EXISTS ix_work_session_photo_tenant_id ON work_session_photo(tenant_id);
CREATE INDEX IF NOT EXISTS ix_work_session_photo_work_session_id ON work_session_photo(work_session_id);
CREATE INDEX IF NOT EXISTS ix_work_session_photo_user_id ON work_session_photo(user_id);
CREATE INDEX IF NOT EXISTS ix_work_session_photo_proof_type ON work_session_photo(proof_type);
