-- ============================================================================
-- FRANK FOODS MULTI-TENANT RESTAURANT PLATFORM: DEVELOPMENT SEED DATA
-- Migration: 20261024000004_seed_data.sql
-- Description: Seeds two distinct restaurant tenants (Frank Foods & Demo Bistro)
--              with categories, menu items, QR tables, orders, items & payments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TENANT A: FRANK FOODS (ACACIA MALL, KAMPALA)
-- ----------------------------------------------------------------------------
INSERT INTO public.restaurants (
    id,
    name,
    slug,
    description,
    logo_url,
    phone,
    email,
    address,
    currency,
    is_active
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Frank Foods',
    'frank-foods',
    'Authentic flame-grilled Ugandan favorites and signature smokehouse burgers.',
    'https://lh3.googleusercontent.com/aida/AEtjO1WsyMDsVuGPntJQq76IMoAHfEhGAxAkS8IEyj0hzmFMOqUJH2aqccoDVWURAYZhSMfgj3JvYHM9Z5NOFhsm1GwIGPY-rW_-jfrABoLnmsmjx4TkL0A0HWDk8O3uevOzzaI_SdSP5Y3Fy15sz8LRDi7qik_udKSMg4mw0jFo8paOtosjYupZYnjXi9Nj1r62mBRhaPwA0Y9Q_rDuOScAIwczfw8tWOmBnfQatMCCtGsTCtt6LFGgrzrxI0g',
    '+256 700 123 456',
    'manager@frankfoods.ug',
    'Acacia Mall Food Terrace, Kisementi, Kampala',
    'UGX',
    true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug;

-- Tables for Frank Foods
INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, location_zone, qr_code_token)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Table 01', 'Indoor', 'ff_table_01_token_12345'),
    ('a0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Table 07', 'Terrace', 'ff_table_07_token_67890'),
    ('a0000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Table 12', 'Indoor', 'ff_table_12_token_54321'),
    ('a0000000-0000-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', 'Table 18', 'Terrace', 'ff_table_18_token_98765'),
    ('a0000000-0000-0000-0000-0000000000c1', '11111111-1111-1111-1111-111111111111', 'Counter 01', 'Walk-Up', 'ff_counter_01_token_11111'),
    ('a0000000-0000-0000-0000-0000000000c2', '11111111-1111-1111-1111-111111111111', 'Counter 02', 'Barista', 'ff_counter_02_token_22222')
ON CONFLICT (id) DO UPDATE
SET qr_code_token = EXCLUDED.qr_code_token,
    is_active = true;

