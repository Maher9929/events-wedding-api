-- ============================================================
-- Migration 026: Provider response rate tracking
-- ============================================================

ALTER TABLE providers
ADD COLUMN IF NOT EXISTS total_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_minutes INTEGER DEFAULT 0;

-- Backfill from existing bookings
UPDATE providers p SET
  total_requests = sub.total,
  total_responses = sub.responded,
  response_rate = CASE WHEN sub.total > 0 THEN ROUND((sub.responded::numeric / sub.total) * 100, 2) ELSE 0 END
FROM (
  SELECT provider_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'rejected', 'completed', 'cancelled')) AS responded
  FROM bookings
  GROUP BY provider_id
) sub
WHERE p.id = sub.provider_id;

-- ============================================================
-- DONE: Migration 026
-- ============================================================
