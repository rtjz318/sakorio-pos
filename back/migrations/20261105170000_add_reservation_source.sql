ALTER TABLE reservation
    ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS ix_reservation_source ON reservation (source);
