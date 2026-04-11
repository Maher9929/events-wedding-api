-- Ensure Stripe payment intent identifiers are stored as text values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
          AND column_name = 'payment_intent_ids'
          AND udt_name = '_uuid'
    ) THEN
        ALTER TABLE bookings
        ALTER COLUMN payment_intent_ids TYPE TEXT[]
        USING ARRAY(
            SELECT item::TEXT
            FROM unnest(payment_intent_ids) AS item
        );
    END IF;
END $$;
