-- Generate correct bcrypt hash for Dousha2026!
UPDATE auth.users 
SET encrypted_password = crypt('Dousha2026!', gen_salt('bf', 12)),
    email_confirmed_at = NOW()
WHERE email IN ('admin@dousha.com', 'sara@dousha.com', 'fatima@dousha.com', 'ahmed@dousha.com', 'nora@dousha.com');

-- Verify the fix
SELECT email, 
       crypt('Dousha2026!', encrypted_password) = encrypted_password as password_match
FROM auth.users 
WHERE email IN ('admin@dousha.com', 'sara@dousha.com', 'fatima@dousha.com', 'ahmed@dousha.com', 'nora@dousha.com');
