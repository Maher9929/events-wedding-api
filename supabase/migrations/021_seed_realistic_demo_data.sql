-- ============================================================
-- DOUSHA Platform - Migration 021
-- Realistic demo data seed for presentations and local testing
-- ============================================================

-- Categories
INSERT INTO categories (id, name, description, icon, slug, sort_order, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Wedding Venues', 'Hotels, halls, and premium event venues', 'fa-building', 'wedding-venues', 1, true),
    ('10000000-0000-0000-0000-000000000002', 'Catering', 'Buffets, plated menus, and dessert tables', 'fa-utensils', 'catering', 2, true),
    ('10000000-0000-0000-0000-000000000003', 'Photography & Video', 'Photo, video, and cinematic coverage', 'fa-camera', 'photo-video', 3, true),
    ('10000000-0000-0000-0000-000000000004', 'Decoration', 'Floral setups, stage design, and styling', 'fa-wand-magic-sparkles', 'decoration', 4, true),
    ('10000000-0000-0000-0000-000000000005', 'Music & DJ', 'DJs, live bands, and entertainment', 'fa-music', 'music-dj', 5, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- User profiles
INSERT INTO user_profiles (id, email, full_name, phone, role, avatar_url, bio)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'demo.client@dousha.test', 'Sara Ben Salem', '+21620111222', 'client', NULL, 'Bride-to-be planning a premium wedding experience.'),
    ('20000000-0000-0000-0000-000000000002', 'demo.provider.venue@dousha.test', 'Yasmine Palace Team', '+97450101010', 'provider', NULL, 'Luxury venue specialists for weddings and private events.'),
    ('20000000-0000-0000-0000-000000000003', 'demo.provider.catering@dousha.test', 'Royal Catering', '+97450202020', 'provider', NULL, 'Upscale catering packages for weddings and corporate events.'),
    ('20000000-0000-0000-0000-000000000004', 'demo.provider.photo@dousha.test', 'Noor Studio', '+97450303030', 'provider', NULL, 'Wedding photography and storytelling video production.'),
    ('20000000-0000-0000-0000-000000000005', 'demo.admin@dousha.test', 'Platform Admin', '+21629999888', 'admin', NULL, 'Administration and moderation account for demos.')
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio;

-- Providers
INSERT INTO providers (
    id, user_id, company_name, description, address, city, region, country,
    website, is_verified, verification_date, rating_avg, review_count,
    min_price, max_price, max_capacity, categories, event_styles,
    portfolio_images, languages, years_experience, response_time_hours
)
VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        'Yasmine Palace',
        'Elegant ballroom venue for weddings, engagements, and family celebrations.',
        'West Bay Lagoon',
        'Doha',
        'Doha',
        'Qatar',
        'https://demo.dousha.test/yasmine-palace',
        true,
        NOW() - INTERVAL '120 days',
        4.8,
        36,
        12000,
        45000,
        450,
        ARRAY['wedding-venues'],
        ARRAY['classic', 'luxury', 'royal'],
        ARRAY[
            'https://images.unsplash.com/photo-1519167758481-83f550bb49b3',
            'https://images.unsplash.com/photo-1519741497674-611481863552'
        ],
        ARRAY['fr', 'ar', 'en'],
        9,
        2
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000003',
        'Royal Catering',
        'Premium buffet and plated dinner service with dessert stations and live cooking.',
        'Business District',
        'Doha',
        'Doha',
        'Qatar',
        'https://demo.dousha.test/royal-catering',
        true,
        NOW() - INTERVAL '90 days',
        4.6,
        22,
        90,
        260,
        600,
        ARRAY['catering'],
        ARRAY['modern', 'luxury', 'traditional'],
        ARRAY[
            'https://images.unsplash.com/photo-1555244162-803834f70033',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0'
        ],
        ARRAY['fr', 'ar', 'en'],
        7,
        4
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000004',
        'Noor Studio',
        'Full-day wedding photography, cinematic highlight reels, and social-ready edits.',
        'Lusail Marina',
        'Doha',
        'Doha',
        'Qatar',
        'https://demo.dousha.test/noor-studio',
        true,
        NOW() - INTERVAL '60 days',
        4.9,
        41,
        2500,
        12000,
        800,
        ARRAY['photo-video'],
        ARRAY['cinematic', 'editorial', 'romantic'],
        ARRAY[
            'https://images.unsplash.com/photo-1520854221256-17451cc331bf',
            'https://images.unsplash.com/photo-1505236858219-8359eb29e329'
        ],
        ARRAY['fr', 'ar', 'en'],
        6,
        3
    )
ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    region = EXCLUDED.region,
    country = EXCLUDED.country,
    website = EXCLUDED.website,
    is_verified = EXCLUDED.is_verified,
    verification_date = EXCLUDED.verification_date,
    rating_avg = EXCLUDED.rating_avg,
    review_count = EXCLUDED.review_count,
    min_price = EXCLUDED.min_price,
    max_price = EXCLUDED.max_price,
    max_capacity = EXCLUDED.max_capacity,
    categories = EXCLUDED.categories,
    event_styles = EXCLUDED.event_styles,
    portfolio_images = EXCLUDED.portfolio_images,
    languages = EXCLUDED.languages,
    years_experience = EXCLUDED.years_experience,
    response_time_hours = EXCLUDED.response_time_hours;

