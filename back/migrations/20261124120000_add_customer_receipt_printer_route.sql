-- Allow one station-scoped printer agent to also collect cashier/customer
-- receipts. This keeps preparation tickets routed by station while ensuring
-- stationless paid receipts have exactly one intended physical printer.
ALTER TABLE printer_agent
    ADD COLUMN IF NOT EXISTS receives_customer_receipts BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_printer_agent_receives_customer_receipts
    ON printer_agent (receives_customer_receipts);
