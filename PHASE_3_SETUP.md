# Frank Foods — Phase 3: Mobile-First Customer Ordering, QR Table Identification, Cart & Order Tickets

## 1. Executive Summary

Phase 3 implements the complete, end-to-end customer ordering flow for **Frank Foods**:
- **Mobile-First Customer Menu**: Real-time browsing of restaurant-scoped dishes, prices in UGX, food images with fallbacks, active categories, search filtering, and automatic 86-ing guards for sold-out items.
- **QR Table Identification**: High-entropy QR token resolution via URL parameters (`?table_token=...` or `?token=...`), mapping directly to verified table numbers (e.g. `Table 07`) and zones (`Terrace`), with protection against invalid/inactive tokens.
- **Interactive Cart & Customizer**: Dynamic item customization (burger cook temperatures, transparent extras like extra cheddar, beef bacon, egg), quantity steppers (`+`/`-`), removal, line total arithmetic (`unit_price × quantity`), order-wide kitchen instructions, and local storage persistence.
- **Server/Database Authoritative Order Submission**: Strict database price recalculation overriding any client tampering, atomic creation of the order and snapshot `order_items`, preventing duplicate submissions.
- **Unique Ticket Numbering**: Collision-resistant ticket generation (e.g. `#FF-0842`) and high-entropy 24-byte `guest_access_token`.
- **Live Order Tracker & Confirmation**: 4-step live progress timeline, payment instructions (`Pending Staff Verification`), in-person cash/MTN MoMo/Airtel Money notice, and interactive "Call Server" alert.

---

## 2. Testing on a Mobile Phone

### Step 1: Accessing the App on Your Phone
Open your phone's browser (Safari, Chrome, etc.) and navigate to either:

1. **Direct QR Table Link (Frank Foods Table 07)**:
   ```
   https://YOUR_APP_URL/?table_token=qr_ff_table_07_live
   ```
2. **Direct QR Table Link (Frank Foods Table 04 - Indoor)**:
   ```
   https://YOUR_APP_URL/?table_token=qr_ff_table_04_live
   ```
3. **Direct QR Table Link (Demo Bistro Table B1 - Kololo)**:
   ```
   https://YOUR_APP_URL/?restaurant=demo-bistro&table_token=qr_db_table_01_live
   ```
4. **General Restaurant Browsing (Without Token)**:
   ```
   https://YOUR_APP_URL/
   ```
   *If opened without a token, the customer browses the active menu and can pick their table from the table selector dropdown.*

---

## 3. The Customer Ordering Journey (Step-by-Step)

1. **Browse Menu**:
   - The verified table (e.g., `Table 07 • Terrace`) is displayed at the top.
   - Use category chips (`Burgers`, `Grills`, `Sides`, `Fresh Juices`) or the search bar to find dishes.
   - Sold out items (86-ed) are dimmed with a `Sold Out` badge and cannot be added to the cart.
2. **Customize & Add to Cart**:
   - Tap **The Boss Burger** to open the customizer.
   - Select your cook preference (`Medium Well` or `Well Done`).
   - Toggle optional add-ons (`Extra Smoked Cheddar +UGX 3,500`, `Crispy Beef Bacon +UGX 5,000`, `Fried Egg +UGX 2,500`).
   - Tap **Add to Cart**.
   - Tap Quick Add on **Passion Mint Chiller** or **Truffle Fries**.
3. **Review Cart**:
   - Tap the floating bottom cart bar (**View Cart & Order**).
   - Adjust quantities with `+` or `-` buttons, or remove an item.
   - Enter kitchen notes in the special instructions box (e.g. *"Serve drinks first, extra napkins requested"*).
   - Check the transparent pricing breakdown with inclusive VAT.
4. **Submit Order**:
   - Tap **Confirm & Place Order**.
   - The button shows a spinner and disables duplicate submissions.
   - The database authoritatively validates prices and inserts the order + order items atomically.
   - The cart is cleared upon confirmed database write.
5. **Confirmation & Live Tracker**:
   - You are redirected to the Order Ticket view displaying your unique Ticket Number (e.g. `#FF-0843`).
   - Payment status displays **Action Required: Pending Verification**.
   - In-person payment notice informs you that a server will visit your table to collect Cash, MTN MoMo, or Airtel Money.
   - Tap **Call Server to Table** to alert floor staff in real time.
   - Tap **Browse Menu** if you wish to order additional items for the table.

---

## 4. Local SQLite Mode vs. Shared PostgreSQL/Supabase Mode

### Local SQLite On-Device Mode (Default / Development)
- **Engine**: Embedded WebAssembly SQLite (`sql.js`).
- **Storage**: Persistent in device storage (`localStorage`).
- **Intended Use**: Standalone mobile device testing, demonstrations, and automated test execution without external server configuration.
- **Scope**: Orders placed on a single device persist on that device. Staff and Customer screens running within the same browser session or device share the state immediately.

### Shared PostgreSQL / Supabase Mode (Production / Multi-Device)
- **Engine**: Remote PostgreSQL database instance with Row Level Security (RLS).
- **Configuration**:
  In `.env` or AI Studio Secrets, set:
  ```bash
  VITE_SUPABASE_URL="https://your-project.supabase.co"
  VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
  ```
- **Cross-Device Synchronization**:
  When a customer submits an order from their phone, it is written to the central PostgreSQL `orders` and `order_items` tables via the `create_guest_order` RPC. Staff on an iPad or terminal open to the Staff Order Dashboard see the order appear in their queue immediately!

---

## 5. Automated Tests

Run the customer ordering test suite at any time via:
```bash
npm test
# or: npx tsx scripts/testCustomerOrdering.ts
```

### Verified Test Scenarios:
1. **Menu Tenant Isolation**: Frank Foods and Demo Bistro dishes never leak across tenants.
2. **QR Table Token Resolution**: Valid tokens resolve to correct tables; invalid/inactive tokens are rejected.
3. **Unavailable (86-ed) Dish Rejection**: Dishes marked as unavailable cannot be ordered.
4. **Authoritative Price Recalculation**: Client-supplied prices are discarded in favor of trusted database prices.
5. **Atomic Order & Ticket Generation**: Generates unique `#FF-XXXX` ticket numbers and atomic order items.
6. **Guest Access Token Protection**: Only authorized tokens can read private order tracking details.
7. **Shift Release Policy Gate**: Unpaid orders cannot be advanced to preparation.
