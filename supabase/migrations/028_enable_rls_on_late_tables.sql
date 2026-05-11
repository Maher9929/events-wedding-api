    -- ============================================================
    -- Migration 028: Enable RLS on tables added after the base schema
    --
    -- The backend uses the Supabase service role key and bypasses RLS.
    -- Enabling RLS here prevents accidental anon/authenticated table access
    -- if these tables are ever queried directly with the browser anon key.
    -- ============================================================

    ALTER TABLE IF EXISTS booking_notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS payment_records ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS quote_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS refund_policies ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Service role full access" ON booking_notifications;
    DROP POLICY IF EXISTS "Service role full access" ON payment_records;
    DROP POLICY IF EXISTS "Service role full access" ON quote_requests;
    DROP POLICY IF EXISTS "Service role full access" ON refund_policies;

    CREATE POLICY "Service role full access"
    ON booking_notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Service role full access"
    ON payment_records
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Service role full access"
    ON quote_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Service role full access"
    ON refund_policies
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
