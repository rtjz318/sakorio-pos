-- One-time launch cleanup for production tenant 3 (Morinaga Ramen Izakaya).
--
-- Scope is deliberately narrow: operational order/sales rows and their direct
-- dependencies only. Restaurant configuration, products/images, tables and QR
-- tokens, reservations, queue entries, users, shifts, printer agents, and
-- inventory quantities remain in place.
--
-- The archive row is written in the same database transaction before deletion.
-- Re-running migrations is safe: the reset key makes this block a permanent no-op
-- after the first successful execution.

CREATE TABLE IF NOT EXISTS launch_sales_reset_backup (
    id BIGSERIAL PRIMARY KEY,
    reset_key VARCHAR(128) NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id),
    tenant_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    payload JSONB NOT NULL
);

DO $reset$
DECLARE
    v_tenant_id CONSTANT INTEGER := 3;
    v_tenant_name CONSTANT TEXT := 'Morinaga Ramen Izakaya';
    v_reset_key CONSTANT TEXT := 'morinaga-tenant-3-prelaunch-2026-11-19';
    v_table_count INTEGER;
    v_product_count INTEGER;
    v_floor_count INTEGER;
    v_reservation_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM tenant
        WHERE id = v_tenant_id
          AND name = v_tenant_name
    ) THEN
        RAISE NOTICE 'Morinaga launch reset skipped: exact tenant id/name was not found';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM launch_sales_reset_backup
        WHERE reset_key = v_reset_key
    ) THEN
        RAISE NOTICE 'Morinaga launch reset already completed; no changes made';
        RETURN;
    END IF;

    -- Serialize concurrent order creation while the pre-launch reset runs.
    PERFORM id
    FROM tenant
    WHERE id = v_tenant_id
    FOR UPDATE;

    PERFORM id
    FROM "order"
    WHERE tenant_id = v_tenant_id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_table_count FROM "table" WHERE tenant_id = v_tenant_id;
    SELECT COUNT(*) INTO v_product_count FROM product WHERE tenant_id = v_tenant_id;
    SELECT COUNT(*) INTO v_floor_count FROM floor WHERE tenant_id = v_tenant_id;
    SELECT COUNT(*) INTO v_reservation_count FROM reservation WHERE tenant_id = v_tenant_id;

    INSERT INTO launch_sales_reset_backup (
        reset_key,
        tenant_id,
        tenant_name,
        payload
    )
    VALUES (
        v_reset_key,
        v_tenant_id,
        v_tenant_name,
        jsonb_build_object(
            'format', 'sakorio-launch-sales-reset-backup-v1',
            'created_at', NOW(),
            'preserved_counts', jsonb_build_object(
                'tables', v_table_count,
                'products', v_product_count,
                'floors', v_floor_count,
                'reservations', v_reservation_count,
                'queue_entries', (SELECT COUNT(*) FROM guest_queue_entry WHERE tenant_id = v_tenant_id),
                'users', (SELECT COUNT(*) FROM "user" WHERE tenant_id = v_tenant_id),
                'printer_agents', (SELECT COUNT(*) FROM printer_agent WHERE tenant_id = v_tenant_id)
            ),
            'orders', COALESCE(
                (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id)
                 FROM "order" o
                 WHERE o.tenant_id = v_tenant_id),
                '[]'::jsonb
            ),
            'order_items', COALESCE(
                (SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.id)
                 FROM orderitem oi
                 WHERE oi.order_id IN (
                     SELECT id FROM "order" WHERE tenant_id = v_tenant_id
                 )),
                '[]'::jsonb
            ),
            'receipt_adjustments', COALESCE(
                (SELECT jsonb_agg(to_jsonb(ra) ORDER BY ra.id)
                 FROM receiptadjustment ra
                 WHERE ra.tenant_id = v_tenant_id),
                '[]'::jsonb
            ),
            'fiscal_invoices', COALESCE(
                (SELECT jsonb_agg(to_jsonb(fi) ORDER BY fi.id)
                 FROM fiscal_invoice fi
                 WHERE fi.tenant_id = v_tenant_id),
                '[]'::jsonb
            ),
            'print_jobs', COALESCE(
                (SELECT jsonb_agg(to_jsonb(pj) ORDER BY pj.id)
                 FROM print_job pj
                 WHERE pj.tenant_id = v_tenant_id),
                '[]'::jsonb
            ),
            'inventory_order_links', COALESCE(
                (SELECT jsonb_agg(to_jsonb(it) ORDER BY it.id)
                 FROM inventory_transaction it
                 WHERE it.tenant_id = v_tenant_id
                   AND it.order_id IN (
                       SELECT id FROM "order" WHERE tenant_id = v_tenant_id
                   )),
                '[]'::jsonb
            ),
            'table_session_state', COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', t.id,
                        'is_active', t.is_active,
                        'active_order_id', t.active_order_id,
                        'activated_at', t.activated_at
                    ) ORDER BY t.id
                 )
                 FROM "table" t
                 WHERE t.tenant_id = v_tenant_id),
                '[]'::jsonb
            ),
            'queue_order_links', COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object('id', q.id, 'seated_order_id', q.seated_order_id)
                    ORDER BY q.id
                 )
                 FROM guest_queue_entry q
                 WHERE q.tenant_id = v_tenant_id
                   AND q.seated_order_id IS NOT NULL),
                '[]'::jsonb
            )
        )
    );

    -- Preserve stock quantities and immutable inventory audit. Only detach the
    -- foreign key to the pre-launch order that is about to be removed.
    UPDATE inventory_transaction
    SET order_id = NULL
    WHERE tenant_id = v_tenant_id
      AND order_id IN (
          SELECT id FROM "order" WHERE tenant_id = v_tenant_id
      );

    UPDATE guest_queue_entry
    SET seated_order_id = NULL
    WHERE tenant_id = v_tenant_id
      AND seated_order_id IN (
          SELECT id FROM "order" WHERE tenant_id = v_tenant_id
      );

    UPDATE "table"
    SET active_order_id = NULL,
        is_active = FALSE,
        activated_at = NULL
    WHERE tenant_id = v_tenant_id;

    DELETE FROM receiptadjustment WHERE tenant_id = v_tenant_id;
    DELETE FROM fiscal_invoice WHERE tenant_id = v_tenant_id;
    DELETE FROM print_job WHERE tenant_id = v_tenant_id;

    DELETE FROM orderitem
    WHERE order_id IN (
        SELECT id FROM "order" WHERE tenant_id = v_tenant_id
    );

    DELETE FROM "order" WHERE tenant_id = v_tenant_id;

    IF EXISTS (SELECT 1 FROM "order" WHERE tenant_id = v_tenant_id)
       OR EXISTS (
           SELECT 1 FROM orderitem
           WHERE order_id IN (SELECT id FROM "order" WHERE tenant_id = v_tenant_id)
       )
       OR EXISTS (SELECT 1 FROM receiptadjustment WHERE tenant_id = v_tenant_id)
       OR EXISTS (SELECT 1 FROM fiscal_invoice WHERE tenant_id = v_tenant_id)
       OR EXISTS (SELECT 1 FROM print_job WHERE tenant_id = v_tenant_id)
       OR EXISTS (
           SELECT 1 FROM inventory_transaction
           WHERE tenant_id = v_tenant_id AND order_id IS NOT NULL
       )
       OR EXISTS (
           SELECT 1 FROM guest_queue_entry
           WHERE tenant_id = v_tenant_id AND seated_order_id IS NOT NULL
       )
       OR EXISTS (
           SELECT 1 FROM "table"
           WHERE tenant_id = v_tenant_id
             AND (active_order_id IS NOT NULL OR is_active = TRUE OR activated_at IS NOT NULL)
       ) THEN
        RAISE EXCEPTION 'Morinaga launch reset verification failed; rolling back';
    END IF;

    IF (SELECT COUNT(*) FROM "table" WHERE tenant_id = v_tenant_id) <> v_table_count
       OR (SELECT COUNT(*) FROM product WHERE tenant_id = v_tenant_id) <> v_product_count
       OR (SELECT COUNT(*) FROM floor WHERE tenant_id = v_tenant_id) <> v_floor_count
       OR (SELECT COUNT(*) FROM reservation WHERE tenant_id = v_tenant_id) <> v_reservation_count THEN
        RAISE EXCEPTION 'Preserved Morinaga configuration changed; rolling back';
    END IF;

    UPDATE launch_sales_reset_backup
    SET completed_at = NOW()
    WHERE reset_key = v_reset_key;
END
$reset$;
