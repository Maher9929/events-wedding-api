
-- ============================================================
-- ROBUST SEED DATA SCRIPT (V3 - SLUG CONFLICT FIXED)
-- ============================================================

BEGIN;

-- 1. Insert Core Categories
-- We handle conflict on SLUG to prevent duplicate key errors
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
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- 2. Create Test Provider Profile and Record
DO $$
DECLARE
    provider_user_id UUID := 'e0000000-0000-0000-0000-000000000000';
    actual_provider_id UUID;
    wedding_cat_id UUID;
BEGIN
    -- Get the actual ID of the weddings category (in case it was different)
    SELECT id INTO wedding_cat_id FROM categories WHERE slug = 'weddings' LIMIT 1;

    -- Ensure User Profile exists
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES (provider_user_id, 'provider@dousha.com', 'Test Provider', 'provider')
    ON CONFLICT (email) DO UPDATE SET role = 'provider';

    -- Ensure Provider record exists
    INSERT INTO providers (user_id, company_name, description, city, is_verified)
    VALUES (provider_user_id, 'Dousha Services', 'مزود خدمة تجريبي', 'الرباط', true)
    ON CONFLICT (user_id) DO UPDATE SET company_name = EXCLUDED.company_name
    RETURNING id INTO actual_provider_id;

    -- 3. Create Sample Service
    IF wedding_cat_id IS NOT NULL THEN
        INSERT INTO services (provider_id, category_id, title, description, base_price, currency, is_active)
        VALUES (actual_provider_id, wedding_cat_id, 'تنظيم حفل زفاف مغربي', 'تنظيم شامل لحفل زفافك مع مراعاة كافة التقاليد', 15000, 'MAD', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

COMMIT;

-- Final Verification
SELECT (SELECT count(*) FROM categories) as cat_count, 
       (SELECT count(*) FROM providers) as prov_count,
       (SELECT count(*) FROM services) as serv_count;
