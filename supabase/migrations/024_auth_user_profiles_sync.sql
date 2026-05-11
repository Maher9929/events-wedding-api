-- ============================================================
-- Migration 024: Auto-sync auth.users → user_profiles
-- Creates a trigger so every new Supabase Auth signup
-- automatically gets a row in user_profiles.
-- Also backfills any existing auth users that are missing.
-- ============================================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: insert user_profiles rows for any auth users that are missing
INSERT INTO public.user_profiles (id, email, full_name, role, created_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(au.raw_user_meta_data ->> 'role', 'client'),
    au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONE: Migration 024
-- ============================================================
