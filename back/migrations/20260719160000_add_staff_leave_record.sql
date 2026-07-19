CREATE TABLE IF NOT EXISTS staff_leave_record (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id),
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    kind VARCHAR(32) NOT NULL DEFAULT 'annual_leave',
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    days DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    status VARCHAR(32) NOT NULL DEFAULT 'approved',
    notes VARCHAR(500),
    created_by_user_id INTEGER REFERENCES "user"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_staff_leave_record_tenant_id ON staff_leave_record (tenant_id);
CREATE INDEX IF NOT EXISTS ix_staff_leave_record_user_id ON staff_leave_record (user_id);
CREATE INDEX IF NOT EXISTS ix_staff_leave_record_kind ON staff_leave_record (kind);
CREATE INDEX IF NOT EXISTS ix_staff_leave_record_status ON staff_leave_record (status);
CREATE INDEX IF NOT EXISTS ix_staff_leave_record_date_range ON staff_leave_record (tenant_id, date_from, date_to);
