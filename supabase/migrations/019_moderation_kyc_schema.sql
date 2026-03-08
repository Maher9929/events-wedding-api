-- Create moderation reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_type VARCHAR(20) NOT NULL CHECK (reported_type IN ('provider', 'service', 'review', 'user', 'booking', 'quote')),
    reported_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
    moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create moderation logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES moderation_reports(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'rejected', 'banned', 'suspended')),
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Create KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('id_card', 'business_license', 'tax_certificate', 'insurance', 'portfolio', 'other')),
    document_url TEXT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    rejection_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table if not exists (for moderation warnings)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter_id ON moderation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_type ON moderation_reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_created_at ON moderation_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_report_id ON moderation_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator_id ON moderation_logs(moderator_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_provider_id ON kyc_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_submitted_at ON kyc_documents(submitted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Add indexes for moderation fields
CREATE INDEX IF NOT EXISTS idx_providers_is_banned ON providers(is_banned);
CREATE INDEX IF NOT EXISTS idx_providers_is_suspended ON providers(is_suspended);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_moderation_status ON services(moderation_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_banned ON user_profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON reviews(is_hidden);
