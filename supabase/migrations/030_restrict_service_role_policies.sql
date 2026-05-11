-- ============================================================
-- Migration 030: Restrict broad RLS policies to service_role
--
-- Older migrations created "Service role full access" policies without
-- an explicit TO service_role clause. Recreate them so anon/authenticated
-- browser clients cannot inherit broad table access.
-- ============================================================

ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON categories;
DROP POLICY IF EXISTS "Service role full access" ON providers;
DROP POLICY IF EXISTS "Service role full access" ON services;
DROP POLICY IF EXISTS "Service role full access" ON events;
DROP POLICY IF EXISTS "Service role full access" ON event_budgets;
DROP POLICY IF EXISTS "Service role full access" ON event_tasks;
DROP POLICY IF EXISTS "Service role full access" ON event_timeline_items;
DROP POLICY IF EXISTS "Service role full access" ON conversations;
DROP POLICY IF EXISTS "Service role full access" ON messages;
DROP POLICY IF EXISTS "Service role full access" ON quotes;
DROP POLICY IF EXISTS "Service role full access" ON reviews;
DROP POLICY IF EXISTS "Service role full access" ON bookings;
DROP POLICY IF EXISTS "Service role full access" ON notifications;
DROP POLICY IF EXISTS "Service role full access" ON favorites;
DROP POLICY IF EXISTS "Service role full access" ON promo_codes;
DROP POLICY IF EXISTS "Service role full access" ON event_guests;
DROP POLICY IF EXISTS "Service role full access" ON audit_logs;
DROP POLICY IF EXISTS "Service role full access" ON commissions;
DROP POLICY IF EXISTS "Service role full access" ON cancellation_policies;
DROP POLICY IF EXISTS "Service role full access" ON provider_kyc_documents;
DROP POLICY IF EXISTS "Service role full access" ON moderation_reports;
DROP POLICY IF EXISTS "Service role full access" ON moderation_logs;
DROP POLICY IF EXISTS "Service role full access" ON disputes;

CREATE POLICY "Service role full access" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON providers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON event_budgets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON event_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON event_timeline_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quotes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON favorites FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON promo_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON event_guests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON commissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON cancellation_policies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON provider_kyc_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON moderation_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON moderation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON disputes FOR ALL TO service_role USING (true) WITH CHECK (true);
