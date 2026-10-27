-- ============================================================================
-- FRANK FOODS MULTI-TENANT RESTAURANT PLATFORM: PHASE 2 SCHEMA MIGRATION
-- Migration: 20261024000001_core_schema.sql
-- Description: Creates 8 core tables with multi-tenant integrity, constraints,
--              indexes, foreign keys, and updated_at triggers.
-- ============================================================================

-- Ensure pgcrypto or uuid-ossp extension is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. RESTAURANTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    description TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    address TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON public.restaurants(is_active);

-- ----------------------------------------------------------------------------
-- 2. PROFILES
-- ----------------------------------------------------------------------------
-- Associates auth.users with their restaurant and application role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_id ON public.profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- 3. MENU CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Category names unique within a given restaurant
    CONSTRAINT uq_categories_restaurant_name UNIQUE (restaurant_id, name),
    -- Composite unique key to facilitate composite foreign key references
    CONSTRAINT uq_categories_id_restaurant UNIQUE (id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_order ON public.menu_categories(restaurant_id, display_order);

-- ----------------------------------------------------------------------------
-- 4. MENU ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    description TEXT,
    image_url TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    preparation_time_minutes INTEGER CHECK (preparation_time_minutes IS NULL OR preparation_time_minutes >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that category belongs to the exact same restaurant!
    CONSTRAINT fk_menu_items_category_tenant FOREIGN KEY (category_id, restaurant_id)
        REFERENCES public.menu_categories(id, restaurant_id) ON DELETE SET NULL,
    -- Composite unique key for order items composite FK
    CONSTRAINT uq_menu_items_id_restaurant UNIQUE (id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available ON public.menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);

-- ----------------------------------------------------------------------------
-- 5. RESTAURANT TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL CHECK (char_length(trim(table_number)) > 0),
    location_zone TEXT DEFAULT 'Indoor',
    qr_code_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Table numbers unique within a restaurant
    CONSTRAINT uq_tables_restaurant_number UNIQUE (restaurant_id, table_number),
    -- Composite unique key for orders composite FK
    CONSTRAINT uq_tables_id_restaurant UNIQUE (id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.restaurant_tables(qr_code_token);

-- ----------------------------------------------------------------------------
-- 6. ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    table_id UUID,
    order_number VARCHAR(32) NOT NULL,
    order_type VARCHAR(16) NOT NULL CHECK (order_type IN ('table', 'counter')),
    status VARCHAR(24) NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'preparing', 'ready', 'served', 'cancelled')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    special_instructions TEXT,
    guest_access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that table belongs to the exact same restaurant
    CONSTRAINT fk_orders_table_tenant FOREIGN KEY (table_id, restaurant_id)
        REFERENCES public.restaurant_tables(id, restaurant_id) ON DELETE RESTRICT,
    -- Unique order number per restaurant
    CONSTRAINT uq_orders_restaurant_number UNIQUE (restaurant_id, order_number),
    -- Composite unique key for order items & payments FK
    CONSTRAINT uq_orders_id_restaurant UNIQUE (id, restaurant_id),
    -- Counter orders must not have a table_id, table orders must have one
    CONSTRAINT chk_order_table_presence CHECK (
        (order_type = 'table' AND table_id IS NOT NULL) OR
        (order_type = 'counter' AND table_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON public.orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON public.orders(guest_access_token);

-- ----------------------------------------------------------------------------
-- 7. ORDER ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL,
    menu_item_id UUID,
    item_name TEXT NOT NULL CHECK (char_length(trim(item_name)) > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that order belongs to the same restaurant
    CONSTRAINT fk_order_items_order_tenant FOREIGN KEY (order_id, restaurant_id)
        REFERENCES public.orders(id, restaurant_id) ON DELETE CASCADE,
    -- Enforce that menu_item belongs to the same restaurant if provided
    CONSTRAINT fk_order_items_menu_item_tenant FOREIGN KEY (menu_item_id, restaurant_id)
        REFERENCES public.menu_items(id, restaurant_id) ON DELETE SET NULL,
    -- Arithmetic constraint for line total calculation
    CONSTRAINT chk_order_item_line_total CHECK (line_total = unit_price * quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant ON public.order_items(restaurant_id);

-- ----------------------------------------------------------------------------
-- 8. PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    method VARCHAR(32) NOT NULL CHECK (method IN ('cash', 'mtn_momo', 'airtel_money', 'card', 'Cash', 'MTN MoMo', 'Airtel Money', 'Card')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
    reference TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that order belongs to the exact same restaurant
    CONSTRAINT fk_payments_order_tenant FOREIGN KEY (order_id, restaurant_id)
        REFERENCES public.orders(id, restaurant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_restaurant_status ON public.payments(restaurant_id, status);

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_menu_categories_updated_at ON public.menu_categories;
CREATE TRIGGER trg_menu_categories_updated_at
BEFORE UPDATE ON public.menu_categories
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_restaurant_tables_updated_at ON public.restaurant_tables;
CREATE TRIGGER trg_restaurant_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
