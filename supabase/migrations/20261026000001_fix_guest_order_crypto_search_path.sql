-- The pgcrypto extension is installed in Supabase's `extensions` schema.
-- Keep the SECURITY DEFINER function's search path restricted to trusted schemas
-- while making gen_random_bytes and public tables available.
ALTER FUNCTION public.create_guest_order(TEXT, JSONB, TEXT, TEXT)
    SET search_path = public, extensions, pg_catalog;

-- Update payments check constraint to support Card / POS terminal payments
DO $$
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_method_check 
        CHECK (method IN ('cash', 'mtn_momo', 'airtel_money', 'card', 'Cash', 'MTN MoMo', 'Airtel Money', 'Card'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
