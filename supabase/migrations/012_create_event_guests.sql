-- ============================================================
-- DOUSHA Platform - Migration 012
-- Table manquante : event_guests
-- ============================================================

CREATE TABLE IF NOT EXISTS event_guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined', 'maybe')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_guests_event ON event_guests(event_id);

ALTER TABLE event_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON event_guests;
CREATE POLICY "Service role full access" ON event_guests FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_event_guests ON event_guests;
CREATE TRIGGER set_updated_at_event_guests
    BEFORE UPDATE ON event_guests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
