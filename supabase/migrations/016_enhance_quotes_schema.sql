-- Create quote_requests table for multi-provider quote requests
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    provider_ids UUID[] NOT NULL DEFAULT '{}',
    deadline TIMESTAMP WITH TIME ZONE,
    max_budget NUMERIC(12,2),
    event_type VARCHAR(100),
    event_date DATE,
    location TEXT,
    guest_count INTEGER,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhance quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS terms TEXT;

-- Update items structure to be JSONB for better flexibility
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]';

-- Migrate existing items array to JSONB if needed
UPDATE quotes SET items_json = items::jsonb WHERE items IS NOT NULL AND items_json = '[]';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_client_id ON quote_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_event_id ON quote_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_deadline ON quote_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_request_id ON quotes(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_provider_id ON quotes(provider_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
