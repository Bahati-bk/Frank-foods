import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../../types/dining';
import { formatUGX } from '../../utils/format';
import { playKitchenChime } from '../../utils/sound';

interface Props {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, cancellationReason?: string) => void;
  onRefreshOrders?: () => void;
  onSelectScreen?: (screenId: string) => void;
  onSignOut?: () => void;
  restaurantName: string;
  branchName: string;
  staffName?: string;
}

export const KitchenKdsScreen: React.FC<Props> = ({
  orders,
  onUpdateOrderStatus,
  onRefreshOrders,
  onSelectScreen,
  onSignOut,
  restaurantName,
  branchName,
  staffName = 'Chef Ronald K. (Hot Line)',
}) => {
  const [activeFilter, setActiveFilter] = useState<'active' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'all'>('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);

  // Detect new orders and chime
  useEffect(() => {
    if (orders.length > lastOrderCount) {
      if (soundEnabled) {
        playKitchenChime();
      }
    }
    setLastOrderCount(orders.length);
  }, [orders.length, soundEnabled, lastOrderCount]);

  // Periodic elapsed timer ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'active') {
      return o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'ready' || o.status === 'pending_payment';
    }
    if (activeFilter === 'pending') {
      return o.status === 'pending' || o.status === 'pending_payment';
    }
    if (activeFilter === 'confirmed') return o.status === 'confirmed';
    if (activeFilter === 'preparing') return o.status === 'preparing';
    if (activeFilter === 'ready') return o.status === 'ready';
    if (activeFilter === 'served') return o.status === 'served';
    return true; // all
  });

  // Calculate elapsed minutes from order.timePlaced or createdAt
  const getElapsedMinutes = (order: Order): number => {
    if (order.createdAt) {
      const ms = Date.now() - new Date(order.createdAt).getTime();
      return Math.max(1, Math.round(ms / 60000));
    }
    // Fallback: estimate from timePlacedAgo string if present
    const match = (order.timePlacedAgo || '').match(/(\d+)m/);
    return match ? parseInt(match[1], 10) : 5;
  };

  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'pending_payment').length;
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const activeCount = orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready', 'pending_payment'].includes(o.status)).length;

  const handleConfirmCancel = () => {
    if (!cancelModalOrder) return;
    if (!cancellationReason.trim()) {
      alert('Please specify a cancellation reason.');
      return;
    }
    onUpdateOrderStatus(cancelModalOrder.id, 'cancelled', cancellationReason.trim());
    setCancelModalOrder(null);
    setCancellationReason('');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-neutral-100 flex flex-col font-sans select-none">
      {/* Top KDS Header */}
      <header className="sticky top-0 z-40 bg-[#1C1C1E] border-b border-neutral-800 shadow-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Restaurant & Kitchen Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center font-black text-xl shadow-xs">
              <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white leading-tight">
                  {restaurantName} Kitchen KDS
                </h1>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                  Live Station
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>{branchName}</span>
                <span>•</span>
                <span className="text-orange-400 font-semibold">{staffName}</span>
              </div>
            </div>
          </div>

          {/* Action & Status Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Chime Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playKitchenChime();
              }}
              title={soundEnabled ? 'Mute Kitchen Chime' : 'Unmute Kitchen Chime'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                soundEnabled
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:text-white'
                  : 'bg-red-950/60 border-red-800 text-red-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-[#F97316]">
                {soundEnabled ? 'volume_up' : 'volume_off'}
              </span>
              <span className="hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
            </button>

            {/* Manual Sync / Refresh */}
            <button
              onClick={() => {
                if (onRefreshOrders) onRefreshOrders();
              }}
              title="Poll latest orders from shared database"
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-orange-400">sync</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Switch to Staff or Manager view */}
            {onSelectScreen && (
              <button
                onClick={() => onSelectScreen('manager-dashboard')}
                title="Switch to Manager Hub"
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                <span className="hidden md:inline">Manager Hub</span>
              </button>
            )}

            {/* Sign Out */}
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign out of station"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main KDS Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        {/* Urgent New Incoming Orders Banner */}
        {pendingCount > 0 && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">notifications_active</span>
              <div>
                <p className="font-extrabold text-sm leading-tight">
                  {pendingCount} New Dine-In Order{pendingCount > 1 ? 's' : ''} Received!
                </p>
                <p className="text-xs text-amber-100">
                  Accept ticket to start preparation timer and notify floor staff.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveFilter('pending')}
              className="px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-xs font-bold text-white border border-white/20 transition-all cursor-pointer"
            >
              View New Orders
            </button>
          </div>
        )}

        {/* Status Filter Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'active'
                ? 'bg-[#F97316] text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span>Active Tickets</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-white font-mono text-[11px]">
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">timer</span>
            <span>Pending</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-200 font-mono text-[11px]">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('confirmed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'confirmed'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">thumb_up</span>
            <span>Accepted</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-white font-mono text-[11px]">
              {confirmedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('preparing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'preparing'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">local_fire_department</span>
            <span>Cooking</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-white font-mono text-[11px]">
              {preparingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('ready')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'ready'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">room_service</span>
            <span>At Pass (Ready)</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-white font-mono text-[11px]">
              {readyCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('served')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'served'
                ? 'bg-neutral-700 text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span>Served History</span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeFilter === 'all'
                ? 'bg-neutral-600 text-white shadow-md'
                : 'bg-[#1C1C1E] border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span>All Tickets</span>
          </button>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-8">
            <div className="w-16 h-16 rounded-full bg-neutral-800/80 text-neutral-500 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">skillet</span>
            </div>
            <h3 className="text-lg font-bold text-neutral-200 mb-1">
              No orders in this station filter
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-4">
              All dishes have been prepared and served to dining tables. New guest orders will appear automatically.
            </p>
            <button
              onClick={() => setActiveFilter('all')}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-bold text-neutral-300"
            >
              Show All Orders
            </button>
          </div>
        )}

        {/* Kitchen KDS Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const elapsed = getElapsedMinutes(order);
            const isPending = order.status === 'pending' || order.status === 'pending_payment';
            const isConfirmed = order.status === 'confirmed';
            const isCooking = order.status === 'preparing';
            const isReady = order.status === 'ready';
            const isServed = order.status === 'served';
            const isCancelled = order.status === 'cancelled';

            // Elapsed color coding: Green <10m, Amber 10-20m, Red >20m
            const timerColor =
              elapsed < 10
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : elapsed < 20
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse';

            return (
              <div
                key={order.id}
                className={`bg-[#1C1C1E] rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-md ${
                  isPending
                    ? 'border-amber-500/60 ring-2 ring-amber-500/20'
                    : isCooking
                    ? 'border-orange-500/50'
                    : isReady
                    ? 'border-orange-500/50'
                    : 'border-neutral-800'
                }`}
              >
                {/* Header Ticket Bar */}
                <div
                  className={`px-4 py-3 flex items-center justify-between border-b ${
                    isPending
                      ? 'bg-amber-950/40 border-amber-800/40'
                      : isCooking
                      ? 'bg-orange-950/30 border-orange-800/30'
                      : isReady
                      ? 'bg-orange-950/30 border-orange-800/30'
                      : 'bg-[#242426] border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-base text-white tracking-wide">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-neutral-300 px-2 py-0.5 rounded-md bg-black/40">
                        {order.tableNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {order.tableLocation}
                    </span>
                  </div>

                  {/* Elapsed Timer Badge */}
                  <div className="flex flex-col items-end">
                    <div className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${timerColor}`}>
                      {elapsed}m elapsed
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      Placed: {order.timePlaced}
                    </span>
                  </div>
                </div>

                {/* Special Instructions Alert */}
                {order.specialInstructions && (
                  <div className="bg-amber-950/40 border-b border-amber-900/30 px-4 py-2 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-400 shrink-0 mt-0.5">
                      error_outline
                    </span>
                    <span className="text-xs font-semibold text-amber-200 italic leading-snug">
                      "{order.specialInstructions}"
                    </span>
                  </div>
                )}

                {/* Ordered Items List */}
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  {order.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 pb-2 border-b border-neutral-800/80 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#F97316] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                            {it.quantity}
                          </span>
                          <span className="font-bold text-sm text-neutral-100 leading-tight">
                            {it.name.replace(/^\d+x\s*/, '')}
                          </span>
                        </div>
                        {it.details && it.details !== 'Standard preparation' && (
                          <p className="text-[11px] text-neutral-400 ml-7 mt-0.5 leading-snug">
                            {it.details}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-neutral-400 shrink-0">
                        {formatUGX(it.priceUGX)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status Advancement Action Bar */}
                <div className="p-3 bg-[#161618] border-t border-neutral-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                        Status:
                      </span>
                      <strong className="text-neutral-200 uppercase font-extrabold">
                        {order.status}
                      </strong>
                    </span>
                    <button
                      onClick={() => setSelectedOrderForModal(order)}
                      className="text-neutral-400 hover:text-white underline text-xs cursor-pointer"
                    >
                      Details
                    </button>
                  </div>

                  {/* Progressive Kitchen Actions */}
                  <div className="flex items-center gap-2">
                    {/* Step 1: Accept Pending */}
                    {isPending && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'confirmed')}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                        <span>Accept Ticket</span>
                      </button>
                    )}

                    {/* Step 2: Start Cooking */}
                    {isConfirmed && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {/* Step 3: Ready at Pass */}
                    {isCooking && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">room_service</span>
                        <span>Ready at Pass</span>
                      </button>
                    )}

                    {/* Step 4: Mark Served to Table */}
                    {isReady && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'served')}
                        className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                        <span>Mark Served</span>
                      </button>
                    )}

                    {/* Completed / History State */}
                    {isServed && (
                      <div className="flex-1 py-1.5 text-center text-xs text-neutral-400 font-semibold bg-neutral-800 rounded-lg">
                        ✓ Served to Dining Table
                      </div>
                    )}

                    {/* Cancelled State */}
                    {isCancelled && (
                      <div className="flex-1 py-1.5 text-center text-xs text-red-400 font-semibold bg-red-950/40 border border-red-900/50 rounded-lg">
                        Cancelled: {order.cancellationReason || 'Authorized workflow'}
                      </div>
                    )}

                    {/* Cancel Action Button (only for active, unserved orders) */}
                    {!isServed && !isCancelled && (
                      <button
                        onClick={() => setCancelModalOrder(order)}
                        title="Cancel this order (requires reason)"
                        className="px-2.5 py-2 rounded-xl bg-neutral-800 hover:bg-red-950/60 border border-neutral-700 text-neutral-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Cancellation Modal with Mandatory Reason */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-extrabold text-base text-white">
                Cancel Order {cancelModalOrder.orderNumber}?
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Cancelling will remove this order from active kitchen prep and record an audit log entry. Please specify the operational reason:
            </p>

            <div>
              <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-1">
                Cancellation Reason:
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Guest requested cancellation / Sold out Angus patties / Duplicate order"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCancelModalOrder(null);
                  setCancellationReason('');
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer shadow-md"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Order Details Modal */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  Ticket {selectedOrderForModal.orderNumber}
                </h3>
                <span className="text-xs text-neutral-400">
                  {selectedOrderForModal.tableLocation} • Placed {selectedOrderForModal.timePlaced}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {selectedOrderForModal.items.map((it, idx) => (
                <div key={idx} className="bg-neutral-900/60 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-sm text-neutral-200">
                      {it.quantity}x {it.name.replace(/^\d+x\s*/, '')}
                    </span>
                    {it.details && (
                      <p className="text-xs text-neutral-400 mt-0.5">{it.details}</p>
                    )}
                  </div>
                  <span className="font-mono text-xs text-neutral-300">
                    {formatUGX(it.priceUGX)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Payment: <strong className="text-white uppercase">{selectedOrderForModal.paymentVerified ? 'Paid' : 'Pending (Pay at End)'}</strong></span>
              <span className="text-sm font-bold text-white">
                Total: {formatUGX(selectedOrderForModal.totalUGX)}
              </span>
            </div>

            <button
              onClick={() => setSelectedOrderForModal(null)}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-bold text-neutral-200 mt-2"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
