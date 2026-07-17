-- Add a private customer tracking token to every queue entry.
ALTER TABLE guest_queue_entry
ADD COLUMN IF NOT EXISTS public_token VARCHAR(64);

UPDATE guest_queue_entry
SET public_token = md5(random()::text || clock_timestamp()::text || id::text)
WHERE public_token IS NULL OR public_token = '';

ALTER TABLE guest_queue_entry
ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ix_guest_queue_entry_public_token
ON guest_queue_entry (public_token);
