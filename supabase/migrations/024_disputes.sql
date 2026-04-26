-- ============================================================
-- Migration 024: Disputes / Arbitration System
-- ============================================================

CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES user_profiles(id),
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'service_not_delivered',
        'quality_issue',
        'late_arrival',
        'wrong_service',
        'overcharged',
        'provider_no_show',
        'other'
    )),
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
    resolution VARCHAR(20) CHECK (resolution IN ('refund_full', 'refund_partial', 'no_refund', 'redo_service', 'dismissed')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES user_profiles(id),
    resolved_at TIMESTAMPTZ,
    provider_response TEXT,
    provider_responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON disputes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE: Migration 024
-- ============================================================
