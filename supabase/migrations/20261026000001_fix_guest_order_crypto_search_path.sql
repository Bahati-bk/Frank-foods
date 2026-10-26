-- The pgcrypto extension is installed in Supabase's `extensions` schema.
-- Keep the SECURITY DEFINER function's search path restricted to trusted schemas
-- while making gen_random_bytes available to existing deployments.
ALTER FUNCTION public.create_guest_order(TEXT, JSONB, TEXT, TEXT)
    SET search_path = extensions, pg_catalog;
