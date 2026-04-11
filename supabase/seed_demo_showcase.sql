-- ============================================================================
-- DOUSHA - Demo seed for jury / showcase presentation
-- UTF-8 friendly and aligned with the current professional schema
-- Apply from Supabase SQL editor after migrations.
-- ============================================================================

INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url, phone)
VALUES
  ('11111111-1111-4111-a111-111111111111', 'admin@dousha.com', 'Admin Dousha', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminDousha', '+21620000000'),
  ('22222222-2222-4222-a222-222222222222', 'photographer@dousha.com', 'Studio Noor', 'provider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=StudioNoor', '+21621111111'),
  ('33333333-3333-4333-a333-333333333333', 'venue@dousha.com', 'Palais Jasmine', 'provider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=PalaisJasmine', '+21622222222'),
  ('44444444-4444-4444-a444-444444444444', 'catering@dousha.com', 'Saveurs Majestiques', 'provider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=SaveursMajestiques', '+21623333333'),
  ('55555555-5555-4555-a555-555555555555', 'client.salma@dousha.com', 'Salma Ben Amor', 'client', 'https://api.dicebear.com/7.x/avataaars/svg?seed=SalmaBenAmor', '+21624444444'),
  ('66666666-6666-4666-a666-666666666666', 'client.youssef@dousha.com', 'Youssef Trabelsi', 'client', 'https://api.dicebear.com/7.x/avataaars/svg?seed=YoussefTrabelsi', '+21625555555')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.providers (id, user_id, company_name, description, city, region, country, is_verified, rating_avg, review_count)
VALUES
  ('77777777-7777-4777-a777-777777777777', '22222222-2222-4222-a222-222222222222', 'Studio Noor', 'Wedding and luxury event photography with premium albums and drone shots.', 'Tunis', 'Tunis', 'Tunisia', true, 4.8, 124),
  ('88888888-8888-4888-a888-888888888888', '33333333-3333-4333-a333-333333333333', 'Palais Jasmine', 'High-end venue for weddings, engagements and corporate celebrations.', 'Sousse', 'Sousse', 'Tunisia', true, 4.9, 87),
  ('99999999-9999-4999-a999-999999999999', '44444444-4444-4444-a444-444444444444', 'Saveurs Majestiques', 'Refined catering with buffet, dessert corner and premium service staff.', 'Monastir', 'Monastir', 'Tunisia', true, 4.7, 63)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (slug, name, description, icon)
VALUES
  ('venues', 'Wedding Venues', 'Venues and reception spaces', 'fa-building-o'),
  ('photography', 'Photography & Video', 'Photo and video services', 'fa-camera'),
  ('catering', 'Catering', 'Buffet, dinner and dessert services', 'fa-utensils'),
  ('decoration', 'Decoration', 'Stage, floral design and event styling', 'fa-fan')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

INSERT INTO public.services (
  id,
  provider_id,
  category_id,
  title,
  description,
  price_type,
  base_price,
  currency,
  min_capacity,
  max_capacity,
  location_type,
  images,
  is_active,
  is_featured,
  cancellation_policy
)
VALUES
  (
    'aaaa1111-1111-4111-a111-111111111111',
    '77777777-7777-4777-a777-777777777777',
    (SELECT id FROM public.categories WHERE slug = 'photography' LIMIT 1),
    'Premium Wedding Photo Package',
    'Full-day coverage, two photographers, cinematic teaser and luxury printed album.',
    'package',
    4200,
    'TND',
    50,
    400,
    'onsite',
    ARRAY[
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80'
    ],
    true,
    true,
    '{"notice_days": 7, "refund_percentage": 50, "description": "Moderate cancellation policy"}'::jsonb
  ),
  (
    'aaaa2222-2222-4222-a222-222222222222',
    '88888888-8888-4888-a888-888888888888',
    (SELECT id FROM public.categories WHERE slug = 'venues' LIMIT 1),
    'Royal Hall Reservation',
    'Elegant venue with stage, sound system, valet parking and VIP guest area.',
    'package',
    18000,
    'TND',
    120,
    450,
    'onsite',
    ARRAY['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80'],
    true,
    true,
    '{"notice_days": 10, "refund_percentage": 30, "description": "Strict venue cancellation policy"}'::jsonb
  ),
  (
    'aaaa3333-3333-4333-a333-333333333333',
    '99999999-9999-4999-a999-999999999999',
    (SELECT id FROM public.categories WHERE slug = 'catering' LIMIT 1),
    'Prestige Dinner Buffet',
    'Premium buffet with waiters, dessert bar and custom guest menu options.',
    'package',
    9500,
    'TND',
    80,
    350,
    'onsite',
    ARRAY['https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80'],
    true,
    false,
    '{"notice_days": 5, "refund_percentage": 60, "description": "Flexible catering cancellation policy"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (
  id,
  client_id,
  title,
  description,
  event_type,
  event_date,
  guest_count,
  budget,
  currency,
  venue_city,
  venue_region,
  status
)
VALUES
  ('bbbb1111-1111-4111-a111-111111111111', '55555555-5555-4555-a555-555555555555', 'Salma Wedding', 'Luxury wedding planning in summer with 250 guests.', 'wedding', '2026-08-20T18:00:00Z', 250, 42000, 'TND', 'Tunis', 'Tunis', 'planning'),
  ('bbbb2222-2222-4222-a222-222222222222', '66666666-6666-4666-a666-666666666666', 'Youssef Corporate Gala', 'Annual corporate gala with catering and photography coverage.', 'corporate', '2026-06-18T19:30:00Z', 140, 22000, 'TND', 'Sousse', 'Sousse', 'confirmed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conversations (id, participant_ids, created_at, updated_at, last_message_at)
VALUES
  ('cccc1111-1111-4111-a111-111111111111', ARRAY['55555555-5555-4555-a555-555555555555', '22222222-2222-4222-a222-222222222222']::uuid[], NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, conversation_id, sender_id, content, created_at)
VALUES
  ('dddd1111-1111-4111-a111-111111111111', 'cccc1111-1111-4111-a111-111111111111', '55555555-5555-4555-a555-555555555555', 'Hello, is your premium wedding photo package available for August 20?', NOW() - INTERVAL '2 days'),
  ('dddd2222-2222-4222-a222-222222222222', 'cccc1111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', 'Yes, the date is still available and we can adapt the package to your timeline.', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quote_requests (
  id,
  event_id,
  client_id,
  title,
  description,
  items,
  provider_ids,
  deadline,
  max_budget,
  event_type,
  event_date,
  location,
  guest_count,
  status
)
VALUES
  (
    'eeee1111-1111-4111-a111-111111111111',
    'bbbb1111-1111-4111-a111-111111111111',
    '55555555-5555-4555-a555-555555555555',
    'Photography and venue sourcing',
    'Looking for a premium wedding venue and an elegant photography team.',
    '[{"category_id":"photography","description":"All-day wedding coverage","estimated_budget":4500},{"category_id":"venues","description":"Reception hall for 250 guests","estimated_budget":20000}]'::jsonb,
    ARRAY['22222222-2222-4222-a222-222222222222', '33333333-3333-4333-a333-333333333333']::uuid[],
    NOW() + INTERVAL '10 days',
    26000,
    'wedding',
    '2026-08-20',
    'Tunis',
    250,
    'open'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotes (
  id,
  conversation_id,
  provider_id,
  client_id,
  quote_request_id,
  items_json,
  subtotal,
  discount_amount,
  tax_rate,
  tax_amount,
  total_amount,
  status,
  valid_until,
  notes,
  terms
)
VALUES
  (
    'ffff1111-1111-4111-a111-111111111111',
    'cccc1111-1111-4111-a111-111111111111',
    '22222222-2222-4222-a222-222222222222',
    '55555555-5555-4555-a555-555555555555',
    'eeee1111-1111-4111-a111-111111111111',
    '[{"description":"Premium wedding package","price":4200,"quantity":1,"unit":"package"}]'::jsonb,
    4200,
    200,
    7,
    280,
    4280,
    'accepted',
    NOW() + INTERVAL '7 days',
    'Includes highlight video and printed album.',
    '30 percent deposit required to secure the date.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookings (
  id,
  event_id,
  quote_id,
  service_id,
  client_id,
  provider_id,
  booking_date,
  start_time,
  end_time,
  status,
  amount,
  deposit_amount,
  balance_amount,
  platform_fee,
  payment_status,
  cancellation_deadline,
  auto_refund_deadline,
  notes
)
VALUES
  (
    '99991111-1111-4111-a111-111111111111',
    'bbbb1111-1111-4111-a111-111111111111',
    'ffff1111-1111-4111-a111-111111111111',
    'aaaa1111-1111-4111-a111-111111111111',
    '55555555-5555-4555-a555-555555555555',
    '77777777-7777-4777-a777-777777777777',
    '2026-08-20T18:00:00Z',
    '18:00',
    '23:00',
    'confirmed',
    4280,
    856,
    3424,
    428,
    'deposit_paid',
    '2026-08-13T18:00:00Z',
    '2026-08-17T18:00:00Z',
    'Premium photography package booked from accepted quote.'
  ),
  (
    '99992222-2222-4222-a222-222222222222',
    'bbbb2222-2222-4222-a222-222222222222',
    NULL,
    'aaaa3333-3333-4333-a333-333333333333',
    '66666666-6666-4666-a666-666666666666',
    '99999999-9999-4999-a999-999999999999',
    '2026-06-18T19:30:00Z',
    '19:30',
    '23:30',
    'completed',
    9500,
    1900,
    0,
    950,
    'fully_paid',
    '2026-06-13T19:30:00Z',
    '2026-06-15T19:30:00Z',
    'Corporate gala catering delivered successfully.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payment_records (
  booking_id,
  payment_intent_id,
  payment_type,
  amount,
  currency,
  status,
  platform_fee,
  net_amount,
  created_at
)
VALUES
  ('99991111-1111-4111-a111-111111111111', 'pi_demo_deposit_photo', 'deposit', 856, 'TND', 'completed', 428, 856, NOW() - INTERVAL '12 days'),
  ('99992222-2222-4222-a222-222222222222', 'pi_demo_full_catering', 'full', 9500, 'TND', 'completed', 950, 9500, NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

INSERT INTO public.commissions (
  booking_id,
  provider_id,
  gross_amount,
  commission_rate,
  commission_amount,
  net_payout,
  status,
  paid_at,
  notes
)
VALUES
  ('99991111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', 4280, 0.10, 428, 3852, 'pending', NULL, 'Deposit received, remaining balance pending.'),
  ('99992222-2222-4222-a222-222222222222', '44444444-4444-4444-a444-444444444444', 9500, 0.10, 950, 8550, 'paid', NOW() - INTERVAL '25 days', 'Completed booking, commission settled.')
ON CONFLICT DO NOTHING;

INSERT INTO public.reviews (id, service_id, client_id, rating, comment, created_at)
VALUES
  ('12121111-1111-4111-a111-111111111111', 'aaaa3333-3333-4333-a333-333333333333', '66666666-6666-4666-a666-666666666666', 5, 'Outstanding catering quality and flawless service.', NOW() - INTERVAL '20 days'),
  ('12122222-2222-4222-a222-222222222222', 'aaaa1111-1111-4111-a111-111111111111', '55555555-5555-4555-a555-555555555555', 5, 'Very elegant shots, excellent communication and punctual team.', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.provider_availabilities (provider_id, date, start_time, end_time, is_blocked, reason)
VALUES
  ('77777777-7777-4777-a777-777777777777', '2026-08-21', '15:00', '23:00', true, 'Already booked for another wedding'),
  ('88888888-8888-4888-a888-888888888888', '2026-08-20', '18:00', '23:30', true, 'Hall reserved for private event')
ON CONFLICT DO NOTHING;

-- Suggested demo accounts:
-- admin@dousha.com
-- photographer@dousha.com
-- venue@dousha.com
-- catering@dousha.com
-- client.salma@dousha.com
-- client.youssef@dousha.com
