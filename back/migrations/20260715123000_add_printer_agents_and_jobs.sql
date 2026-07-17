-- Durable tenant-scoped printer agents and receipt jobs.
DO $$
BEGIN
    CREATE TYPE print_job_status AS ENUM ('pending', 'leased', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS printer_agent (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    kitchen_station_id INTEGER REFERENCES kitchen_station(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_printer_agent_tenant_id ON printer_agent(tenant_id);
CREATE INDEX IF NOT EXISTS ix_printer_agent_kitchen_station_id ON printer_agent(kitchen_station_id);
CREATE INDEX IF NOT EXISTS ix_printer_agent_active ON printer_agent(active);

CREATE TABLE IF NOT EXISTS print_job (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    kitchen_station_id INTEGER REFERENCES kitchen_station(id) ON DELETE SET NULL,
    job_type VARCHAR(32) NOT NULL DEFAULT 'kitchen_receipt',
    dedupe_key VARCHAR(160) NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    status print_job_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_token VARCHAR(64),
    leased_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_error VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_print_job_tenant_id ON print_job(tenant_id);
CREATE INDEX IF NOT EXISTS ix_print_job_order_id ON print_job(order_id);
CREATE INDEX IF NOT EXISTS ix_print_job_kitchen_station_id ON print_job(kitchen_station_id);
CREATE INDEX IF NOT EXISTS ix_print_job_job_type ON print_job(job_type);
CREATE INDEX IF NOT EXISTS ix_print_job_status ON print_job(status);
CREATE INDEX IF NOT EXISTS ix_print_job_lease_token ON print_job(lease_token);
CREATE INDEX IF NOT EXISTS ix_print_job_available_status ON print_job(tenant_id, status, available_at);
