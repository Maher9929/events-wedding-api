
-- Baseline Seed Data For Categories
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
