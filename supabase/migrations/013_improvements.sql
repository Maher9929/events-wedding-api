-- ============================================================
-- Migration 013: Platform Improvements
-- Adds: audit_logs, commissions, cancellation_policies, provider_kyc_documents
-- Updates: messages (attachments), services (cancellation_policy)
-- ============================================================

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,         -- e.g. 'booking.created', 'booking.cancelled', 'review.deleted'
    entity TEXT NOT NULL,         -- e.g. 'bookings', 'reviews', 'payments'
    entity_id TEXT,               -- ID of the affected record
    metadata JSONB DEFAULT '{}',  -- Extra context (old values, reason, etc.)
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,  -- 5% by default
    commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    net_payout NUMERIC(10,2) NOT NULL DEFAULT 0,         -- gross - commission
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_commissions_booking ON commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_provider ON commissions(provider_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON commissions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- CANCELLATION POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS cancellation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    notice_days INTEGER NOT NULL DEFAULT 7,         -- Days of notice required
    refund_percentage INTEGER NOT NULL DEFAULT 0 CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_policies_provider ON cancellation_policies(provider_id);

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON cancellation_policies FOR ALL USING (true) WITH CHECK (true);

-- Add cancellation_policy column directly on services (inline JSON for simplicity)
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{"notice_days": 7, "refund_percentage": 0, "description": ""}';

-- ============================================================
-- PROVIDER KYC DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'business_license', 'tax_certificate', 'bank_statement', 'other')),
    file_url TEXT NOT NULL,
    original_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_docs_provider ON provider_kyc_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_kyc_docs_status ON provider_kyc_documents(status);

ALTER TABLE provider_kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON provider_kyc_documents FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- MESSAGES — Add attachments column
-- ============================================================
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
-- Each attachment: { url, name, type, size }

-- ============================================================
-- APPLY updated_at TRIGGER to new tables
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['commissions', 'cancellation_policies', 'provider_kyc_documents']) LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON %I;
            CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$;

-- ============================================================
-- DONE: Migration 013
-- ============================================================
