-- Add advanced fields to providers table for better filtering
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS min_price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_price NUMERIC(12,2) DEFAULT 999999,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS event_styles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{fr,ar}',
ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_providers_categories ON providers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_providers_event_styles ON providers USING GIN(event_styles);
CREATE INDEX IF NOT EXISTS idx_providers_min_price ON providers(min_price);
CREATE INDEX IF NOT EXISTS idx_providers_max_price ON providers(max_price);
CREATE INDEX IF NOT EXISTS idx_providers_max_capacity ON providers(max_capacity);
