# Frank Foods — Complete Multi-Restaurant System & Netlify Deployment Guide

## 1. Executive Summary & Architecture

**Frank Foods** is a multi-restaurant digital ordering and kitchen management platform built with React, TypeScript, and Tailwind CSS. The platform enables multiple independent restaurants to operate on a single deployed instance while maintaining tenant isolation, unified role-based authorization, and synchronized kitchen workflows.

```
+-----------------------------------------------------------------------------------+
|                           FRANK FOODS MULTI-TENANT WEB APP                        |
|                                                                                   |
|  [Customer QR Menu]        [Kitchen KDS (/kitchen)]     [Manager Hub (/manager)]  |
|  - Table Token Scanned     - Order Timer Tracking       - Real Sales & Shift Stats|
|  - Burger Customizer       - Web Audio Chime Alerts     - Menu Category & Dish DB |
|  - Server-Validated Cart   - 6-Step Workflow States     - Table Stand QR Codes    |
|  - Pay-at-the-End (Card)   - Cancellation Audit Log     - Staff Roster & Roles    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        RESTAURANT SERVICE & TENANT LAYER                         |
|                                                                                   |
|  - URL & Token Router: /menu, /cart, /orders/:ticket, /kitchen, /manager, /login  |
|  - Tenant Scope Filter: restaurant_id = 'frank-foods' | 'demo-bistro'             |
|  - Auth & Role Guards: 'owner' | 'manager' | 'kitchen' | 'staff'                  |
|  - Polling & Event Bus: 5-second automatic queue refresh                          |
+-----------------------------------------------------------------------------------+
                       |                                    |
                       v                                    v
+-------------------------------+   +-----------------------------------------------+
|  Local Engine: SQLite WASM    |   |  Cloud Engine: PostgreSQL / Supabase          |
|  (Embedded on-device sql.js)  |   |  (Central RLS Database for Cross-Device KDS)  |
+-------------------------------+   +-----------------------------------------------+
```

---

## 2. Multi-Restaurant Tenancy & Isolation

Each tenant operates with dedicated records partitioned strictly by `restaurant_id`:
- **Frank Foods Kampala** (`frank-foods`): Fast-casual gourmet burgers, wings, fresh juices, and sides.
- **Demo Bistro Kololo** (`demo-bistro`): Wood-fired pizzas, pastas, and Mediterranean mains.

### Isolation Rules
1. **Customer QR Tokens**:
   - A customer scanning `?table_token=qr_ff_table_07_live` only ever sees items, categories, and branding for Frank Foods.
   - Forged or mismatched restaurant parameters are validated against the database table stand token.
2. **Staff Authorization**:
   - Kitchen and Manager staff are bound to their assigned `restaurant_id`.
   - A Frank Foods kitchen user (`kitchen@frankfoods.ug`) cannot view, accept, or cancel orders belonging to Demo Bistro.
3. **Database Consistency**:
   - All queries, mutations, line-item insertions, and stats aggregations filter strictly by `restaurant_id`.

---

## 3. Customer Journey & Ordering Flow

1. **Table QR Code Scan**:
   - Customer scans table QR code (or opens link: `/?table_token=qr_ff_table_07_live`).
   - The token is verified against `restaurant_tables`; invalid or disabled tokens display an intuitive resolution screen.
2. **Menu Browsing & Search**:
   - High-contrast responsive catalog with category tabs (`Burgers`, `Grills`, `Sides`, `Fresh Juices`).
   - Real-time search filter by dish name and description.
   - Sold-out items (86-ed) are visually dimmed and protected from cart addition.
3. **Item Customizer & Cart**:
   - Customizable cook temperature (`Medium Well`, `Well Done`).
   - Add-on modifiers (Extra Smoked Cheddar, Crispy Beef Bacon, Fried Egg) with transparent pricing in UGX.
   - Quantity steppers (`+` / `-`), item removal, and order-wide kitchen notes.
4. **Authoritative Order Placement**:
   - Orders are submitted to the database with server-calculated totals, preventing client-side price tampering.
   - Atomic transaction creates the order record and snapshot line items.
   - High-entropy human-readable ticket generated (e.g., `#FF-0003`) alongside a 24-byte `guest_access_token`.
5. **Dine-In Progression & Pay-At-The-End**:
   - The order enters the kitchen immediately (`preparing`).
   - Customer dines first, and pays at the conclusion of the meal.
   - Supported payment methods include **Card (POS Terminal)**, **MTN MoMo**, **Airtel Money**, and **Cash**.
   - Customer can alert floor staff via the **Call Server to Table** button.

---

## 4. Kitchen Display System (KDS) — `/kitchen`

Accessible at `/kitchen` or via the top navigation switcher.

- **Color-Coded Elapsed Timers**:
  - `Green (< 10 mins)`: Fresh ticket, normal queue.
  - `Amber (10 – 20 mins)`: Priority preparation.
  - `Red Pulsing (> 20 mins)`: Urgently delayed ticket requiring expediter attention.
