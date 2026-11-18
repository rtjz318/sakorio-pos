-- Audited receipt corrections. Original paid order/item values are preserved;
-- refunds and voids are append-only adjustment rows.
ALTER TABLE orderitem
    ADD COLUMN IF NOT EXISTS refunded_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orderitem
    DROP CONSTRAINT IF EXISTS ck_orderitem_refunded_quantity_nonnegative;

ALTER TABLE orderitem
    ADD CONSTRAINT ck_orderitem_refunded_quantity_nonnegative
    CHECK (refunded_quantity >= 0 AND refunded_quantity <= quantity);

CREATE TABLE IF NOT EXISTS receiptadjustment (
    tenant_id INTEGER NOT NULL REFERENCES tenant(id),
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES "order"(id),
    order_item_id INTEGER REFERENCES orderitem(id),
    adjustment_type VARCHAR(32) NOT NULL,
    quantity INTEGER,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(500) NOT NULL,
    created_by_user_id INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_receiptadjustment_amount_nonnegative CHECK (amount_cents >= 0),
    CONSTRAINT ck_receiptadjustment_quantity_positive CHECK (quantity IS NULL OR quantity > 0),
    CONSTRAINT ck_receiptadjustment_type CHECK (adjustment_type IN ('item_refund', 'receipt_void'))
);

CREATE INDEX IF NOT EXISTS ix_receiptadjustment_tenant_id
    ON receiptadjustment(tenant_id);
CREATE INDEX IF NOT EXISTS ix_receiptadjustment_order_id
    ON receiptadjustment(order_id);
CREATE INDEX IF NOT EXISTS ix_receiptadjustment_order_item_id
    ON receiptadjustment(order_item_id);
CREATE INDEX IF NOT EXISTS ix_receiptadjustment_adjustment_type
    ON receiptadjustment(adjustment_type);
CREATE INDEX IF NOT EXISTS ix_receiptadjustment_created_at
    ON receiptadjustment(created_at);
