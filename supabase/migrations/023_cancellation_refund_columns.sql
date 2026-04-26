-- ============================================================
-- Migration 023: Add cancellation refund tracking columns to bookings
-- ============================================================

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ============================================================
-- DONE: Migration 023
-- ============================================================
