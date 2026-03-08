-- ============================================================
-- DOUSHA Platform - Migration 005
-- Tables manquantes : notifications, favorites, promo_codes
-- + colonne payment_intent_id sur bookings
-- ============================================================

-- 1. NOTIFICATIONS
-- Système de notifications in-app (Section 2.7 du cahier des charges)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON notifications;
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_notifications ON notifications;
CREATE TRIGGER set_updated_at_notifications
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. FAVORITES (Wishlist / المفضلة)
-- Permet aux clients de sauvegarder des services favoris
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_service ON favorites(service_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON favorites;
CREATE POLICY "Service role full access" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- 3. PROMO CODES (Codes promotionnels)
-- Permet aux prestataires de créer des codes de réduction
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_provider ON promo_codes(provider_id);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON promo_codes;
CREATE POLICY "Service role full access" ON promo_codes FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_promo_codes ON promo_codes;
CREATE TRIGGER set_updated_at_promo_codes
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Colonne manquante : payment_intent_id sur bookings
-- Stocke l'ID du PaymentIntent Stripe pour l'idempotence
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(payment_intent_id);
