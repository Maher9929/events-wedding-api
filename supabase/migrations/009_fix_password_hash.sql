-- Fix password hash for all seed users
-- This hash corresponds to password: Dousha2026!
UPDATE auth.users 
SET encrypted_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W',
    email_confirmed_at = NOW()
WHERE email IN ('admin@dousha.com', 'sara@dousha.com', 'fatima@dousha.com', 'ahmed@dousha.com', 'nora@dousha.com');

-- Verify the fix
SELECT email, 
       crypt('Dousha2026!', encrypted_password) = encrypted_password as password_match
FROM auth.users 
WHERE email IN ('admin@dousha.com', 'sara@dousha.com', 'fatima@dousha.com', 'ahmed@dousha.com', 'nora@dousha.com');