-- Services
INSERT INTO services (
    id, provider_id, category_id, title, description, short_description,
    price_type, base_price, currency, duration_minutes, min_capacity, max_capacity,
    location_type, service_area, requirements, inclusions, exclusions,
    additional_info, images, is_active, is_featured, availability_settings
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        (SELECT id FROM categories WHERE slug = 'wedding-venues'),
        'Royal Ballroom Wedding Package',
        'Luxury venue package including ballroom access, bridal suite, valet service, and VIP hosting support.',
        'Luxury ballroom for up to 450 guests.',
        'package',
        28000,
        'QAR',
        480,
        120,
        450,
        'onsite',
        'Doha and surrounding areas',
        ARRAY['Advance booking required', 'Final guest count 10 days before event'],
        ARRAY['Ballroom rental', 'Bridal suite', 'Lighting package', 'Reception setup'],
        ARRAY['Catering', 'Live entertainment'],
        'Best suited for premium weddings and engagement nights.',
        ARRAY[
            'https://images.unsplash.com/photo-1519167758481-83f550bb49b3',
            'https://images.unsplash.com/photo-1519741497674-611481863552'
        ],
        true,
        true,
        '{"weekends":"limited","lead_time_days":14}'::jsonb
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000002',
        (SELECT id FROM categories WHERE slug = 'catering'),
        'Premium Wedding Catering',
        'Full-service wedding catering with buffet, live stations, dessert corner, and service staff.',
        'Buffet and live cooking for upscale events.',
        'package',
        145,
        'QAR',
        300,
        80,
        600,
        'onsite',
        'Doha, Al Rayyan, Al Wakrah',
        ARRAY['Venue kitchen access', 'Final menu approval required'],
        ARRAY['Main buffet', 'Dessert station', 'Service team', 'Soft drinks'],
        ARRAY['Custom wedding cake', 'Premium imported beverages'],
        'Can be adapted for corporate dinners and family gatherings.',
        ARRAY[
            'https://images.unsplash.com/photo-1555244162-803834f70033',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0'
        ],
        true,
        true,
        '{"min_notice_days":7,"service_modes":["buffet","plated"]}'::jsonb
    ),
    (
        '40000000-0000-0000-0000-000000000003',
        '30000000-0000-0000-0000-000000000003',
        (SELECT id FROM categories WHERE slug = 'photo-video'),
        'Cinematic Wedding Story',
        'Photo and video package with two photographers, one videographer, teaser reel, and edited album.',
        'All-day photo and cinematic wedding coverage.',
        'package',
        6800,
        'QAR',
        720,
        50,
        800,
        'onsite',
        'Qatar',
        ARRAY['Shot list meeting one week before event'],
        ARRAY['Two photographers', 'One videographer', 'Edited gallery', 'Highlight reel'],
        ARRAY['Raw footage', 'Drone permit fees if needed'],
        'Popular for weddings, engagements, and destination shoots.',
        ARRAY[
            'https://images.unsplash.com/photo-1520854221256-17451cc331bf',
            'https://images.unsplash.com/photo-1505236858219-8359eb29e329'
        ],
        true,
        true,
        '{"delivery_days":14,"editing_style":"cinematic"}'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    price_type = EXCLUDED.price_type,
    base_price = EXCLUDED.base_price,
    currency = EXCLUDED.currency,
    duration_minutes = EXCLUDED.duration_minutes,
    min_capacity = EXCLUDED.min_capacity,
    max_capacity = EXCLUDED.max_capacity,
    location_type = EXCLUDED.location_type,
    service_area = EXCLUDED.service_area,
    requirements = EXCLUDED.requirements,
    inclusions = EXCLUDED.inclusions,
    exclusions = EXCLUDED.exclusions,
    additional_info = EXCLUDED.additional_info,
    images = EXCLUDED.images,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    availability_settings = EXCLUDED.availability_settings;

-- Event
INSERT INTO events (
    id, client_id, title, description, event_type, event_date, start_time, end_time,
    guest_count, budget, currency, venue_name, venue_address, venue_city, venue_region,
    requirements, special_requests, status, visibility
)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'Sara & Omar Wedding',
        'Premium wedding celebration with elegant floral decor and cinematic photo coverage.',
        'wedding',
        NOW() + INTERVAL '45 days',
        '18:00',
        '23:30',
        220,
        95000,
        'QAR',
        'Yasmine Palace Ballroom',
        'West Bay Lagoon, Doha',
        'Doha',
        'Doha',
        ARRAY['VIP welcome area', 'Women-only preparation room', 'Valet parking'],
        'Need a premium stage backdrop and soft live music during dinner.',
        'planning',
        'private'
    )
