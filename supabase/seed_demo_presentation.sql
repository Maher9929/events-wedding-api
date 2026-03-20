-- =========================================================================
-- SCRIPT DE DONNÉES DE DÉMONSTRATION (SEED) POUR LA SOUTENANCE DOUSHA
-- =========================================================================
-- Ce script insère des données très réalistes (en arabe) 
-- pour que la plateforme soit bien remplie lors de la démo.
-- =========================================================================

-- =========================================================================
-- 1. CRÉATION DES UTILISATEURS (user_profiles)
-- =========================================================================
-- L'ID de l'admin
INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url, phone) VALUES 
('11111111-1111-4111-a111-111111111111', 'admin@dousha.com', 'إدارة منصة دوشة', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', '+212600000000')
ON CONFLICT DO NOTHING;

-- Les IDs des prestataires
INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url, phone) VALUES 
('22222222-2222-4222-a222-222222222222', 'ahmed@photo.test', 'أحمد للتصوير', 'provider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=AhmedPhoto', '+212622222222'),
('33333333-3333-4333-a333-333333333333', 'salle@royal.test', 'قاعة الملكية', 'provider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Royal', '+212633333333'),
('44444444-4444-4444-a444-444444444444', 'contact@layalina.test', 'ليالينا للضيافة', 'provider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Catering', '+212644444444')
ON CONFLICT DO NOTHING;