- **Audio Chime Alerts**:
  - Built-in Web Audio API synthesizer (`playKitchenChime()`) sounds a distinctive two-tone bell upon receipt of incoming orders without external asset dependencies.
  - Can be toggled on/off in the header.
- **6-Step Workflow Progression**:
  1. `pending`: Order received by system.
  2. `confirmed`: Kitchen acknowledges ticket (`Accept Ticket`).
  3. `preparing`: Cook stations are preparing dishes (`Start Cooking`).
  4. `ready`: Plated dishes at pass ready for runner (`Ready at Pass`).
  5. `served`: Delivered to dining table (`Mark Served`).
  6. `cancelled`: Authorized cancellation with mandatory audit reason.
- **Operational Cancellation Audit**:
  - Cancelling an order prompts for a mandatory reason (e.g., "Customer changed mind", "Out of stock item").
  - Cancellation reason and timestamp are persisted to the database.

---

## 5. Restaurant Manager Hub — `/manager`

Accessible at `/manager` for users with `manager`, `owner`, or `admin` roles.

- **Real Database Operational Metrics**:
  - Today's Total Sales (calculated strictly from paid and non-cancelled orders).
  - Active Orders count, Average Ticket Size, and Table Occupancy rate.
- **Menu & Catalog Management**:
  - Category manager: Add, edit, or remove categories.
  - Dish manager: Add dishes with custom price, description, category, and image URL.
  - 86-ing toggle: Instantly mark items as sold out or available.
- **Table Stands & QR Code Generation**:
  - Add tables specifying table number, capacity, and zone (`Indoor`, `Terrace`, `Bar`, `Patio`).
  - Generate high-entropy secure QR tokens.
  - **Individual Stand Preview**: View and print stylish A6 acrylic tent cards with table number, scannable QR code, and guest Wi-Fi details.
  - **Multi-Table Print Sheet**: Print all active table QR stands onto a single sheet for bulk laminating.
  - **Regenerate Token**: Revoke compromised QR tokens and issue new ones instantly.
- **Staff Roster Management**:
  - Invite new staff members with designated roles (`manager`, `kitchen`, `staff`).
  - View existing staff members and active sessions.

---

## 6. Staff Authentication & Default Credentials

Navigate to `/login` to sign in. The login screen includes instant one-click quick-select demo buttons for testing:

| Email | Role | Restaurant | Default Password |
|---|---|---|---|
| `manager@frankfoods.ug` | Manager / Owner | Frank Foods | `admin123` |
| `kitchen@frankfoods.ug` | Head Chef / Kitchen | Frank Foods | `kitchen123` |
| `staff@frankfoods.ug` | Floor Staff / Runner | Frank Foods | `staff123` |
| `manager@demobistro.ug` | Manager | Demo Bistro | `admin123` |
| `kitchen@demobistro.ug` | Kitchen | Demo Bistro | `kitchen123` |

---

## 7. Netlify Deployment Guide

The application is pre-configured for deployment on Netlify.

### Repository Files Configured:
1. `public/_redirects`:
   ```
   /*    /index.html   200
   ```
2. `netlify.toml`:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Step-by-Step Netlify Setup:
1. **Connect Git Repository**:
   - Log into [Netlify](https://app.netlify.com/).
   - Click **Add new site** > **Import an existing project**.
   - Select your GitHub / GitLab repository.
2. **Build Settings**:
   - **Base directory**: (leave blank / root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. **Environment Variables (Required for live multi-device ordering)**:
   In Netlify Site Settings > **Environment variables**:
   - `VITE_SUPABASE_URL`: Your Supabase project URL (e.g., `https://xyzcompany.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase public anonymous API key
   These values are required for customer orders to reach the staff dashboard across devices. Without them, production checkout is disabled rather than saving an order only in the customer's browser. SQLite device mode remains available during local development.
4. **Deploy Site**:
   - Click **Deploy Site**.
   - Once published, Netlify provides a live URL (e.g., `https://frank-foods.netlify.app`).
   - Deep links like `/kitchen`, `/manager`, and `/menu?table_token=...` work immediately without 404 errors thanks to the SPA redirect rule.

---

## 8. Automated Verification & Testing

To run the automated 9-scenario test suite verifying tenant isolation, QR token resolution, authoritative pricing, KDS transitions, card payment, and staff provisioning:

```bash
npm test
# or: npx tsx scripts/testCustomerOrdering.ts
```

All 9 tests execute against the embedded database engine and output verified results:
- **Test 1**: Menu Tenant Isolation
- **Test 2**: QR Table Token Resolution & Inactive Token Rejection
- **Test 3**: Unavailable (86-ed) Dish Rejection
- **Test 4**: Server-Authoritative Price Recalculation
- **Test 5**: Unique Ticket Number Generation & Atomic Order Persistence
- **Test 6**: Guest Access Token Authorization
- **Test 7**: Dine-In Progression & Pay-At-The-End with Card
- **Test 8**: Kitchen KDS Workflow & Authorized Cancellation Audit
- **Test 9**: Multi-Restaurant Table Stand QR & Staff Provisioning
