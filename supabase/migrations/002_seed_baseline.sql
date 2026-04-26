-- ============================================================
-- BASELINE SEED DATA (002) - CORRECTED UUIDS
-- ============================================================

-- 1. Insert Core Categories
INSERT INTO categories (id, name, slug, description, icon, sort_order)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'حفلات زفاف', 'weddings', 'تخطيط وتنظيم حفلات الزفاف', 'fa-ring', 1),
    ('c0000000-0000-0000-0000-000000000002', 'طعام وضيافة', 'catering', 'خدمات البوفيه والتموين', 'fa-utensils', 2),
    ('c0000000-0000-0000-0000-000000000003', 'تصوير فوتوغرافي', 'photography', 'توثيق أجمل اللحظات', 'fa-camera', 3),
    ('c0000000-0000-0000-0000-000000000004', 'تجميل ومكياج', 'beauty', 'خدمات التجميل للعروس', 'fa-spray-can', 4),
    ('c0000000-0000-0000-0000-000000000005', 'ديكور وزهور', 'decor', 'تنسيق القاعات والزهور', 'fa-wand-sparkles', 5),
    ('c0000000-0000-0000-0000-000000000006', 'قاعات ومناسبات', 'venues', 'حجز أرقى القاعات', 'fa-building-columns', 6),
    ('c0000000-0000-0000-0000-000000000007', 'موسيقى وفرق', 'music', 'ترفيه وموسيقى حية', 'fa-music', 7),
    ('c0000000-0000-0000-0000-000000000008', 'أثاث وتجهيزات', 'furniture', 'تأجير أثاث المناسبات', 'fa-couch', 8)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,éc
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- 2. Insert Core Users into auth.users (Supabase Auth)
-- Password for all is 'Dousha2026!'
DO $$
DECLARE
    admin_id UUID := 'a0000000-0000-0000-0000-000000000000';
    provider_id UUID := 'e0000000-0000-0000-0000-000000000000'; -- Changed from 'p' to 'e'
    client_id UUID := 'c0000000-0000-0000-0000-000000000000';
    hashed_password TEXT := crypt('Dousha2026!', gen_salt('bf', 12));
BEGIN
    -- Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@dousha.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (admin_id, 'admin@dousha.com', hashed_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', 'authenticated', 'authenticated');
    END IF;

    -- Provider
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'provider@dousha.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (provider_id, 'provider@dousha.com', hashed_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Provider"}', 'authenticated', 'authenticated');
    END IF;

    -- Client
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'client@dousha.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (client_id, 'client@dousha.com', hashed_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Client"}', 'authenticated', 'authenticated');
    END IF;
END $$;

-- 3. Ensure User Profiles Exist
INSERT INTO user_profiles (id, email, full_name, role)
VALUES 
    ('a0000000-0000-0000-0000-000000000000', 'admin@dousha.com', 'Admin User', 'admin'),
    ('e0000000-0000-0000-0000-000000000000', 'provider@dousha.com', 'Test Provider', 'provider'),
    ('c0000000-0000-0000-0000-000000000000', 'client@dousha.com', 'Test Client', 'client')
ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 4. Create Provider Record for the test provider
INSERT INTO providers (id, user_id, company_name, description, city, is_verified)
VALUES (uuid_generate_v4(), 'e0000000-0000-0000-0000-000000000000', 'Dousha Services', 'مزود خدمة تجريبي', 'الدوحة', true)
ON CONFLICT (user_id) DO NOTHING;
