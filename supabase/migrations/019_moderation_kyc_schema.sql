-- ============================================================
-- Migration 019: Moderation Schema Enhancements
-- Creates: moderation_reports, moderation_logs
-- Updates: providers, services, user_profiles, reviews (moderation fields)
-- NOTE: KYC table (provider_kyc_documents) already created in 013_improvements.sql
-- NOTE: notifications table already created in 005_missing_tables.sql
-- ============================================================

-- Create moderation reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    reported_type VARCHAR(20) NOT NULL CHECK (reported_type IN ('provider', 'service', 'review', 'user', 'booking', 'quote')),
    reported_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
    moderator_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create moderation logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES moderation_reports(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'ban', 'suspend', 'warn')),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add moderation fields to existing tables
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspend_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- NOTE: kyc_documents table is NOT created here.
-- The backend uses 'provider_kyc_documents' which was created in 013_improvements.sql.

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter_id ON moderation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_type ON moderation_reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_created_at ON moderation_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_report_id ON moderation_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator_id ON moderation_logs(moderator_id);

-- Indexes for moderation fields on existing tables
CREATE INDEX IF NOT EXISTS idx_providers_is_banned ON providers(is_banned);
CREATE INDEX IF NOT EXISTS idx_providers_is_suspended ON providers(is_suspended);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_moderation_status ON services(moderation_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_banned ON user_profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON reviews(is_hidden);

-- Apply updated_at trigger to new tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['moderation_reports']) LOOP
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

-- Enable RLS on new tables
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON moderation_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON moderation_logs FOR ALL USING (true) WITH CHECK (true);