ON CONFLICT (id) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    event_date = EXCLUDED.event_date,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    guest_count = EXCLUDED.guest_count,
    budget = EXCLUDED.budget,
    currency = EXCLUDED.currency,
    venue_name = EXCLUDED.venue_name,
    venue_address = EXCLUDED.venue_address,
    venue_city = EXCLUDED.venue_city,
    venue_region = EXCLUDED.venue_region,
    requirements = EXCLUDED.requirements,
    special_requests = EXCLUDED.special_requests,
    status = EXCLUDED.status,
    visibility = EXCLUDED.visibility;

-- Budget items
INSERT INTO event_budgets (id, event_id, category, item_name, estimated_cost, actual_cost, paid_amount, notes)
VALUES
    ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Venue', 'Ballroom reservation', 28000, 28000, 14000, 'Deposit paid, balance due one week before event'),
    ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Catering', 'Dinner buffet for 220 guests', 31900, 0, 10000, 'Menu tasting completed'),
    ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Photography', 'Photo and video coverage', 6800, 0, 2000, 'Teaser reel requested')
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    category = EXCLUDED.category,
    item_name = EXCLUDED.item_name,
    estimated_cost = EXCLUDED.estimated_cost,
    actual_cost = EXCLUDED.actual_cost,
    paid_amount = EXCLUDED.paid_amount,
    notes = EXCLUDED.notes;

-- Tasks
INSERT INTO event_tasks (id, event_id, title, description, status, due_date, assigned_to)
VALUES
    ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Confirm guest list draft', 'Review families list and VIP guests before invitation design.', 'completed', NOW() + INTERVAL '5 days', 'Sara'),
    ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Approve catering menu', 'Validate starters, main dishes, and desserts with the caterer.', 'in_progress', NOW() + INTERVAL '10 days', 'Sara'),
    ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Finalize stage decoration', 'Choose floral palette and backdrop design.', 'pending', NOW() + INTERVAL '14 days', 'Decorator')
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    due_date = EXCLUDED.due_date,
    assigned_to = EXCLUDED.assigned_to;

