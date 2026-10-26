/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import { POSTGRES_COMPLETE_SETUP_SQL } from '../src/lib/postgresDatabase';

const { Client } = pg;

// Read DATABASE_URL or default to standard local PostgreSQL
const defaultBaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function setupPostgres() {
  console.log('================================================================');
  console.log('FRANK FOODS: POSTGRESQL DATABASE, TABLES & SEED INITIALIZER');
  console.log('================================================================');

  // Step 1: Connect to server to check/create database
  console.log('\n[1/5] Connecting to PostgreSQL root instance...');
  const rootClient = new Client({ connectionString: defaultBaseUrl });
  try {
    await rootClient.connect();
    console.log('Connected to root database.');

    console.log('[2/5] Creating database "frank_foods" if not already present...');
    const checkDbRes = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = 'frank_foods'");
    if (checkDbRes.rowCount === 0) {
      await rootClient.query('CREATE DATABASE frank_foods');
      console.log('Created database: frank_foods');
    } else {
      console.log('Database "frank_foods" already exists.');
    }
  } catch (err: any) {
    console.warn('Notice during database creation step (continuing):', err.message);
  } finally {
    try {
      await rootClient.end();
    } catch {}
  }

  // Step 2: Connect to frank_foods database directly
  const targetDbUrl = defaultBaseUrl.includes('/postgres')
    ? defaultBaseUrl.replace('/postgres', '/frank_foods')
    : defaultBaseUrl;

  console.log(`\n[3/5] Connecting to target database: ${targetDbUrl.replace(/:[^:]*@/, ':****@')}...`);
  const appClient = new Client({ connectionString: targetDbUrl });
  await appClient.connect();

  try {
    // Step 3: Run full table creation and seeds DDL
    console.log('[4/5] Creating 8 core tables, composite foreign keys, constraints, and seeds...');
    await appClient.query(POSTGRES_COMPLETE_SETUP_SQL);
    console.log('Tables and seeds deployed successfully.');

    // Step 4: Verify retrieving data (Read Test)
    console.log('\n[5/5] Testing Data Retrieval (SELECT) & Writing (INSERT/UPDATE)...');
    
    // Read test
    const restaurantRes = await appClient.query('SELECT id, name, slug FROM public.restaurants ORDER BY name ASC');
    console.log(`\n--- Data Retrieved: ${restaurantRes.rowCount} Restaurants ---`);
    restaurantRes.rows.forEach((r) => console.log(` * ${r.name} (${r.slug}) [ID: ${r.id}]`));

    const menuRes = await appClient.query('SELECT count(*) as count FROM public.menu_items');
    console.log(` * Menu Items Loaded: ${menuRes.rows[0].count} dishes`);

    const tableRes = await appClient.query('SELECT count(*) as count FROM public.restaurant_tables');
    console.log(` * Restaurant Tables Loaded: ${tableRes.rows[0].count} tables`);

    // Write test
    console.log('\n--- Data Write Test ---');
    const testOrderId = '99999999-9999-9999-9999-999999999999';
    const ffId = '11111111-1111-1111-1111-111111111111';

    // Insert test order
    await appClient.query(`
      INSERT INTO public.orders (id, restaurant_id, order_number, order_type, status, payment_status, subtotal, total, guest_access_token)
      VALUES ($1, $2, '#FF-TEST', 'table', 'pending_payment', 'pending', 28000, 28000, 'test_token_123')
      ON CONFLICT (id) DO UPDATE SET subtotal = 28000
    `, [testOrderId, ffId]);
    console.log(' * Successfully wrote test order: #FF-TEST');

    // Insert test item
    await appClient.query(`
      INSERT INTO public.order_items (restaurant_id, order_id, item_name, unit_price, quantity, line_total)
      VALUES ($1, $2, 'The Boss Burger (Double Angus)', 28000, 1, 28000)
    `, [ffId, testOrderId]);
    console.log(' * Successfully wrote test order item (28,000 UGX)');

    // Verify payment write
    await appClient.query(`
      INSERT INTO public.payments (restaurant_id, order_id, amount, method, status, notes)
      VALUES ($1, $2, 28000, 'Cash', 'verified', 'Test automated payment verification')
    `, [ffId, testOrderId]);
    await appClient.query(`UPDATE public.orders SET payment_status = 'paid', status = 'preparing' WHERE id = $1`, [testOrderId]);
    console.log(' * Successfully verified payment and advanced status to "preparing"');

    // Clean up test order
    await appClient.query('DELETE FROM public.orders WHERE id = $1', [testOrderId]);
    console.log(' * Cleaned up test record.');

    console.log('\n================================================================');
    console.log('SUCCESS: POSTGRESQL DATABASE & TABLES READY FOR FRANK FOODS!');
    console.log('================================================================');
  } finally {
    await appClient.end();
  }
}

// Execute when called directly
setupPostgres().catch((err) => {
  console.error('\nPostgreSQL Setup Error:', err.message);
  console.log('\nTip: To run against your PostgreSQL instance, set DATABASE_URL:');
  console.log('DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx tsx scripts/setupPostgres.ts');
  process.exit(1);
});
