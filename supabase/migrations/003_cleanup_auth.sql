-- ============================================================
-- EMERGENCY CLEANUP SCRIPT (003)
-- ============================================================

-- 1. Remove profiles first (due to foreign keys)
DELETE FROM user_profiles 
WHERE email IN ('admin@dousha.com', 'provider@dousha.com', 'client@dousha.com');

-- 2. Remove users from auth.users (This should trigger internal cleanups in Supabase)
-- We try to delete by email since IDs might be inconsistent.
DELETE FROM auth.users 
WHERE email IN ('admin@dousha.com', 'provider@dousha.com', 'client@dousha.com');

-- 3. Also remove any orphaned audit entries if they exist (optional but safe)
-- DELETE FROM auth.audit_log_entries WHERE payload->>'email' IN ('admin@dousha.com', 'provider@dousha.com', 'client@dousha.com');