-- Timeline
INSERT INTO event_timeline_items (id, event_id, start_time, end_time, activity, description, order_index)
VALUES
    ('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '17:30', '18:00', 'Guest arrival', 'Welcome drinks and hostess greeting at venue entrance.', 1),
    ('80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '18:15', '19:00', 'Wedding entrance and opening', 'Bride and groom entrance followed by opening speeches.', 2),
    ('80000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '20:00', '21:30', 'Dinner service', 'Buffet opens with live cooking station.', 3)
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    activity = EXCLUDED.activity,
    description = EXCLUDED.description,
    order_index = EXCLUDED.order_index;

-- Guests
INSERT INTO event_guests (id, event_id, name, email, phone, status, notes)
VALUES
    ('81000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Omar Ben Salem', 'omar@example.com', '+97455000111', 'confirmed', 'Groom side'),
    ('81000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Meriem Trabelsi', 'meriem@example.com', '+21655111222', 'confirmed', 'Bride cousin'),
    ('81000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Nour Haddad', NULL, '+97455000333', 'invited', 'Friend from university'),
    ('81000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 'Karim Mansour', 'karim@example.com', NULL, 'maybe', 'Travel confirmation pending')
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

-- Conversation
INSERT INTO conversations (id, participant_ids, last_message_at)
VALUES
    ('90000000-0000-0000-0000-000000000001', ARRAY['20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000003'::uuid], NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO UPDATE SET
    participant_ids = EXCLUDED.participant_ids,
    last_message_at = EXCLUDED.last_message_at;

-- Messages
INSERT INTO messages (id, conversation_id, sender_id, content, type, metadata, read_at, created_at)
VALUES
    ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Hello, can you confirm whether you have a live station package for 220 guests?', 'text', '{}'::jsonb, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '4 hours'),
    ('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Yes, we do. I can prepare a detailed quote with buffet, desserts, and staffing.', 'text', '{}'::jsonb, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO UPDATE SET
    conversation_id = EXCLUDED.conversation_id,
    sender_id = EXCLUDED.sender_id,
    content = EXCLUDED.content,
    type = EXCLUDED.type,
    metadata = EXCLUDED.metadata,
    read_at = EXCLUDED.read_at,
    created_at = EXCLUDED.created_at;

-- Quote
INSERT INTO quotes (
    id, conversation_id, provider_id, client_id, items, total_amount, status, valid_until,
    subtotal, discount_amount, tax_rate, tax_amount, notes, terms, items_json
)
VALUES
    (
        '92000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000001',
        '[{"name":"Premium buffet","quantity":220,"unit_price":145}]'::jsonb,
        31900,
        'sent',
        NOW() + INTERVAL '10 days',
        31900,
        0,
        0,
        0,
        'Includes service staff and standard dessert table.',
        '50% deposit to confirm the date.',
        '[{"name":"Premium buffet","quantity":220,"unit_price":145,"total":31900}]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET
    conversation_id = EXCLUDED.conversation_id,
    provider_id = EXCLUDED.provider_id,
    client_id = EXCLUDED.client_id,
    items = EXCLUDED.items,
    total_amount = EXCLUDED.total_amount,
    status = EXCLUDED.status,
    valid_until = EXCLUDED.valid_until,
    subtotal = EXCLUDED.subtotal,
    discount_amount = EXCLUDED.discount_amount,
    tax_rate = EXCLUDED.tax_rate,
    tax_amount = EXCLUDED.tax_amount,
    notes = EXCLUDED.notes,
    terms = EXCLUDED.terms,
    items_json = EXCLUDED.items_json;

-- Reviews
INSERT INTO reviews (id, service_id, client_id, rating, comment)
VALUES
    ('93000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 5, 'Very elegant venue, responsive team, and excellent reception flow.'),
    ('93000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 4, 'Strong menu variety and good organization during tasting.'),
    ('93000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 5, 'Beautiful edits and clear communication throughout the preparation.')
ON CONFLICT (service_id, client_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment;

-- Ensure booking payment status constraint matches the enhanced schema
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
UPDATE bookings
SET payment_status = CASE
    WHEN payment_status = 'paid' THEN 'fully_paid'
    WHEN payment_status = 'unpaid' THEN 'pending'
    WHEN payment_status = 'partially_paid' THEN 'deposit_paid'
    WHEN payment_status IS NULL THEN 'pending'
    ELSE payment_status
END;
UPDATE bookings
SET payment_status = 'pending'
WHERE payment_status NOT IN ('pending', 'deposit_paid', 'fully_paid', 'refunded');
ALTER TABLE bookings
ADD CONSTRAINT bookings_payment_status_check
CHECK (payment_status IN ('pending', 'deposit_paid', 'fully_paid', 'refunded'));

-- Booking
INSERT INTO bookings (
    id, event_id, service_id, client_id, provider_id, booking_date, status, amount,
    deposit_amount, payment_status, notes, start_time, end_time, provider_notes,
    client_notes, requirements, location, guest_count, deposit_percentage
)
VALUES
    (
        '94000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        NOW() + INTERVAL '45 days',
        'confirmed',
        28000,
        14000,
        'deposit_paid',
        'Venue reserved after contract signature.',
        '18:00',
        '23:30',
        'Venue team will open access from 14:00 for setup.',
        'Need valet service and VIP entrance.',
        ARRAY['Bridal suite', 'Premium lighting'],
        'Yasmine Palace Ballroom, Doha',
        220,
        50
    )
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    service_id = EXCLUDED.service_id,
    client_id = EXCLUDED.client_id,
    provider_id = EXCLUDED.provider_id,
    booking_date = EXCLUDED.booking_date,
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    deposit_amount = EXCLUDED.deposit_amount,
    payment_status = EXCLUDED.payment_status,
    notes = EXCLUDED.notes,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    provider_notes = EXCLUDED.provider_notes,
    client_notes = EXCLUDED.client_notes,
    requirements = EXCLUDED.requirements,
    location = EXCLUDED.location,
    guest_count = EXCLUDED.guest_count,
    deposit_percentage = EXCLUDED.deposit_percentage;

-- Payment record
INSERT INTO payment_records (
    id, booking_id, payment_intent_id, payment_type, amount, currency, status,
    stripe_fee, platform_fee, net_amount, receipt_url
)
VALUES
    (
        '95000000-0000-0000-0000-000000000001',
        '94000000-0000-0000-0000-000000000001',
        'pi_demo_venue_deposit_001',
        'deposit',
        14000,
        'QAR',
        'completed',
        420,
        280,
        13300,
        'https://demo.dousha.test/receipts/pi_demo_venue_deposit_001'
    )
ON CONFLICT (id) DO UPDATE SET
    booking_id = EXCLUDED.booking_id,
    payment_intent_id = EXCLUDED.payment_intent_id,
    payment_type = EXCLUDED.payment_type,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    stripe_fee = EXCLUDED.stripe_fee,
    platform_fee = EXCLUDED.platform_fee,
    net_amount = EXCLUDED.net_amount,
    receipt_url = EXCLUDED.receipt_url;
