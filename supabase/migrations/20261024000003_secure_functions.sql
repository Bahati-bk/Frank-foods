-- ============================================================================
-- FRANK FOODS MULTI-TENANT RESTAURANT PLATFORM: TRUSTED STORED PROCEDURES
-- Migration: 20261024000003_secure_functions.sql
-- Description: Server-authoritative functions for guest order placement with
--              trusted price resolution, guest order status retrieval by token,
--              payment verification, and status advancement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE GUEST ORDER (TRUSTED PRICE RESOLUTION)
-- ----------------------------------------------------------------------------
-- Validates table QR token, fetches database unit prices, computes line/grand totals,
-- creates order and item snapshots, and returns high-entropy guest access token.
CREATE OR REPLACE FUNCTION public.create_guest_order(
    p_qr_token TEXT,
    p_items JSONB,
    p_special_instructions TEXT DEFAULT NULL,
    p_order_type TEXT DEFAULT 'table'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, pg_catalog
AS $$
DECLARE
    v_restaurant_id UUID;
    v_table_id UUID;
    v_restaurant_slug TEXT;
    v_order_id UUID;
    v_order_number TEXT;
    v_guest_token TEXT;
    v_subtotal NUMERIC(12, 2) := 0;
    v_total NUMERIC(12, 2) := 0;
    v_item JSONB;
    v_menu_item_id UUID;
    v_quantity INT;
    v_item_notes TEXT;
    v_db_name TEXT;
    v_db_price NUMERIC(12, 2);
    v_db_available BOOLEAN;
    v_db_restaurant UUID;
    v_line_total NUMERIC(12, 2);
    v_order_seq INT;
BEGIN
    -- Validate items list
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.';
    END IF;

    -- Validate order type and locate restaurant / table
    IF p_order_type = 'table' THEN
        IF p_qr_token IS NULL OR trim(p_qr_token) = '' THEN
            RAISE EXCEPTION 'Table QR code token is required for dine-in table orders.';
        END IF;

        SELECT rt.id, rt.restaurant_id, r.slug
        INTO v_table_id, v_restaurant_id, v_restaurant_slug
        FROM public.restaurant_tables rt
        JOIN public.restaurants r ON r.id = rt.restaurant_id
        WHERE rt.qr_code_token = p_qr_token
          AND rt.is_active = true
          AND r.is_active = true;

        IF v_table_id IS NULL THEN
            RAISE EXCEPTION 'Invalid or inactive table QR code location.';
        END IF;
    ELSIF p_order_type = 'counter' THEN
        -- Locate restaurant by token (for counter stands) or default
        SELECT rt.restaurant_id, r.slug
        INTO v_restaurant_id, v_restaurant_slug
        FROM public.restaurant_tables rt
        JOIN public.restaurants r ON r.id = rt.restaurant_id
        WHERE rt.qr_code_token = p_qr_token
          AND r.is_active = true;

        v_table_id := NULL;
    ELSE
        RAISE EXCEPTION 'Unsupported order type: %', p_order_type;
    END IF;

    -- Generate human-readable order number with tenant prefix
    -- e.g. #FF-0842 or #DB-0105
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_order_seq
    FROM public.orders
    WHERE restaurant_id = v_restaurant_id;

    v_order_number := '#' || UPPER(SUBSTRING(v_restaurant_slug FROM 1 FOR 2)) || '-' || LPAD(v_order_seq::TEXT, 4, '0');
    v_guest_token := encode(gen_random_bytes(24), 'hex');

    -- Insert order header with temporary 0 totals
    INSERT INTO public.orders (
        restaurant_id,
        table_id,
        order_number,
        order_type,
        status,
        payment_status,
        subtotal,
        total,
        special_instructions,
        guest_access_token
    )
    VALUES (
        v_restaurant_id,
        v_table_id,
        v_order_number,
        p_order_type,
        'pending_payment',
        'pending',
        0,
        0,
        p_special_instructions,
        v_guest_token
    )
    RETURNING id INTO v_order_id;

    -- Process each item and compute authoritative prices from DB
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_menu_item_id := (v_item->>'menu_item_id')::UUID;
        v_quantity := COALESCE((v_item->>'quantity')::INT, 1);
        v_item_notes := v_item->>'special_instructions';

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid item quantity: %', v_quantity;
        END IF;

        -- Authoritative price and availability lookup
        SELECT name, price, is_available, restaurant_id
        INTO v_db_name, v_db_price, v_db_available, v_db_restaurant
        FROM public.menu_items
        WHERE id = v_menu_item_id;

        IF v_db_name IS NULL THEN
            RAISE EXCEPTION 'Menu item % not found.', v_menu_item_id;
        END IF;

        IF v_db_restaurant <> v_restaurant_id THEN
            RAISE EXCEPTION 'Cross-tenant violation: Menu item % does not belong to this restaurant.', v_menu_item_id;
        END IF;

        IF NOT v_db_available THEN
            RAISE EXCEPTION 'Item "%" is currently sold out (86-ed).', v_db_name;
        END IF;

        v_line_total := v_db_price * v_quantity;
        v_subtotal := v_subtotal + v_line_total;

        -- Insert snapshot item
        INSERT INTO public.order_items (
            restaurant_id,
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            special_instructions
        )
        VALUES (
            v_restaurant_id,
            v_order_id,
            v_menu_item_id,
            v_db_name,
            v_db_price,
            v_quantity,
            v_line_total,
            v_item_notes
        );
    END LOOP;

    -- Taxes and levies are inclusive in menu price
    v_total := v_subtotal;

    -- Update order with authoritative totals
    UPDATE public.orders
    SET subtotal = v_subtotal,
        total = v_total
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'restaurant_id', v_restaurant_id,
        'table_id', v_table_id,
        'status', 'pending_payment',
        'payment_status', 'pending',
        'subtotal', v_subtotal,
        'total', v_total,
        'guest_access_token', v_guest_token
    );
