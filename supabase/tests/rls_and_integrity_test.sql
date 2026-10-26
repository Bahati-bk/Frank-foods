-- ============================================================================
-- FRANK FOODS MULTI-TENANT RESTAURANT PLATFORM: AUTOMATED DATABASE TESTS
-- Test Suite: rls_and_integrity_test.sql
-- Description: Executes regression tests for tenant isolation, composite foreign
--              keys, price tampering prevention, and payment verification gates.
-- ============================================================================

DO $$
DECLARE
    v_test_failed BOOLEAN := false;
    v_error_caught BOOLEAN := false;
    v_order_json JSONB;
    v_retrieved_order JSONB;
    v_guest_token TEXT;
    v_order_id UUID;
    v_initial_price NUMERIC;
    v_snapshot_price NUMERIC;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'STARTING FRANK FOODS PHASE 2 DATABASE INTEGRITY & RLS TESTS';
    RAISE NOTICE '============================================================';

    -- ------------------------------------------------------------------------
    -- TEST 1: Cross-Tenant Category Assignment Prevention (Integrity)
    -- ------------------------------------------------------------------------
    BEGIN
        v_error_caught := false;
        -- Attempt to create a menu item in Restaurant A referencing Restaurant B's category
        INSERT INTO public.menu_items (
            restaurant_id,
            category_id,
            name,
            price
        )
        VALUES (
            '11111111-1111-1111-1111-111111111111', -- Restaurant A (Frank Foods)
            'c2222222-2222-2222-2222-222222222201', -- Category belonging to Restaurant B (Demo Bistro)
            'Illegal Cross-Tenant Item',
            25000
        );
    EXCEPTION WHEN foreign_key_violation THEN
        v_error_caught := true;
        RAISE NOTICE '✓ TEST 1 PASSED: Cross-tenant category reference was rejected by composite foreign key.';
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Database allowed cross-tenant category assignment!';
    END IF;

    -- ------------------------------------------------------------------------
    -- TEST 2: Cross-Tenant Table Order Prevention (Integrity)
    -- ------------------------------------------------------------------------
    BEGIN
        v_error_caught := false;
        -- Attempt to create an order in Restaurant A referencing Restaurant B's table
        INSERT INTO public.orders (
            restaurant_id,
            table_id,
            order_number,
            order_type,
            subtotal,
            total
        )
        VALUES (
            '11111111-1111-1111-1111-111111111111', -- Restaurant A
            'b0000000-0000-0000-0000-000000000001', -- Table B01 from Restaurant B
            '#FF-TEST-ILLEGAL',
            'table',
            10000,
            10000
        );
    EXCEPTION WHEN foreign_key_violation THEN
        v_error_caught := true;
        RAISE NOTICE '✓ TEST 2 PASSED: Cross-tenant table assignment was rejected by composite foreign key.';
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Database allowed cross-tenant table assignment!';
    END IF;

    -- ------------------------------------------------------------------------
    -- TEST 3: Negative Price & Quantity Rejection (Check Constraints)
    -- ------------------------------------------------------------------------
    BEGIN
        v_error_caught := false;
        INSERT INTO public.menu_items (
            restaurant_id,
            name,
            price
        )
        VALUES (
            '11111111-1111-1111-1111-111111111111',
            'Negative Price Dish',
            -5000
        );
    EXCEPTION WHEN check_violation THEN
        v_error_caught := true;
        RAISE NOTICE '✓ TEST 3 PASSED: Negative pricing rejected by check constraint.';
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Database permitted negative pricing!';
    END IF;

    -- ------------------------------------------------------------------------
    -- TEST 4: Trusted Order Creation & Price Tampering Resistance
    -- ------------------------------------------------------------------------
    -- Client attempts to order Frank's Smokehouse Burger (real price UGX 28,000)
    -- Client submits bogus price of UGX 1,000 in payload; database must ignore it!
    v_order_json := public.create_guest_order(
        'ff_table_07_token_67890', -- Frank Foods Table 07 QR Token
        jsonb_build_array(
            jsonb_build_object(
                'menu_item_id', 'm1111111-1111-1111-1111-111111111101',
                'quantity', 2,
                'client_attempted_price', 1000 -- Attacker price
            )
        ),
        'Extra napkins',
        'table'
    );

    v_order_id := (v_order_json->>'order_id')::UUID;
    v_guest_token := v_order_json->>'guest_access_token';

    -- Database authoritative total must be 28,000 * 2 = 56,000 UGX!
    IF (v_order_json->>'total')::NUMERIC = 56000 THEN
        RAISE NOTICE '✓ TEST 4 PASSED: Authoritative price calculation enforced (UGX 56,000 calculated, client tampering resisted).';
    ELSE
        RAISE EXCEPTION 'TEST 4 FAILED: Order total was not computed authoritatively! Got: %', (v_order_json->>'total');
    END IF;

    -- ------------------------------------------------------------------------
    -- TEST 5: Public Order Access Requires Unguessable Guest Token
    -- ------------------------------------------------------------------------
    -- Guessing UUID without token must fail
    BEGIN
        v_error_caught := false;
        PERFORM public.get_guest_order(v_order_id, 'wrong_token_guess');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        RAISE NOTICE '✓ TEST 5A PASSED: Public guest order lookup with invalid token was rejected.';
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 5A FAILED: Order information leaked without valid guest access token!';
    END IF;

    -- Valid token succeeds
    v_retrieved_order := public.get_guest_order(v_order_id, v_guest_token);
    IF v_retrieved_order->>'id' = v_order_id::TEXT THEN
        RAISE NOTICE '✓ TEST 5B PASSED: Authorized customer retrieved order successfully via valid token.';
    ELSE
        RAISE EXCEPTION 'TEST 5B FAILED: Could not retrieve order using valid guest access token!';
    END IF;

    -- ------------------------------------------------------------------------
    -- TEST 6: Historical Item Price Immutability After Menu Price Changes
    -- ------------------------------------------------------------------------
    -- Retrieve original item snapshot price
    SELECT unit_price INTO v_snapshot_price
    FROM public.order_items
    WHERE order_id = v_order_id
    LIMIT 1;

    -- Simulate restaurant owner raising menu item price from 28,000 to 35,000 UGX
    UPDATE public.menu_items
    SET price = 35000
    WHERE id = 'm1111111-1111-1111-1111-111111111101';

    -- Check that historical order item snapshot price is still 28,000 UGX
    SELECT unit_price INTO v_initial_price
    FROM public.order_items
    WHERE order_id = v_order_id
    LIMIT 1;

    IF v_initial_price = 28000 AND v_initial_price = v_snapshot_price THEN
        RAISE NOTICE '✓ TEST 6 PASSED: Historical order item snapshot retained initial price of UGX 28,000 after menu update.';
    ELSE
        RAISE EXCEPTION 'TEST 6 FAILED: Historical order price corrupted by menu price change!';
    END IF;

    -- Reset menu item price back
    UPDATE public.menu_items
    SET price = 28000
    WHERE id = 'm1111111-1111-1111-1111-111111111101';

    -- ------------------------------------------------------------------------
    -- TEST 7: Shift Release Policy — Cannot Start Prep Before Payment Verification
    -- ------------------------------------------------------------------------
    -- Order is currently unpaid (payment_status = 'pending')
    BEGIN
        v_error_caught := false;
        -- Attempt to advance to preparing without paid status
        UPDATE public.orders
        SET status = 'preparing'
        WHERE id = v_order_id AND payment_status <> 'paid';
        -- The advance_order_status function also enforces this
        PERFORM public.advance_order_status(v_order_id, 'preparing');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        RAISE NOTICE '✓ TEST 7 PASSED: Shift release policy blocked preparation for unpaid order.';
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 7 FAILED: Order was dispatched to kitchen before payment was verified!';
    END IF;

    -- Clean up test order
    DELETE FROM public.order_items WHERE order_id = v_order_id;
    DELETE FROM public.orders WHERE id = v_order_id;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ALL 7 INTEGRITY AND MULTI-TENANT TESTS PASSED SUCCESSFULLY!';
    RAISE NOTICE '============================================================';
END;
$$;