-- Categories for Frank Foods
INSERT INTO public.menu_categories (id, restaurant_id, name, description, display_order)
VALUES
    ('c1111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'Burgers', 'Signature smokehouse grilled beef patties', 1),
    ('c1111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'Grills', 'Flame-roasted quarter and half chickens & meats', 2),
    ('c1111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'Rice Platters', 'Fragrant spiced pilau and accompaniments', 3),
    ('c1111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111111', 'Sides', 'Crispy fries and golden accompaniments', 4),
    ('c1111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111111', 'Fresh Juices', 'Cold-pressed Ugandan fruit refreshments', 5)
ON CONFLICT (id) DO NOTHING;

-- Menu Items for Frank Foods
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_available, preparation_time_minutes, image_url, display_order)
VALUES
    ('d1111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111101',
     'Frank''s Signature Smokehouse Burger', 'Two seasoned beef patties, smoked cheddar, caramelized onions, crisp lettuce, house burger sauce on toasted brioche.',
     28000, true, 16, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 1),

    ('d1111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111102',
     'Kampala Flame-Grilled Chicken', '24h marinated piri-piri lemon & herb half chicken with charred rosemary and tangy peri-peri butter.',
     32000, true, 20, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80', 2),

    ('d1111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111103',
     'Savory Beef Pilau Platter', 'Fragrant spiced basmati rice, tender braised beef chunks, fresh tomato-onion kachumbari & rich gravy.',
     26000, true, 12, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', 3),

    ('d1111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111104',
     'Loaded Masala Fries', 'Crispy hand-cut potatoes tossed in aromatic Kampala spices, chopped coriander & warm masala sauce.',
     12000, true, 10, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80', 4),

    ('d1111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111105',
     'Passion & Ginger Cooler (500ml)', 'Fresh squeezed Ugandan passion fruit, infused with crushed aromatic ginger root and served chilled.',
     8500, true, 4, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', 5),

    ('d1111111-1111-1111-1111-111111111106', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111102',
     'Whole Roasted Tilapia', 'Lake Victoria whole fresh tilapia flame-grilled with coriander lemon butter. Reason: Waiting for Jinja fish delivery.',
     38000, false, 25, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', 6)
ON CONFLICT (id) DO NOTHING;

-- Initial Active Order #FF-0842 for Table 07 (matching screen mockups)
INSERT INTO public.orders (
    id,
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
    'e1111111-1111-1111-1111-111111110842',
    '11111111-1111-1111-1111-111111111111',
    'a0000000-0000-0000-0000-000000000007',
    '#FF-0842',
    'table',
    'pending_payment',
    'pending',
    80500,
    80500,
    'Please serve drinks first, extra napkins requested for table.',
    'ff_guest_token_table07_demo'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (restaurant_id, order_id, menu_item_id, item_name, unit_price, quantity, line_total, special_instructions)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111110842', 'd1111111-1111-1111-1111-111111111101',
     'Frank''s Signature Smokehouse Burger', 31500, 1, 31500, 'Medium Well, Extra Smoked Cheddar'),
    ('11111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111110842', 'd1111111-1111-1111-1111-111111111102',
     'Kampala Flame-Grilled Chicken', 32000, 1, 32000, 'Half Chicken, Piri-Piri Lemon Herb'),
    ('11111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111110842', 'd1111111-1111-1111-1111-111111111105',
     'Passion & Ginger Cooler', 8500, 2, 17000, '500ml, Less Ice')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. TENANT B: DEMO BISTRO (KOLOLO, KAMPALA)
-- ----------------------------------------------------------------------------
-- Proves tenant isolation: completely independent dishes, tables, and orders.
INSERT INTO public.restaurants (
    id,
    name,
    slug,
    description,
    logo_url,
    phone,
    email,
    address,
    currency,
    is_active
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Demo Bistro',
    'demo-bistro',
    'Contemporary fusion dining and artisan coffees in Kololo.',
    NULL,
    '+256 750 987 654',
    'contact@demobistro.ug',
    'Upper Kololo Terrace, Kampala',
    'UGX',
    true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug;

-- Tables for Demo Bistro
INSERT INTO public.restaurant_tables (id, restaurant_id, table_number, location_zone, qr_code_token)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'B01', 'Garden', 'db_table_b01_token_99991'),
    ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'B02', 'Lounge', 'db_table_b02_token_99992')
ON CONFLICT (id) DO UPDATE
SET qr_code_token = EXCLUDED.qr_code_token,
    is_active = true;

-- Categories for Demo Bistro
INSERT INTO public.menu_categories (id, restaurant_id, name, description, display_order)
VALUES
    ('c2222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222222', 'Artisan Platters', 'Gourmet Ugandan-Continental fusion plates', 1),
    ('c2222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222222', 'Beverages', 'Craft herbal teas and cold-press coolers', 2)
ON CONFLICT (id) DO NOTHING;

-- Menu Items for Demo Bistro
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_available, preparation_time_minutes, image_url, display_order)
VALUES
    ('d2222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222201',
     'Tender Beef & Matooke Mash', 'Slow-braised beef shank served over silky matooke mash with rich groundnut sauce.',
     35000, true, 18, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', 1),

    ('d2222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222202',
     'Hibiscus Ginger Spritz (400ml)', 'Infusion of Luweero dried hibiscus flowers with fresh ginger and sparking water.',
     11000, true, 5, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', 2)
ON CONFLICT (id) DO NOTHING;

-- Initial Order for Demo Bistro Table B01
INSERT INTO public.orders (
    id,
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
    'e2222222-2222-2222-2222-222222220101',
    '22222222-2222-2222-2222-222222222222',
    'b0000000-0000-0000-0000-000000000001',
    '#DB-0101',
    'table',
    'preparing',
    'paid',
    46000,
    46000,
    'Mild pepper only.',
    'db_guest_token_b01_demo'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (restaurant_id, order_id, menu_item_id, item_name, unit_price, quantity, line_total, special_instructions)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222220101', 'd2222222-2222-2222-2222-222222222201',
     'Tender Beef & Matooke Mash', 35000, 1, 35000, NULL),
    ('22222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222220101', 'd2222222-2222-2222-2222-222222222202',
     'Hibiscus Ginger Spritz (400ml)', 11000, 1, 11000, NULL)
ON CONFLICT DO NOTHING;

-- Payment for Demo Bistro order
INSERT INTO public.payments (
    restaurant_id,
    order_id,
    amount,
    method,
    status,
    reference,
    notes
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'e2222222-2222-2222-2222-222222220101',
    46000,
    'mtn_momo',
    'verified',
    'MOMO-DB-98421',
    'Pre-paid via mobile money'
)
ON CONFLICT DO NOTHING;
