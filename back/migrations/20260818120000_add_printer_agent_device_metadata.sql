-- Printer bridge metadata for native iPad / XP-80T / Bluetooth rollout.
ALTER TABLE printer_agent
ADD COLUMN IF NOT EXISTS device_type VARCHAR(32) NOT NULL DEFAULT 'local_agent',
ADD COLUMN IF NOT EXISTS transport VARCHAR(32) NOT NULL DEFAULT 'network',
ADD COLUMN IF NOT EXISTS app_version VARCHAR(64);

CREATE INDEX IF NOT EXISTS ix_printer_agent_device_type ON printer_agent(device_type);
CREATE INDEX IF NOT EXISTS ix_printer_agent_transport ON printer_agent(transport);
