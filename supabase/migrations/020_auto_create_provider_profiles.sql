-- Automatically create a provider profile whenever a user profile is created
-- or updated with the provider role.

CREATE OR REPLACE FUNCTION ensure_provider_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'provider' THEN
        INSERT INTO providers (
            user_id,
            company_name,
            description
        )
        VALUES (
            NEW.id,
            COALESCE(NULLIF(NEW.full_name, ''), split_part(NEW.email, '@', 1)),
            'Provider profile created automatically'
        )
        ON CONFLICT (user_id) DO UPDATE
        SET company_name = COALESCE(
                NULLIF(providers.company_name, ''),
                COALESCE(NULLIF(EXCLUDED.company_name, ''), providers.company_name)
            ),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_provider_profile ON user_profiles;

CREATE TRIGGER trg_auto_create_provider_profile
AFTER INSERT OR UPDATE OF role, full_name, email
ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION ensure_provider_profile_for_user();

INSERT INTO providers (user_id, company_name, description)
SELECT
    up.id,
    COALESCE(NULLIF(up.full_name, ''), split_part(up.email, '@', 1)),
    'Provider profile created automatically'
FROM user_profiles up
LEFT JOIN providers p ON p.user_id = up.id
WHERE up.role = 'provider'
  AND p.id IS NULL;
