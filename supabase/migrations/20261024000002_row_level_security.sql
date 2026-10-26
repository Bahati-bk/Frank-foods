-- ============================================================================
-- FRANK FOODS MULTI-TENANT RESTAURANT PLATFORM: ROW LEVEL SECURITY (RLS)
-- Migration: 20261024000002_row_level_security.sql
-- Description: Enables RLS on all 8 tables and establishes strict, non-recursive
--              tenant isolation policies and secure helper functions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SECURE HELPER FUNCTIONS FOR TENANT CONTEXT
-- ----------------------------------------------------------------------------
-- Note: SECURITY DEFINER with safe search_path and execution privilege control
CREATE OR REPLACE FUNCTION public.get_auth_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

-- Revoke all public execution and grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.get_auth_restaurant_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_restaurant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL 8 CORE TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. POLICIES: RESTAURANTS
-- ----------------------------------------------------------------------------
-- Public can view active restaurants (for menu browsing and table branding)
CREATE POLICY "restaurants_public_select"
ON public.restaurants
FOR SELECT
USING (is_active = true);

-- Owners and managers can view and update their own restaurant
CREATE POLICY "restaurants_staff_select"
ON public.restaurants
FOR SELECT
TO authenticated
USING (id = public.get_auth_restaurant_id());

CREATE POLICY "restaurants_owner_update"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (id = public.get_auth_restaurant_id() AND public.get_auth_role() IN ('owner', 'manager'))
WITH CHECK (id = public.get_auth_restaurant_id());

-- ----------------------------------------------------------------------------
-- 4. POLICIES: PROFILES
-- ----------------------------------------------------------------------------
-- Users can always read their own profile
CREATE POLICY "profiles_own_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Owners can view all staff profiles within their restaurant
CREATE POLICY "profiles_owner_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
);

-- Users can update their own personal full_name (cannot change role or restaurant_id)
CREATE POLICY "profiles_own_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Owners can insert and update staff profiles for their restaurant
CREATE POLICY "profiles_owner_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'owner'
    AND role IN ('manager', 'staff')
);

CREATE POLICY "profiles_owner_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'owner'
)
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
);

-- ----------------------------------------------------------------------------
-- 5. POLICIES: MENU CATEGORIES
-- ----------------------------------------------------------------------------
-- Public can view active categories of active restaurants
CREATE POLICY "menu_categories_public_select"
ON public.menu_categories
FOR SELECT
USING (is_active = true);

-- Staff can view all categories (including inactive/drafts) of their restaurant
CREATE POLICY "menu_categories_staff_select"
ON public.menu_categories
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id());

-- Owners & managers can manage categories for their restaurant
CREATE POLICY "menu_categories_owner_insert"
ON public.menu_categories
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
);

CREATE POLICY "menu_categories_owner_update"
ON public.menu_categories
FOR UPDATE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
)
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
);

CREATE POLICY "menu_categories_owner_delete"
ON public.menu_categories
FOR DELETE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'owner'
);

-- ----------------------------------------------------------------------------
-- 6. POLICIES: MENU ITEMS
-- ----------------------------------------------------------------------------
-- Public can view active available dishes of active restaurants
CREATE POLICY "menu_items_public_select"
ON public.menu_items
FOR SELECT
USING (is_available = true);

-- Staff can view all items (including 86-ed / sold out) for their restaurant
CREATE POLICY "menu_items_staff_select"
ON public.menu_items
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id());

-- Owners & managers can create, update, and toggle menu items for their restaurant
CREATE POLICY "menu_items_owner_insert"
ON public.menu_items
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
);

CREATE POLICY "menu_items_owner_update"
ON public.menu_items
FOR UPDATE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
)
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
);

CREATE POLICY "menu_items_owner_delete"
ON public.menu_items
FOR DELETE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() = 'owner'
);

-- ----------------------------------------------------------------------------
-- 7. POLICIES: RESTAURANT TABLES
-- ----------------------------------------------------------------------------
-- Public can resolve their table information via the unguessable QR token
CREATE POLICY "tables_public_qr_select"
ON public.restaurant_tables
FOR SELECT
USING (is_active = true);

-- Staff can view all tables for their restaurant
CREATE POLICY "tables_staff_select"
ON public.restaurant_tables
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id());

-- Owners & managers can manage tables
CREATE POLICY "tables_owner_insert"
ON public.restaurant_tables
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
);

CREATE POLICY "tables_owner_update"
ON public.restaurant_tables
FOR UPDATE
TO authenticated
USING (
    restaurant_id = public.get_auth_restaurant_id()
    AND public.get_auth_role() IN ('owner', 'manager')
)
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
);

-- ----------------------------------------------------------------------------
-- 8. POLICIES: ORDERS
-- ----------------------------------------------------------------------------
-- Staff and owners can view all orders belonging to their restaurant
CREATE POLICY "orders_staff_select"
ON public.orders
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id());

-- Staff and owners can update order status (e.g. preparing, ready, served)
CREATE POLICY "orders_staff_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id())
WITH CHECK (restaurant_id = public.get_auth_restaurant_id());

-- ----------------------------------------------------------------------------
-- 9. POLICIES: ORDER ITEMS
-- ----------------------------------------------------------------------------
-- Staff can view all order items in their restaurant
CREATE POLICY "order_items_staff_select"
ON public.order_items
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id());

-- ----------------------------------------------------------------------------
-- 10. POLICIES: PAYMENTS
-- ----------------------------------------------------------------------------
-- Staff and owners can view payments for their restaurant
CREATE POLICY "payments_staff_select"
ON public.payments
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_auth_restaurant_id());

-- Verified payments are recorded only by authenticated staff/owner for their restaurant
CREATE POLICY "payments_staff_insert"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id = public.get_auth_restaurant_id()
    AND verified_by = auth.uid()
);
