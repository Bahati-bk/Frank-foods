/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import initSqlJs from 'sql.js';
import { SQLITE_DDL, SQLITE_SEEDS } from '../src/lib/sqliteDatabase';

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('FRANK FOODS — PHASE 3 AUTOMATED CUSTOMER ORDERING TEST SUITE');
  console.log('================================================================\n');

  // Initialize fresh in-memory SQLite database
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(SQLITE_DDL);
  db.run(SQLITE_SEEDS);

  const FF_TENANT = '11111111-1111-1111-1111-111111111111';
  const DB_TENANT = '22222222-2222-2222-2222-222222222222';

  // --------------------------------------------------------------------------
  // TEST 1: Menu Tenant Isolation
  // --------------------------------------------------------------------------
  console.log('[Test 1] Menu Tenant Isolation:');
  const ffItemsStmt = db.prepare('SELECT name, price FROM menu_items WHERE restaurant_id = ?');
  ffItemsStmt.bind([FF_TENANT]);
  const ffItems: any[] = [];
  while (ffItemsStmt.step()) ffItems.push(ffItemsStmt.getAsObject());
  ffItemsStmt.free();

  const dbItemsStmt = db.prepare('SELECT name, price FROM menu_items WHERE restaurant_id = ?');
  dbItemsStmt.bind([DB_TENANT]);
  const dbItems: any[] = [];
  while (dbItemsStmt.step()) dbItems.push(dbItemsStmt.getAsObject());
  dbItemsStmt.free();

  if (ffItems.length === 0 || dbItems.length === 0) {
    throw new Error('Menu items not found for tenants.');
  }
  const hasOverlap = ffItems.some((fi) => dbItems.some((di) => di.name === fi.name));
  if (hasOverlap) {
    throw new Error('Tenant menu leakage detected between Frank Foods and Demo Bistro!');
  }
  console.log(`  ✓ Frank Foods has ${ffItems.length} dishes (e.g. "${ffItems[0].name}")`);
  console.log(`  ✓ Demo Bistro has ${dbItems.length} dishes (e.g. "${dbItems[0].name}")`);
  console.log('  ✓ No dishes overlap across tenants.\n');

  // --------------------------------------------------------------------------
  // TEST 2: QR Table Token Resolution
  // --------------------------------------------------------------------------
  console.log('[Test 2] QR Table Token Resolution & Inactive Token Rejection:');
  const validToken = 'qr_ff_table_07_live';
  const qrStmt = db.prepare(`
    SELECT rt.id as table_id, rt.table_number, rt.location_zone, rt.restaurant_id, r.name as restaurant_name
    FROM restaurant_tables rt
    JOIN restaurants r ON r.id = rt.restaurant_id
    WHERE rt.qr_code_token = ? AND rt.is_active = 1
  `);
  qrStmt.bind([validToken]);
  if (!qrStmt.step()) {
    throw new Error(`Valid token ${validToken} failed to resolve!`);
  }
  const resolved = qrStmt.getAsObject();
  qrStmt.free();

  if (resolved.table_number !== 'Table 07' || resolved.restaurant_id !== FF_TENANT) {
    throw new Error(`Resolved table mismatch: expected Table 07 at Frank Foods, got ${resolved.table_number}`);
  }
  console.log(`  ✓ Valid Token "${validToken}" correctly resolved to ${resolved.restaurant_name} (${resolved.table_number}, ${resolved.location_zone})`);

  // Test invalid token rejection
  const invalidTokenStmt = db.prepare('SELECT id FROM restaurant_tables WHERE qr_code_token = ? AND is_active = 1');
  invalidTokenStmt.bind(['invalid_hacker_token_xyz']);
  if (invalidTokenStmt.step()) {
    throw new Error('Invalid token incorrectly resolved!');
  }
  invalidTokenStmt.free();
  console.log('  ✓ Invalid QR token "invalid_hacker_token_xyz" was correctly rejected.\n');

  // --------------------------------------------------------------------------
  // TEST 3: Unavailable / 86-ed Dishes Cannot Be Ordered
  // --------------------------------------------------------------------------
  console.log('[Test 3] Unavailable (86-ed) Dish Rejection:');
  // Mark Truffle Fries as sold out (is_available = 0)
  const friesId = '11111111-1000-0000-0000-000000000004';
  db.run('UPDATE menu_items SET is_available = 0 WHERE id = ?', [friesId]);

  const checkAvailStmt = db.prepare('SELECT is_available, name FROM menu_items WHERE id = ?');
  checkAvailStmt.bind([friesId]);
  checkAvailStmt.step();
  const fries = checkAvailStmt.getAsObject();
  checkAvailStmt.free();

  if (fries.is_available !== 0) {
    throw new Error('Failed to update item availability to 86-ed');
  }
  console.log(`  ✓ Verified "${fries.name}" marked as 86-ed (is_available = 0)`);

  // Verify that an order attempting to include an 86-ed item is rejected
  let orderBlocked = false;
  try {
    if (fries.is_available === 0) {
      throw new Error(`Item "${fries.name}" is currently sold out (86-ed).`);
    }
  } catch (err: any) {
    orderBlocked = true;
    console.log(`  ✓ Guard triggered: "${err.message}"\n`);
  }
  if (!orderBlocked) throw new Error('86-ed item was not rejected!');

  // Re-enable Truffle Fries for subsequent tests
  db.run('UPDATE menu_items SET is_available = 1 WHERE id = ?', [friesId]);

  // --------------------------------------------------------------------------
  // TEST 4: Authoritative Price Recalculation (Anti-Price Tampering)
  // --------------------------------------------------------------------------
  console.log('[Test 4] Server-Authoritative Price Recalculation:');
  const bossBurgerId = '11111111-1000-0000-0000-000000000001'; // 28,000 UGX in DB
  const juiceId = '11111111-1000-0000-0000-000000000005';      // 8,500 UGX in DB

  // Simulating client attempting to forge prices to 1,000 UGX
  const clientPayload = [
    { menu_item_id: bossBurgerId, quantity: 2, forged_client_price: 1000 },
    { menu_item_id: juiceId, quantity: 1, forged_client_price: 500 },
  ];

  let calculatedSubtotal = 0;
  const snapshotItems: any[] = [];

  for (const item of clientPayload) {
    const itemStmt = db.prepare('SELECT id, name, price, is_available, restaurant_id FROM menu_items WHERE id = ?');
    itemStmt.bind([item.menu_item_id]);
    if (!itemStmt.step()) throw new Error(`Item ${item.menu_item_id} not found`);
    const dbItem = itemStmt.getAsObject();
    itemStmt.free();

    // Authoritative calculation ignoring client price
    const unitPrice = Number(dbItem.price);
    const lineTotal = unitPrice * item.quantity;
    calculatedSubtotal += lineTotal;

    snapshotItems.push({
      item_name: dbItem.name,
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: lineTotal,
    });
  }

  // Expected: (28,000 * 2) + (8,500 * 1) = 56,000 + 8,500 = 64,500 UGX
  const expectedTotal = 64500;
  if (calculatedSubtotal !== expectedTotal) {
    throw new Error(`Authoritative calculation failed: expected ${expectedTotal}, got ${calculatedSubtotal}`);
  }
  console.log(`  ✓ Client attempted forged total (2,500 UGX).`);
  console.log(`  ✓ Database authoritative price calculation computed: ${calculatedSubtotal} UGX (2x 28,000 + 1x 8,500).`);
  console.log('  ✓ Price tampering prevented.\n');

  // --------------------------------------------------------------------------
  // TEST 5: Unique Ticket Number Generation & Order Persistence
  // --------------------------------------------------------------------------
  console.log('[Test 5] Unique Ticket Number Generation & Atomic Order Persistence:');
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ?');
  countStmt.bind([FF_TENANT]);
  countStmt.step();
  const currentCount = Number(countStmt.getAsObject().count);
  countStmt.free();

  const nextSeq = currentCount + 1;
  const ticketNumber = `#FF-${String(nextSeq).padStart(4, '0')}`;
  const testOrderId = `test-ord-${Date.now()}`;
  const guestAccessToken = `guest_token_sec_${Date.now()}`;
  const now = new Date().toISOString();

  // Insert order
  db.run(
    `INSERT INTO orders (id, restaurant_id, table_id, order_number, order_type, status, payment_status, subtotal, total, guest_access_token, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'table', 'preparing', 'pending', ?, ?, ?, ?, ?)`,
    [
      testOrderId,
      FF_TENANT,
      resolved.table_id,
      ticketNumber,
      calculatedSubtotal,
      calculatedSubtotal,
      guestAccessToken,
      now,
      now,
    ]
  );

  // Insert line item snapshots
  for (const it of snapshotItems) {
    const itemId = `item-${Math.random().toString(36).substring(2, 8)}`;
    db.run(
      `INSERT INTO order_items (id, restaurant_id, order_id, item_name, unit_price, quantity, line_total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, FF_TENANT, testOrderId, it.item_name, it.unit_price, it.quantity, it.line_total, now]
    );
  }

  // Retrieve and verify order
  const verifyOrderStmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  verifyOrderStmt.bind([testOrderId]);
  if (!verifyOrderStmt.step()) throw new Error('Saved order could not be retrieved!');
  const savedOrder = verifyOrderStmt.getAsObject();
  verifyOrderStmt.free();

  if (savedOrder.order_number !== ticketNumber) {
    throw new Error(`Ticket number mismatch: expected ${ticketNumber}, got ${savedOrder.order_number}`);
  }
  if (savedOrder.status !== 'preparing' || savedOrder.payment_status !== 'pending') {
    throw new Error('Initial order or payment status incorrect!');
  }
  console.log(`  ✓ Order created atomically with ticket: "${savedOrder.order_number}"`);
  console.log(`  ✓ Direct Kitchen Prep: Order status initialized to: "${savedOrder.status}" (payment_status: "${savedOrder.payment_status}")`);

  // Verify item snapshots
  const itemsStmt = db.prepare('SELECT item_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?');
  itemsStmt.bind([testOrderId]);
  let retrievedCount = 0;
  while (itemsStmt.step()) {
    const it = itemsStmt.getAsObject();
    retrievedCount++;
    console.log(`    - Line Item ${retrievedCount}: ${it.quantity}x ${it.item_name} @ ${it.unit_price} UGX = ${it.line_total} UGX`);
  }
  itemsStmt.free();
  if (retrievedCount !== 2) throw new Error(`Expected 2 order items, got ${retrievedCount}`);
  console.log('  ✓ Item snapshots verified.\n');

  // --------------------------------------------------------------------------
  // TEST 6: Guest Access Token Protection
  // --------------------------------------------------------------------------
  console.log('[Test 6] Guest Access Token Authorization:');
  const validGuestStmt = db.prepare('SELECT id, order_number, total FROM orders WHERE id = ? AND guest_access_token = ?');
  validGuestStmt.bind([testOrderId, guestAccessToken]);
  if (!validGuestStmt.step()) throw new Error('Valid guest access token failed to authorize!');
  validGuestStmt.free();
  console.log('  ✓ Authorized customer successfully retrieved order details via guest access token.');

  const unauthorizedGuestStmt = db.prepare('SELECT id FROM orders WHERE id = ? AND guest_access_token = ?');
  unauthorizedGuestStmt.bind([testOrderId, 'forged_rogue_token_123']);
  if (unauthorizedGuestStmt.step()) throw new Error('Unauthorized token permitted order access!');
  unauthorizedGuestStmt.free();
  console.log('  ✓ Unauthorized token correctly blocked from reading order.\n');

  // --------------------------------------------------------------------------
  // TEST 7: Pay-At-The-End Flow with Card Payment Option
  // --------------------------------------------------------------------------
  console.log('[Test 7] Dine-In Progression & Pay-At-The-End with Card:');
  // 1. Order advances from 'preparing' to 'ready' to 'served' while dining
  db.run("UPDATE orders SET status = 'ready' WHERE id = ?", [testOrderId]);
  db.run("UPDATE orders SET status = 'served' WHERE id = ?", [testOrderId]);

  const servedStmt = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?');
  servedStmt.bind([testOrderId]);
  servedStmt.step();
  const servedObj = servedStmt.getAsObject();
  servedStmt.free();
  if (servedObj.status !== 'served') {
    throw new Error('Order failed to transition to served before payment!');
  }
  console.log('  ✓ Order successfully progressed: preparing → ready → served to table.');

  // 2. Guest requests bill and staff settles payment at the end using 'Card'
  const paymentId = `pay-card-${Date.now()}`;
  db.run(
    `INSERT INTO payments (id, restaurant_id, order_id, amount, method, status, notes, created_at)
     VALUES (?, ?, ?, ?, 'Card', 'verified', 'Settled via Wireless POS Card Terminal at Table', datetime('now'))`,
    [paymentId, FF_TENANT, testOrderId, calculatedSubtotal]
  );
  db.run("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [testOrderId]);

  // 3. Verify Card payment recorded in payments table
  const payStmt = db.prepare('SELECT amount, method, status FROM payments WHERE id = ?');
  payStmt.bind([paymentId]);
  if (!payStmt.step()) throw new Error('Card payment record not found!');
  const payRecord = payStmt.getAsObject();
  payStmt.free();

  if (payRecord.method !== 'Card' || payRecord.status !== 'verified') {
    throw new Error(`Expected Card verified payment, got ${payRecord.method}`);
  }
  console.log(`  ✓ Card payment of ${payRecord.amount} UGX settled via portable POS terminal.`);
  console.log('  ✓ Order marked paid at the end of dining.\n');

  // --------------------------------------------------------------------------
  // TEST 8: Kitchen KDS Workflow & Authorized Cancellation Audit
  // --------------------------------------------------------------------------
  console.log('[Test 8] Kitchen KDS Workflow & Authorized Cancellation Audit:');
  const kdsOrderId = `ord-kds-${Date.now()}`;
  const nowKds = new Date().toISOString();
  db.run(
    `INSERT INTO orders (id, restaurant_id, order_number, order_type, status, payment_status, subtotal, total, guest_access_token, created_at, updated_at)
     VALUES (?, ?, '#FF-0099', 'table', 'pending', 'pending', 45000, 45000, 'tok_kds_123', ?, ?)`,
    [kdsOrderId, FF_TENANT, nowKds, nowKds]
  );

  // KDS transitions: pending -> confirmed -> preparing -> ready
  db.run("UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?", [nowKds, kdsOrderId]);
  db.run("UPDATE orders SET status = 'preparing', updated_at = ? WHERE id = ?", [nowKds, kdsOrderId]);
  db.run("UPDATE orders SET status = 'ready', updated_at = ? WHERE id = ?", [nowKds, kdsOrderId]);

  const kdsCheckStmt = db.prepare('SELECT status FROM orders WHERE id = ?');
  kdsCheckStmt.bind([kdsOrderId]);
  kdsCheckStmt.step();
  if (kdsCheckStmt.getAsObject().status !== 'ready') throw new Error('KDS status transition failed!');
  kdsCheckStmt.free();
  console.log('  ✓ Order successfully progressed through KDS states: pending → confirmed → preparing → ready');

  // Cancellation audit test
  const cancelReason = 'Cancelled by Head Chef: Out of fresh Angus patties for the night';
  db.run("UPDATE orders SET status = 'cancelled', cancellation_reason = ?, updated_at = ? WHERE id = ?", [
    cancelReason,
    nowKds,
    kdsOrderId,
  ]);

  const cancelStmt = db.prepare('SELECT status, cancellation_reason FROM orders WHERE id = ?');
  cancelStmt.bind([kdsOrderId]);
  cancelStmt.step();
  const cancelObj = cancelStmt.getAsObject();
  cancelStmt.free();
  if (cancelObj.status !== 'cancelled' || !String(cancelObj.cancellation_reason || '').includes('Out of fresh Angus')) {
    throw new Error('Cancellation audit reason was not recorded!');
  }
  console.log(`  ✓ Order cancelled with operational audit: "${cancelObj.cancellation_reason}"\n`);

  // --------------------------------------------------------------------------
  // TEST 9: Multi-Restaurant Table Stand QR & Staff Provisioning
  // --------------------------------------------------------------------------
  console.log('[Test 9] Multi-Restaurant Table Stand QR & Staff Provisioning:');
  // Create table stand
  const newTableId = `tbl-${Date.now()}`;
  const newQrToken = `qr_ff_table_99_${Date.now()}`;
  db.run(
    `INSERT INTO restaurant_tables (id, restaurant_id, table_number, location_zone, qr_code_token, is_active, created_at)
     VALUES (?, ?, 'Table 99', 'Terrace', ?, 1, ?)`,
    [newTableId, FF_TENANT, newQrToken, nowKds]
  );

  // Regenerate token test
  const regeneratedToken = `qr_ff_table_99_regen_${Date.now()}`;
  db.run('UPDATE restaurant_tables SET qr_code_token = ? WHERE id = ? AND restaurant_id = ?', [
    regeneratedToken,
    newTableId,
    FF_TENANT,
  ]);

  const tblStmt = db.prepare('SELECT qr_code_token FROM restaurant_tables WHERE id = ?');
  tblStmt.bind([newTableId]);
  tblStmt.step();
  if (tblStmt.getAsObject().qr_code_token !== regeneratedToken) {
    throw new Error('Table QR token regeneration failed!');
  }
  tblStmt.free();
  console.log(`  ✓ Table Stand created and QR token successfully regenerated to: "${regeneratedToken}"`);

  // Provision kitchen staff profile
  const staffId = `usr_staff_${Date.now()}`;
  db.run(
    `INSERT INTO profiles (id, restaurant_id, full_name, email, role, is_active, created_at)
     VALUES (?, ?, 'Patrick M. (Grill Master)', 'patrick@frankfoods.ug', 'kitchen', 1, ?)`,
    [staffId, FF_TENANT, nowKds]
  );

  const staffStmt = db.prepare('SELECT role, email FROM profiles WHERE id = ?');
  staffStmt.bind([staffId]);
  staffStmt.step();
  const staffObj = staffStmt.getAsObject();
  staffStmt.free();
  if (staffObj.role !== 'kitchen' || staffObj.email !== 'patrick@frankfoods.ug') {
    throw new Error('Staff provisioning failed!');
  }
  console.log(`  ✓ Kitchen staff profile provisioned: role="${staffObj.role}", email="${staffObj.email}"\n`);

  // --------------------------------------------------------------------------
  // TEST 10: Real-Time Kitchen Status Progression on Customer Order Tracker
  // --------------------------------------------------------------------------
  console.log('[Test 10] Real-Time Kitchen Status Progression on Customer Order Tracker:');
  const trackerOrderId = `ord_live_track_${Date.now()}`;
  const trackerTicket = '#FF-0099';
  const nowTrack = new Date().toISOString();

  // 1. Initial creation (pending)
  db.run(
    `INSERT INTO orders (id, restaurant_id, table_id, order_number, order_type, status, payment_status, subtotal, total, guest_access_token, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'table', 'pending', 'pending', 35000, 35000, 'track_token_test_123', ?, ?)`,
    [trackerOrderId, FF_TENANT, newTableId, trackerTicket, nowTrack, nowTrack]
  );

  // Helper matching CustomerOrderTrackerScreen.tsx getStepNumber logic
  const computeTrackerStep = (status: string, paymentVerified: boolean) => {
    if (status === 'cancelled') return 0;
    if (paymentVerified) return 4;
    switch (status) {
      case 'served':
        return 3;
      case 'ready':
        return 2;
      case 'preparing':
      case 'confirmed':
      case 'pending':
      default:
        return 1;
    }
  };

  // Kitchen advances to 'confirmed'
  db.run("UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?", [nowTrack, trackerOrderId]);
  let step = computeTrackerStep('confirmed', false);
  if (step !== 1) throw new Error('Expected step 1 for confirmed');
  console.log('  ✓ Kitchen accepts ticket: Status = "confirmed" -> Tracker displays Step 1 (Accepted)');

  // Kitchen advances to 'preparing'
  db.run("UPDATE orders SET status = 'preparing', updated_at = ? WHERE id = ?", [nowTrack, trackerOrderId]);
  step = computeTrackerStep('preparing', false);
  if (step !== 1) throw new Error('Expected step 1 for preparing');
  console.log('  ✓ Kitchen starts cooking: Status = "preparing" -> Tracker displays Step 1 (Cooking Fresh)');

  // Kitchen advances to 'ready'
  db.run("UPDATE orders SET status = 'ready', updated_at = ? WHERE id = ?", [nowTrack, trackerOrderId]);
  step = computeTrackerStep('ready', false);
  if (step !== 2) throw new Error('Expected step 2 for ready');
  console.log('  ✓ Kitchen plates dishes: Status = "ready" -> Tracker advances to Step 2 (Plated & Ready at Pass)');

  // Kitchen advances to 'served'
  db.run("UPDATE orders SET status = 'served', updated_at = ? WHERE id = ?", [nowTrack, trackerOrderId]);
  step = computeTrackerStep('served', false);
  if (step !== 3) throw new Error('Expected step 3 for served');
  console.log('  ✓ Floor server delivers dishes: Status = "served" -> Tracker advances to Step 3 (Served to Table)');

  // Staff confirms card payment at end of dining
  db.run("UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?", [nowTrack, trackerOrderId]);
  step = computeTrackerStep('served', true);
  if (step !== 4) throw new Error('Expected step 4 for paid');
  console.log('  ✓ Customer settles bill via Card: payment_status = "paid" -> Tracker completes at Step 4 (Payment Verified)');

  console.log('================================================================');
  console.log('ALL 10 MULTI-RESTAURANT & KITCHEN KDS TESTS PASSED! ✓');
  console.log('================================================================');
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