-- Les IDs des clients
INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url, phone) VALUES 
('55555555-5555-4555-a555-555555555555', 'sarah@client.test', 'سارة عبدالرحمن', 'client', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', '+212655555555'),
('66666666-6666-4666-a666-666666666666', 'mohammed@client.test', 'محمد الدوسري', 'client', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mohammed', '+212666666666')
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 2. CRÉATION DES PROFILS PRESTATAIRES (providers)
-- =========================================================================
INSERT INTO public.providers (id, user_id, company_name, description, city, is_verified, rating_avg, review_count) VALUES 
('77777777-7777-4777-a777-777777777777', '22222222-2222-4222-a222-222222222222', 'عدسة النخبة للتصوير', 'متخصصون في تصوير حفلات الزفاف والفعاليات الكبرى بأحدث المعدات.', 'الرياض', true, 4.8, 124),
('88888888-8888-4888-a888-888888888888', '33333333-3333-4333-a333-333333333333', 'القصر الملكي للاحتفالات', 'قاعة فاخرة تتسع لـ 500 شخص مع خدمات ضيافة متكاملة.', 'جدة', true, 4.9, 89),
('99999999-9999-4999-a999-999999999999', '44444444-4444-4444-a444-444444444444', 'ليالينا لخدمات التموين', 'بوفيه مفتوح شرقي وغربي بلمسات عصرية.', 'الدمام', true, 4.7, 56)
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 3. CATÉGORIES (categories)
-- =========================================================================
-- We use DO UPDATE to ensure the categories exist with the right slugs so we can grab their IDs
INSERT INTO public.categories (slug, name, description, icon) VALUES 
('venues', 'قاعات الأفراح', 'قاعات ومساحات للفعاليات', 'fa-building-o'),
('photography', 'التصوير والمونتاج', 'مصورين محترفين فيديو وفوتوغرافي', 'fa-camera'),
('catering', 'خدمات الضيافة', 'بوفيه مفتوح وحلويات', 'fa-utensils'),
('decoration', 'تنسيق وديكور', 'كوش زفاف، ورد، وتجهيز قاعات', 'fa-fan')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;


-- =========================================================================
-- 4. SERVICES DES PRESTATAIRES
-- =========================================================================
INSERT INTO public.services (id, provider_id, category_id, title, description, base_price, location_type, is_active, images) VALUES 
-- Services Photographe (prov1)
('bbbb1111-1111-4111-a111-111111111111', '77777777-7777-4777-a777-777777777777', (SELECT id FROM public.categories WHERE slug = 'photography' LIMIT 1), 'باقة تصوير زفاف VIP', 'تغطية شاملة لليوم بالكامل بـ 3 كاميرات، ألبوم حراري فاخر، وتصوير درون.', 5000, 'onsite', true, 
 ARRAY['https://images.unsplash.com/photo-1532712938736-59c79dc7170c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']),
('bbbb2222-2222-4222-a222-222222222222', '77777777-7777-4777-a777-777777777777', (SELECT id FROM public.categories WHERE slug = 'photography' LIMIT 1), 'جلسة تصوير خطوبة', 'تصوير خارجي لمدة 3 ساعات، تسليم 30 صورة معدلة.', 1500, 'onsite', true, 
 ARRAY['https://images.unsplash.com/photo-1544928147-79a2dbc1f389?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']),

-- Services Salle (Venue) (prov2)
('bbbb3333-3333-4333-a333-333333333333', '88888888-8888-4888-a888-888888888888', (SELECT id FROM public.categories WHERE slug = 'venues' LIMIT 1), 'حجز القاعة الماسية', 'قاعة تتسع لـ 300 شخص شاملة أجهزة الصوت والإضاءة والكوشة.', 25000, 'onsite', true, 
 ARRAY['https://images.unsplash.com/photo-1519225421980-715cb0202128?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']),

-- Services Traiteur (Catering) (prov3)
('bbbb4444-4444-4444-a444-444444444444', '99999999-9999-4999-a999-999999999999', (SELECT id FROM public.categories WHERE slug = 'catering' LIMIT 1), 'بوفيه عشاء ملكي (للشخص)', 'تشكيلة واسعة من الأطباق العربية والعالمية مع ركن للحلويات والمشروبات.', 200, 'onsite', true, 
 ARRAY['https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'])
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 5. ÉVÉNEMENTS (Créés par les clients)
-- =========================================================================
INSERT INTO public.events (id, client_id, title, event_type, event_date, budget, guest_count, status, description) VALUES 
('cccc1111-1111-4111-a111-111111111111', '55555555-5555-4555-a555-555555555555', 'حفل زفاف سارة', 'wedding', '2026-08-15 19:00:00', 50000, 300, 'planning', 'أبحث عن قاعة وتصوير.'),
('cccc2222-2222-4222-a222-222222222222', '66666666-6666-4666-a666-666666666666', 'عشاء عمل سنوي', 'corporate', '2026-05-20 20:00:00', 15000, 100, 'confirmed', 'حفل للشركة يحتاج لضيافة ممتازة.')
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 6. DISCUSSIONS & MESSAGERIE (Conversations entre clients et user_profiles de prestataires)
-- =========================================================================
INSERT INTO public.conversations (id, participant_ids, created_at, updated_at, last_message_at) VALUES
('dddd1111-1111-4111-a111-111111111111', ARRAY['55555555-5555-4555-a555-555555555555', '22222222-2222-4222-a222-222222222222']::uuid[], current_timestamp, current_timestamp, current_timestamp)
ON CONFLICT DO NOTHING;

INSERT INTO public.messages (id, conversation_id, sender_id, content, created_at) VALUES
('eeee1111-1111-4111-a111-111111111111', 'dddd1111-1111-4111-a111-111111111111', '55555555-5555-4555-a555-555555555555', 'مرحباً، هل باقة التصوير VIP متاحة يوم 15 أغسطس؟', current_timestamp - interval '2 hours'),
('eeee2222-2222-4222-a222-222222222222', 'dddd1111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', 'أهلاً بك أستاذة سارة. نعم اليوم متاح، هل هناك تفاصيل معينة تفضلين إضافتها للباقة؟', current_timestamp - interval '1 hour')
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 7. RÉSERVATIONS (Bookings) - Devis et Confirmations
-- =========================================================================
INSERT INTO public.bookings (id, client_id, provider_id, service_id, event_id, status, amount, deposit_amount, payment_status, booking_date) VALUES 
-- Une réservation terminée et payée avec Traiteur
('ffff1111-1111-4111-a111-111111111111', '66666666-6666-4666-a666-666666666666', '44444444-4444-4444-a444-444444444444', 'bbbb4444-4444-4444-a444-444444444444', 'cccc2222-2222-4222-a222-222222222222', 'completed', 20000, 5000, 'paid', '2026-03-01 10:00:00'),

-- Une réservation confirmée (acompte payé) avec Salle
('ffff3333-3333-4333-a333-333333333333', '55555555-5555-4555-a555-555555555555', '33333333-3333-4333-a333-333333333333', 'bbbb3333-3333-4333-a333-333333333333', 'cccc1111-1111-4111-a111-111111111111', 'confirmed', 25000, 5000, 'pending', '2026-03-10 12:00:00')
ON CONFLICT DO NOTHING;

-- Rappel: Exécuter ce fichier depuis l'interface SQL de Supabase (SQL Editor)
