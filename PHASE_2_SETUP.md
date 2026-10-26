# Frank Foods — Phase 2: Database Architecture (SQLite on Device & PostgreSQL Automation)

## 1. Executive Summary

Phase 2 provides a dual-engine database architecture for **Frank Foods**:

1. **Active SQLite WebAssembly Engine (On-Device)**:
   - When the application runs on any device or browser, it automatically spins up an embedded SQLite database using WebAssembly (`sql.js`).
   - If the database does not exist on the device, it executes `CREATE TABLE` for all 8 core relational tables with foreign keys and check constraints.
   - It automatically populates pristine seed data for both tenants (**Frank Foods** and **Demo Bistro**).
   - Data can be retrieved (`SELECT`) and written (`INSERT`, `UPDATE`) in real time (e.g. guests placing orders, staff verifying payments, advancing status with the shift release policy gate, managers 86-ing menu items).
   - All writes are persisted to device storage (`localStorage`) so your data remains intact across refreshes.
   - Includes an in-app **Database & Tables Engine** console with live table inspection, SQL query runner, and `.sqlite` binary file export.

2. **Automated PostgreSQL Database & Tables Setup**:
   - Includes standalone executable script `scripts/setupPostgres.ts` that:
     - Connects to your PostgreSQL server.
     - Automatically creates database `frank_foods` if not present (`CREATE DATABASE frank_foods`).
     - Creates all 8 tables with composite primary keys, foreign keys, and constraints.
     - Populates initial multi-tenant seed data.
     - Runs automated data retrieval (`SELECT`) and data writing (`INSERT`, `UPDATE`) verification tests.
   - Ready for Supabase or standard PostgreSQL instances.

---

## 2. The 8 Core Relational Tables

Both the SQLite and PostgreSQL engines implement these 8 core tables:

| # | Table Name | Purpose & Isolation |
|---|------------|---------------------|
| 1 | `restaurants` | Root multi-tenant records (Frank Foods, Demo Bistro) with tax rates & currency. |
| 2 | `profiles` | Staff, manager, and owner profiles associated with their respective restaurant. |
| 3 | `menu_categories` | Menu groupings (Burgers, Grills, Sides, Fresh Juices, Artisan Pizzas). |
| 4 | `menu_items` | Dishes with prep times, chef choice tags, 86-ing availability, and prices. |
| 5 | `restaurant_tables` | Table QR stands with unique QR tokens and physical floor zones. |
| 6 | `orders` | Dine-in orders with status, payment status, guest tokens, and timestamps. |
| 7 | `order_items` | Snapshot items with immutable unit prices and `line_total = unit_price * quantity`. |
| 8 | `payments` | Audit trail of manual cash, MTN MoMo, and Airtel Money verified payments. |

---

## 3. Using SQLite on Device (Active Default)

### How It Works
When you open Frank Foods on any device or browser:
1. `src/lib/sqliteDatabase.ts` initializes the WebAssembly SQLite engine (`/sql-wasm.wasm`).
2. It looks for an existing database snapshot in device storage:
   - If not found: It executes `SQLITE_DDL` (creating all 8 tables) and `SQLITE_SEEDS` (populating initial categories, dishes, tables, and orders).
   - If found: It restores the database state with all previous orders and payments.
3. Every operation in the UI (browsing menu, customizing dishes, submitting guest orders, verifying staff payments, updating status, toggling availability) runs real SQL statements against SQLite and commits the state.

### Using the In-App Database & Tables Console
1. In the top navigation bar, click the **"Database & Tables"** button.
2. **Tab 1: SQLite Tables & Data**:
   - Inspect any of the 8 tables and browse up to 25 rows with real-time row counts.
   - Click **Download .sqlite File** to save the actual binary database file to your computer.
   - Click **Reset SQLite DB** to restore clean initial seed data at any time.
3. **Tab 2: Run SQL Queries**:
   - Type custom SQL queries (e.g. `SELECT * FROM orders;`, `SELECT item_name, line_total FROM order_items;`) and see immediate tabular results.
4. **Tab 3: PostgreSQL Setup Code & Script**:
   - Copy the automated setup terminal command, full PostgreSQL SQL script, or Node.js execution code.

---

## 4. Automated PostgreSQL Setup (Database, Tables & Data)

We provide an automated script to create a PostgreSQL database, generate tables, populate seed data, and verify reads and writes:

### Running via Terminal
```bash
# To run against local Postgres or a custom database:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npx tsx scripts/setupPostgres.ts
```

### What the Script Does:
1. **Connects to root PostgreSQL instance** and runs `CREATE DATABASE frank_foods;` (skips if already created).
2. **Connects to `frank_foods` database**.
3. **Creates all 8 tables** with composite foreign keys, unique constraints, and check constraints (`POSTGRES_COMPLETE_SETUP_SQL`).
4. **Seeds tenants, categories, dishes, and tables**.
5. **Executes Data Retrieval (Read Test)**:
   - Queries `restaurants`, `menu_items`, and `restaurant_tables`.
6. **Executes Data Writing (Write Test)**:
   - Inserts test order `#FF-TEST`.
   - Inserts order items.
   - Inserts verified payment.
   - Advances status to `preparing`.
   - Cleans up the test record and prints a success report.

---

## 5. Supabase / Cloud PostgreSQL Integration

To link your live Supabase project to the app:
1. In `.env` (or Secrets panel), set:
   ```bash
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
   ```
2. The applet automatically detects Supabase credentials and routes requests to the cloud database while maintaining the fallback to the local SQLite engine if credentials are omitted.
