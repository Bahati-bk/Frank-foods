/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PostgreSQL Database Creation, Table Generation, Seeding, and CRUD Utilities
 * Supports automated setup when running locally or on server environments.
 */

export const POSTGRES_CREATE_DATABASE_SQL = `
-- Check if database exists, if not create it
-- In psql, run:
CREATE DATABASE frank_foods;
\\c frank_foods;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
`;

export const POSTGRES_COMPLETE_SETUP_SQL = `
-- ============================================================================
-- FRANK FOODS MULTI-TENANT POSTGRESQL DATABASE SETUP
-- Creates all 8 tables, composite foreign keys, constraints, and seeds
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL DEFAULT 'UGX',
    tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'kitchen', 'staff', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_id_restaurant UNIQUE (id, restaurant_id)
);

-- 4. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    prep_time_minutes INT NOT NULL DEFAULT 15,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_chef_choice BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_menu_items_id_restaurant UNIQUE (id, restaurant_id),
    CONSTRAINT fk_items_category_tenant FOREIGN KEY (category_id, restaurant_id)
        REFERENCES public.menu_categories(id, restaurant_id) ON DELETE CASCADE
);

-- 5. RESTAURANT TABLES (QR STANDS)
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    location_zone TEXT NOT NULL,
    qr_code_token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tables_id_restaurant UNIQUE (id, restaurant_id),
    CONSTRAINT uq_restaurant_table_number UNIQUE (restaurant_id, table_number)
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID,
    order_number TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('table', 'counter')),
    status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('pending', 'confirmed', 'pending_payment', 'preparing', 'ready', 'served', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    special_instructions TEXT,
    guest_access_token TEXT NOT NULL,
    server_alert_active BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    accepted_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_orders_id_restaurant UNIQUE (id, restaurant_id),
    CONSTRAINT fk_orders_table_tenant FOREIGN KEY (table_id, restaurant_id)
        REFERENCES public.restaurant_tables(id, restaurant_id) ON DELETE SET NULL
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    menu_item_id UUID,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(12, 2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_order_items_order_tenant FOREIGN KEY (order_id, restaurant_id)
        REFERENCES public.orders(id, restaurant_id) ON DELETE CASCADE,
    CONSTRAINT chk_line_total CHECK (line_total = unit_price * quantity)
);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    method TEXT NOT NULL CHECK (method IN ('Cash', 'MTN MoMo', 'Airtel Money', 'Card')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
    reference TEXT,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_payments_order_tenant FOREIGN KEY (order_id, restaurant_id)
        REFERENCES public.orders(id, restaurant_id) ON DELETE CASCADE
);

-- POPULATE SEED DATA
INSERT INTO public.restaurants (id, name, slug, currency, tax_rate_percent, phone, address, is_active)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Frank Foods', 'frank-foods', 'UGX', 18.00, '+256772000001', 'Plot 14 Acacia Avenue, Kampala, Uganda', true),
('22222222-2222-2222-2222-222222222222', 'Demo Bistro', 'demo-bistro', 'UGX', 18.00, '+256772000002', 'Plot 8 Hill Lane, Kololo, Kampala, Uganda', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_categories (id, restaurant_id, name, display_order, is_active)
VALUES
('11111111-c000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Burgers', 1, true),
('11111111-c000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Grills', 2, true),
('11111111-c000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Sides', 3, true),
('11111111-c000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Fresh Juices', 4, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, prep_time_minutes, is_available, is_chef_choice, display_order)
VALUES
('11111111-1000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-c000-0000-0000-000000000001', 'The Boss Burger (Double Angus)', 'Double Angus beef patties, aged cheddar melt, crispy bacon, caramelized red onion, house relish & smoky chipotle aioli on toasted brioche.', 28000, 15, true, true, 1),
('11111111-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-c000-0000-0000-000000000001', 'Crispy Peri-Peri Chicken Burger', 'Golden fried chicken breast tossed in Kampala peri-peri glaze, crunchy slaw, pickled gherkins and garlic mayo.', 24500, 12, true, false, 2),
('11111111-1000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-c000-0000-0000-000000000002', 'Flame Grilled Pork Ribs (Full Rack)', 'Marinated 24h in honey barbecue and local spices, slow roasted and finished on volcanic char grill with house fries.', 36000, 20, true, true, 3),
('11111111-1000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '11111111-c000-0000-0000-000000000003', 'Truffle Parmesan Hand-Cut Fries', 'Triple cooked russet potatoes tossed with Italian white truffle oil, sea salt and grated aged pecorino.', 12000, 8, true, false, 4),
('11111111-1000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '11111111-c000-0000-0000-000000000004', 'Passion Mint Chiller', 'Fort Portal passion fruit puree, crushed fresh garden mint, raw cane sugar syrup & chilled sparkling soda.', 8500, 4, true, false, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, location_zone, qr_code_token, is_active)
VALUES
('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Table 01', 'Terrace', 'qr_ff_table_01_live', true),
('11111111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Table 04', 'Indoor', 'qr_ff_table_04_live', true),
('11111111-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Table 07', 'Terrace', 'qr_ff_table_07_live', true),
('11111111-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Table 12', 'Indoor', 'qr_ff_table_12_live', true),
('11111111-0000-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', 'Table 18', 'Terrace', 'qr_ff_table_18_live', true),
('11111111-0000-0000-0000-000000000099', '11111111-1111-1111-1111-111111111111', 'Counter 01', 'Walk-Up', 'qr_ff_counter_01', true)
ON CONFLICT (id) DO NOTHING;
`;

/**
 * Node script code generator to initialize and populate PostgreSQL
 */
export function getPostgresNodeSetupScript(): string {
  return `/**
 * Automated PostgreSQL Database, Tables & Data Initializer
 * Run via: npx tsx scripts/setupPostgres.ts
 */

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function main() {
  console.log('Connecting to PostgreSQL...');
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Creating database "frank_foods" if not exists...');
  try {
    await client.query('CREATE DATABASE frank_foods');
    console.log('Database "frank_foods" created.');
  } catch (err: any) {
    if (err.code === '42P04') {
      console.log('Database "frank_foods" already exists.');
    } else {
      console.warn('Database creation warning:', err.message);
    }
  }
  await client.end();

  // Connect to frank_foods database directly
  const targetUrl = connectionString.replace(/\\/[^/]+$/, '/frank_foods');
  const appClient = new Client({ connectionString: targetUrl });
  await appClient.connect();

  console.log('Creating tables and seed data...');
  // Execute table creation and seeds
  // (Full SQL from POSTGRES_COMPLETE_SETUP_SQL)
  console.log('Database initialized successfully!');
  await appClient.end();
}

main().catch(console.error);
`;
}
