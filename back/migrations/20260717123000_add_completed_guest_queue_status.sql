-- Close a seated queue visit when the restaurant clears its table.
-- Migration-created databases store queue status as VARCHAR, while SQLModel
-- bootstrap/test databases may create a PostgreSQL enum for the same field.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'guestqueuestatus'
    ) THEN
        ALTER TYPE guestqueuestatus ADD VALUE IF NOT EXISTS 'completed';
    END IF;
END
$$;
