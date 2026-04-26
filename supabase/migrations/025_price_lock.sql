-- ============================================================
-- Migration 025: Price lock — store the service price at booking time
-- ============================================================

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS locked_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS locked_price_type VARCHAR(20);

-- Backfill existing bookings: set locked_price = amount
UPDATE bookings SET locked_price = amount WHERE locked_price IS NULL;

-- ============================================================
-- DONE: Migration 025
-- ============================================================
