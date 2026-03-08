-- ============================================================
-- DOUSHA Platform - Migration 004
-- Ajustements pour respecter le cahier des charges à 100%
-- ============================================================

-- 1. Ajout des pièces jointes dans la messagerie (Section 2.4 du cahier des charges)
-- Permet d'envoyer des contrats, moodboards, inspirations dans le chat
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Système de paiement, Facturation et Commissions (Sections 2.5 et 2.8)
-- Gestion fine de l'acompte (deposit), du reste à payer (balance), du reçu et de la commission plateforme
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) DEFAULT 0;

-- 3. Politiques d'annulation (Section 2.5)
-- Chaque service peut définir ses conditions (flexible, modérée, stricte)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'flexible';

-- 4. Gestion des disponibilités / Calendrier prestataire (Section 2.6)
-- Permet aux prestataires de bloquer des dates/heures pour éviter les doubles réservations
CREATE TABLE IF NOT EXISTS provider_availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_blocked BOOLEAN DEFAULT false,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les recherches de calendrier
CREATE INDEX IF NOT EXISTS idx_availabilities_provider ON provider_availabilities(provider_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_date ON provider_availabilities(date);

-- Activer la sécurité RLS
ALTER TABLE provider_availabilities ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Tout le monde peut voir les disponibilités
CREATE POLICY "Availabilities are viewable by everyone" 
    ON provider_availabilities FOR SELECT 
    USING (true);

-- Politiques RLS : Seul le prestataire propriétaire peut gérer son calendrier
CREATE POLICY "Providers can manage their own availabilities" 
    ON provider_availabilities FOR ALL 
    USING (
        provider_id IN (
            SELECT id FROM providers WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        provider_id IN (
            SELECT id FROM providers WHERE user_id = auth.uid()
        )
    );

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_provider_availabilities_updated_at
    BEFORE UPDATE ON provider_availabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