END;
$$;

-- Allow anonymous and authenticated users to call create_guest_order
GRANT EXECUTE ON FUNCTION public.create_guest_order(TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. GET GUEST ORDER TRACKER (AUTHENTICATED VIA HIGH-ENTROPY TOKEN)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guest_order(
    p_order_id UUID,
    p_guest_access_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'restaurant_name', r.name,
        'restaurant_currency', r.currency,
        'table_number', COALESCE(rt.table_number, 'Counter'),
        'table_location', CASE WHEN rt.id IS NOT NULL THEN rt.table_number || ' (' || rt.location_zone || ')' ELSE 'Counter' END,
        'status', o.status,
        'payment_status', o.payment_status,
        'subtotal', o.subtotal,
        'total', o.total,
        'special_instructions', o.special_instructions,
        'created_at', o.created_at,
        'items', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', oi.id,
                'name', oi.item_name,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity,
                'line_total', oi.line_total,
                'special_instructions', oi.special_instructions
            ))
            FROM public.order_items oi
            WHERE oi.order_id = o.id
        ),
        'payment_verified', (o.payment_status = 'paid')
    )
    INTO v_result
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    LEFT JOIN public.restaurant_tables rt ON rt.id = o.table_id
    WHERE o.id = p_order_id
      AND o.guest_access_token = p_guest_access_token;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Order not found or unauthorized token.';
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_order(UUID, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. VERIFY STAFF PAYMENT
-- ----------------------------------------------------------------------------
-- Verifies manual cash or mobile money payment by authenticated restaurant staff.
CREATE OR REPLACE FUNCTION public.verify_staff_payment(
    p_order_id UUID,
    p_method TEXT,
    p_amount NUMERIC DEFAULT NULL,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_restaurant UUID;
    v_order_restaurant UUID;
    v_order_total NUMERIC(12, 2);
    v_actual_amount NUMERIC(12, 2);
    v_payment_id UUID;
BEGIN
    -- Verify staff caller
    v_user_restaurant := public.get_auth_restaurant_id();
    IF v_user_restaurant IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be active staff or owner.';
    END IF;

    -- Lookup order
    SELECT restaurant_id, total
    INTO v_order_restaurant, v_order_total
    FROM public.orders
    WHERE id = p_order_id;

    IF v_order_restaurant IS NULL THEN
        RAISE EXCEPTION 'Order % not found.', p_order_id;
    END IF;

    IF v_order_restaurant <> v_user_restaurant THEN
        RAISE EXCEPTION 'Tenant violation: Cannot verify payments for another restaurant.';
    END IF;

    v_actual_amount := COALESCE(p_amount, v_order_total);

    -- Insert payment record
    INSERT INTO public.payments (
        restaurant_id,
        order_id,
        amount,
        method,
        status,
        reference,
        verified_by,
        verified_at,
        notes
    )
    VALUES (
        v_user_restaurant,
        p_order_id,
        v_actual_amount,
        p_method,
        'verified',
        p_reference,
        auth.uid(),
        now(),
        p_notes
    )
    RETURNING id INTO v_payment_id;

    -- Update order payment status
    UPDATE public.orders
    SET payment_status = 'paid'
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'payment_id', v_payment_id,
        'order_id', p_order_id,
        'status', 'verified',
        'method', p_method,
        'amount', v_actual_amount,
        'verified_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_payment(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. ADVANCE ORDER STATUS (ENFORCES PAYMENT VERIFICATION BEFORE PREPARATION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_order_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_restaurant UUID;
    v_order_restaurant UUID;
    v_payment_status TEXT;
    v_current_status TEXT;
BEGIN
    v_user_restaurant := public.get_auth_restaurant_id();
    IF v_user_restaurant IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be active staff or owner.';
    END IF;

    SELECT restaurant_id, payment_status, status
    INTO v_order_restaurant, v_payment_status, v_current_status
    FROM public.orders
    WHERE id = p_order_id;

    IF v_order_restaurant <> v_user_restaurant THEN
        RAISE EXCEPTION 'Tenant violation: Order belongs to another restaurant.';
    END IF;

    -- STRICT SHIFT RELEASE POLICY: Cannot start preparation without payment verification!
    IF p_new_status = 'preparing' AND v_payment_status <> 'paid' THEN
        RAISE EXCEPTION 'Shift Release Policy Violation: Order cannot enter preparation until payment is verified.';
    END IF;

    UPDATE public.orders
    SET status = p_new_status
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'previous_status', v_current_status,
        'status', p_new_status,
        'payment_status', v_payment_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_order_status(UUID, TEXT) TO authenticated;
