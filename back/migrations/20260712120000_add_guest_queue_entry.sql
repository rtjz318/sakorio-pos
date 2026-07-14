-- Guest queue / waitlist entries for host stand and walk-in seating flow.
CREATE TABLE IF NOT EXISTS guest_queue_entry (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(64),
    party_size INTEGER NOT NULL,
    quoted_wait_minutes INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'waiting',
    source VARCHAR(32) NOT NULL DEFAULT 'staff_manual',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMP WITH TIME ZONE NULL,
    arrived_at TIMESTAMP WITH TIME ZONE NULL,
    seated_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    preferred_floor_id INTEGER NULL REFERENCES floor(id) ON DELETE SET NULL,
    preferred_table_size INTEGER NULL,
    notes TEXT NULL,
    linked_reservation_id INTEGER NULL REFERENCES reservation(id) ON DELETE SET NULL,
    seated_table_id INTEGER NULL REFERENCES "table"(id) ON DELETE SET NULL,
    seated_order_id INTEGER NULL REFERENCES "order"(id) ON DELETE SET NULL,
    cancel_reason TEXT NULL,
    created_by_user_id INTEGER NULL REFERENCES "user"(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_queue_entry_tenant ON guest_queue_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_queue_entry_tenant_status ON guest_queue_entry(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_queue_entry_requested_at ON guest_queue_entry(requested_at);
CREATE INDEX IF NOT EXISTS idx_guest_queue_entry_phone ON guest_queue_entry(customer_phone);
CREATE INDEX IF NOT EXISTS idx_guest_queue_entry_preferred_floor ON guest_queue_entry(preferred_floor_id);
CREATE INDEX IF NOT EXISTS idx_guest_queue_entry_seated_table ON guest_queue_entry(seated_table_id);
