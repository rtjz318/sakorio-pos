-- Move the requested production owner email from the retired Ajisen demo account
-- to the existing Morinaga owner account without moving or deleting either
-- tenant's historical operational data.
--
-- This migration is intentionally idempotent because deployment repair runs may
-- execute every migration again. The former Ajisen owner is retained as a locked
-- historical record under a reserved, non-deliverable address. Incrementing both
-- token versions immediately invalidates any sessions issued before the transfer.
DO $$
DECLARE
    morinaga_tenant_id INTEGER;
    requested_owner_id INTEGER;
    requested_owner_tenant_id INTEGER;
    morinaga_owner_id INTEGER;
    morinaga_owner_tenant_id INTEGER;
BEGIN
    SELECT id
    INTO morinaga_tenant_id
    FROM tenant
    WHERE LOWER(BTRIM(name)) = 'morinaga ramen izakaya'
    ORDER BY id
    LIMIT 1;

    IF morinaga_tenant_id IS NULL THEN
        -- Development, test and fresh-install databases legitimately do not
        -- contain the production Morinaga tenant. This production-only data
        -- repair must not block later schema migrations in those databases.
        RETURN;
    END IF;

    SELECT id, tenant_id
    INTO requested_owner_id, requested_owner_tenant_id
    FROM "user"
    WHERE LOWER(BTRIM(email)) = 'ricktan318@hotmail.com'
    LIMIT 1;

    SELECT id, tenant_id
    INTO morinaga_owner_id, morinaga_owner_tenant_id
    FROM "user"
    WHERE LOWER(BTRIM(email)) = 'ricktan318+morinaga@hotmail.com'
    LIMIT 1;

    -- The desired final state already exists. This makes sync-idempotent safe.
    IF requested_owner_id IS NOT NULL
       AND requested_owner_tenant_id = morinaga_tenant_id
       AND morinaga_owner_id IS NULL THEN
        RETURN;
    END IF;

    IF requested_owner_id IS NULL THEN
        RAISE EXCEPTION 'Existing ricktan318@hotmail.com account is missing; owner email transfer aborted';
    END IF;

    IF requested_owner_tenant_id = morinaga_tenant_id THEN
        RAISE EXCEPTION 'Morinaga already owns ricktan318@hotmail.com but the alias account still exists';
    END IF;

    IF morinaga_owner_id IS NULL OR morinaga_owner_tenant_id <> morinaga_tenant_id THEN
        RAISE EXCEPTION 'Expected Morinaga owner alias account is missing or belongs to another tenant';
    END IF;

    UPDATE "user"
    SET email = 'retired-ajisen-owner-' || id || '@sakario.invalid',
        token_version = token_version + 1,
        otp_enabled = FALSE,
        otp_secret = NULL
    WHERE id = requested_owner_id;

    UPDATE "user"
    SET email = 'ricktan318@hotmail.com',
        token_version = token_version + 1
    WHERE id = morinaga_owner_id;
END $$;
