-- Cashier-controlled tenant switch for customer QR self-payment.
-- Existing restaurants remain enabled until staff deliberately turn it off.
ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS customer_online_payment_enabled BOOLEAN NOT NULL DEFAULT TRUE;
