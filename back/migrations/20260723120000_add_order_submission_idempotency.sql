-- Migration 20260723120000: add order submission idempotency fields
-- Description: Protect public QR/staff table submissions from duplicate taps/retries.
-- Date: 2026-07-23 12:00:00

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS last_submission_key VARCHAR(128) DEFAULT NULL;

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS ix_order_last_submission_key
ON "order"(last_submission_key);
