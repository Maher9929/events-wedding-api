-- ============================================================
-- Migration 029: Explicit public/private user profile views
--
-- The API must never expose raw user_profiles rows to other users.
-- These views document the two approved profile surfaces.
-- ============================================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE VIEW profile_public AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  city
FROM user_profiles;

CREATE OR REPLACE VIEW profile_private AS
SELECT
  id,
  email,
  phone,
  full_name,
  avatar_url,
  bio,
  role,
  city,
  preferences,
  history,
  created_at,
  updated_at
FROM user_profiles;

GRANT SELECT ON profile_public TO anon, authenticated, service_role;
GRANT SELECT ON profile_private TO service_role;
