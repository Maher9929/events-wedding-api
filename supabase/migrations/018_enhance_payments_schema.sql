-- Add payment tracking fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_intent_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC(5,2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS auto_refund_deadline TIMESTAMP WITH TIME ZONE;

-- Create payment_records table for detailed payment tracking
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    payment_intent_id VARCHAR(255) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('deposit', 'balance', 'full', 'refund')),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'QAR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    stripe_fee NUMERIC(12,2) DEFAULT 0,
    platform_fee NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(12,2) NOT NULL,
    receipt_url TEXT,
    refund_id VARCHAR(255),
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create refund_policies table
CREATE TABLE IF NOT EXISTS refund_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    deposit_refund_policy VARCHAR(20) NOT NULL CHECK (deposit_refund_policy IN ('full', 'partial', 'none')),
    deposit_refund_percentage NUMERIC(5,2) DEFAULT 0,
    balance_refund_policy VARCHAR(20) NOT NULL CHECK (balance_refund_policy IN ('full', 'partial', 'none')),
    balance_refund_percentage NUMERIC(5,2) DEFAULT 0,
    days_before_event_for_full_refund INTEGER DEFAULT 7,
    days_before_event_for_partial_refund INTEGER DEFAULT 3,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add refund_policy_id to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS refund_policy_id UUID REFERENCES refund_policies(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_records_booking_id ON payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_payment_intent_id ON payment_records(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON payment_records(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_ids ON bookings USING GIN(payment_intent_ids);
CREATE INDEX IF NOT EXISTS idx_bookings_auto_refund_deadline ON bookings(auto_refund_deadline);

-- Insert default refund policies
INSERT INTO refund_policies (name, description, deposit_refund_policy, deposit_refund_percentage, balance_refund_policy, balance_refund_percentage, days_before_event_for_full_refund, days_before_event_for_partial_refund, is_default) VALUES
('Standard', 'Politique de remboursement standard', 'partial', 50, 'full', 100, 7, 3, true),
('Strict', 'Politique de remboursement stricte', 'none', 0, 'partial', 50, 14, 7, false),
('Flexible', 'Politique de remboursement flexible', 'full', 100, 'full', 100, 3, 1, false)
ON CONFLICT DO NOTHING;

-- Update existing bookings to use default refund policy
UPDATE bookings 
SET refund_policy_id = (SELECT id FROM refund_policies WHERE is_default = true LIMIT 1)
WHERE refund_policy_id IS NULL;
