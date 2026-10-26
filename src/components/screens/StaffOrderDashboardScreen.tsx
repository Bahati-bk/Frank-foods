import React, { useState } from 'react';
import { Order, PaymentMethod, OrderStatus } from '../../types/dining';
import { formatUGX } from '../../utils/format';

interface Props {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, paymentMethod?: PaymentMethod) => void;
  onConfirmPayment: (orderId: string, paymentMethod: PaymentMethod) => void;
  onClearServerAlert: (orderId: string) => void;
  onSelectScreen?: (screenId: string) => void;
}

export const StaffOrderDashboardScreen: React.FC<Props> = ({
  orders,
  onUpdateOrderStatus,
  onConfirmPayment,
  onClearServerAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'preparing' | 'ready' | 'served' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'queue' | 'kds'>('queue');

  // Filter orders based on restaurant dine-in flow
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'preparing' && order.status !== 'preparing') return false;
    if (activeTab === 'ready' && order.status !== 'ready') return false;
    if (activeTab === 'served' && order.status !== 'served') return false;
    if (activeTab === 'unpaid' && order.paymentVerified) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = order.orderNumber.toLowerCase().includes(q);
      const matchTable = order.tableNumber.toLowerCase().includes(q) || order.tableLocation.toLowerCase().includes(q);
      const matchItem = order.items.some((i) => i.name.toLowerCase().includes(q));
      if (!matchNum && !matchTable && !matchItem) return false;
    }
    return true;
  });

  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const servedCount = orders.filter((o) => o.status === 'served').length;
  const unpaidCount = orders.filter((o) => !o.paymentVerified).length;

  return (
    <div className="bg-[#F5F5F5] text-[#171717] min-h-screen flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Hub Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center text-white font-extrabold text-xl shadow-xs">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#171717] leading-none">Frank Foods</h1>
                <span className="text-[11px] bg-orange-100 text-[#EA580C] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Staff Dashboard
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#525252] mt-1">
                <span className="material-symbols-outlined text-[14px] text-[#F97316]">storefront</span>
                <span>Acacia Mall Hub</span>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Shift Info & Station Toggle */}
          <div className="flex items-center gap-3">
            {/* Switch Station View Quick Toggle */}
            <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg text-xs font-semibold text-[#525252]">
              <button
                onClick={() => setViewMode('queue')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                  viewMode === 'queue'
                    ? 'bg-white text-[#171717] shadow-xs'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px] text-[#F97316]">splitscreen</span>
                <span>All Station Queue</span>
              </button>
              <button
                onClick={() => setViewMode('kds')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                  viewMode === 'kds'
                    ? 'bg-white text-[#171717] shadow-xs'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px] text-[#F97316]">soup_kitchen</span>
                <span>Kitchen Tablet KDS</span>
              </button>
            </div>

            {/* Staff User Badge */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E5E5E5]">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-[#EA580C] font-bold flex items-center justify-center text-sm border border-[#F97316]/20">
                SK
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#171717] leading-tight">Sarah K.</span>
                <span className="text-[11px] text-[#525252] font-medium">Floor Staff (Terrace)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Real-time Server Call Alert Banner if any table called */}
        {orders.some((o) => o.serverAlertActive) && (
          <div className="bg-amber-500 text-white p-3.5 rounded-xl shadow-md flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[24px]">notifications_active</span>
              <span className="font-bold text-sm">
                Floor Alert: Table 07 (Terrace) is requesting assistance!
              </span>
            </div>
            <button
              onClick={() => {
                const alerted = orders.find((o) => o.serverAlertActive);
                if (alerted) onClearServerAlert(alerted.id);
              }}
              className="bg-white text-amber-900 font-bold px-3 py-1 rounded-lg text-xs hover:bg-neutral-100"
            >
              Acknowledge Alert
            </button>
          </div>
        )}

        {/* Overview Stats & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0" id="filter-tabs">
            {/* Tab 1: All Orders */}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs shrink-0 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#171717] text-white'
                  : 'bg-white border border-[#E5E5E5] text-[#525252] hover:bg-gray-50'
              }`}
            >
              <span>All Orders</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                  activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#171717]'
                }`}
              >
                {orders.length}
              </span>
            </button>

            {/* Tab 2: Preparing in Kitchen */}
            <button
              onClick={() => setActiveTab('preparing')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs shrink-0 transition-all cursor-pointer ${
                activeTab === 'preparing'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#525252]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#F97316]">
                local_fire_department
              </span>
              <span>In Kitchen</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[#171717] font-bold text-xs tabular-nums">
                {preparingCount}
              </span>
            </button>

            {/* Tab 3: Ready to Serve */}
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs shrink-0 transition-all cursor-pointer ${
                activeTab === 'ready'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#525252]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                room_service
              </span>
              <span>Ready at Pass</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[#171717] font-bold text-xs tabular-nums">
                {readyCount}
              </span>
            </button>

            {/* Tab 4: Served (Dining) */}
            <button
              onClick={() => setActiveTab('served')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs shrink-0 transition-all cursor-pointer ${
                activeTab === 'served'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#525252]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-blue-600">
                table_restaurant
              </span>
              <span>Served to Table</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[#171717] font-bold text-xs tabular-nums">
                {servedCount}
              </span>
            </button>

            {/* Tab 5: Unpaid / Settle at End */}
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs shrink-0 transition-all cursor-pointer ${
                activeTab === 'unpaid'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-orange-300 hover:bg-orange-50 text-[#EA580C]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">credit_card</span>
              <span>Pending Bill</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#EA580C] text-xs font-extrabold tabular-nums">
                {unpaidCount} To Settle
              </span>
            </button>
          </div>

          {/* Quick Shift Search & Operational Meta */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#525252] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, table, or guest..."
                className="w-full bg-white text-[#171717] placeholder-[#737373] text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E5E5] outline-none focus:border-[#F97316] transition-all shadow-xs"
              />
            </div>
            <button
              onClick={() => setSearchQuery('')}
              title="Refresh Live Queue"
              className="p-2.5 rounded-xl bg-white border border-[#E5E5E5] text-[#171717] hover:border-[#F97316] transition-colors flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>

        {/* Dine-In Operations Banner */}
        <div className="bg-orange-50/90 border border-orange-200 rounded-xl p-3.5 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#EA580C] text-xl shrink-0 mt-0.5">
            credit_card
          </span>
          <div className="text-xs text-neutral-800 leading-relaxed">
            <strong className="font-bold text-[#EA580C]">Dine-In Operations Active:</strong> Orders go straight to the kitchen to cook immediately. Payment is collected at the end of dining. Floor staff can settle bills using <strong className="font-bold text-[#171717]">Card (POS Terminal)</strong>, <strong className="font-bold text-[#171717]">Cash</strong>, <strong className="font-bold text-[#171717]">MTN MoMo</strong>, or <strong className="font-bold text-[#171717]">Airtel Money</strong>.
          </div>
        </div>

        {/* Order Queue Grid matching Image_7 and Image_8 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {filteredOrders.map((order) => {
            const isUnverified = order.status === 'pending_payment' && !order.paymentVerified;
            const isWalkInPaid = order.orderType === 'counter_walk_in' && order.status === 'pending_payment';
            const isPreparing = order.status === 'preparing';
            const isReady = order.status === 'ready';
            const isServed = order.status === 'served';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col relative transition-all border ${
                  isUnverified
                    ? 'border-2 border-red-300'
                    : isPreparing
                    ? 'border-amber-300'
                    : isReady
                    ? 'border-emerald-300'
                    : 'border-[#E5E5E5]'
                }`}
              >
                {/* Top Status Header Bar */}
                {order.serverAlertActive ? (
                  <div className="bg-amber-600 px-4 py-1.5 flex items-center justify-between text-white text-xs font-bold animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                      <span>Table Alert: {order.serverAlertReason || 'Bill or assistance requested'}</span>
                    </div>
                    <span>Action Needed</span>
                  </div>
                ) : isPreparing ? (
                  <div className="bg-amber-600 px-4 py-1.5 flex items-center justify-between text-white text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">
                        local_fire_department
                      </span>
                      <span>Kitchen: Cooking ({order.timePlacedAgo})</span>
                    </div>
                    <span>Pay at End</span>
                  </div>
                ) : isReady ? (
                  <div className="bg-emerald-600 px-4 py-1.5 flex items-center justify-between text-white text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Stage: Ready at Kitchen Pass</span>
                    </div>
                    <span>Plated &amp; Hot</span>
                  </div>
                ) : isServed ? (
                  <div className="bg-blue-600 px-4 py-1.5 flex items-center justify-between text-white text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                      <span>Served to Table: Dining</span>
                    </div>
                    <span>{order.paymentVerified ? 'Paid' : 'Awaiting Bill'}</span>
                  </div>
                ) : (
                  <div className="bg-neutral-700 px-4 py-1.5 flex items-center justify-between text-white text-xs font-bold">
                    <span>Completed &amp; Settled</span>
                    <span>Paid</span>
                  </div>
                )}

                <div className="p-5 flex flex-col gap-4">
                  {/* Card Header & Metadata */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-[#171717] tracking-tight">
                          {order.orderNumber}
                        </span>
                        <span className="bg-gray-100 text-[#171717] font-bold text-xs px-2.5 py-1 rounded-md">
                          {order.tableLocation}
                        </span>
                      </div>
                      <span className="text-xs text-[#525252] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Placed: {order.timePlaced} ({order.timePlacedAgo})
                      </span>
                    </div>

                    {/* Payment Status Pill */}
                    {order.paymentVerified ? (
                      <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Paid ({order.paymentMethod || 'Card'})</span>
                      </span>
                    ) : order.paymentRequestedMethod ? (
                      <span className="bg-orange-100 border border-orange-300 text-[#EA580C] text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <span className="material-symbols-outlined text-[14px]">credit_card</span>
                        <span>Wants to Pay: {order.paymentRequestedMethod}</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>Pay at End</span>
                      </span>
                    )}
                  </div>

                  {/* Items Ordered List */}
                  <div className="bg-gray-50 rounded-xl p-3.5 border border-[#E5E5E5] flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold text-[#525252] uppercase tracking-wider">
                      {isPreparing
                        ? 'Kitchen Checklist:'
                        : isReady
                        ? 'Service Tray Items:'
                        : 'Ordered Items:'}
                    </span>

                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-start justify-between text-xs ${
                          i < order.items.length - 1 ? 'pb-2 border-b border-gray-200' : ''
                        }`}
                      >
                        <div className="flex flex-col pr-2">
                          <span className="font-bold text-[#171717] text-sm">{item.name}</span>
                          <span className="text-[#525252] font-medium text-[11px]">
                            {item.details}
                          </span>
                        </div>
                        {item.badge ? (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                            {item.badge}
                          </span>
                        ) : (
                          <span className="font-bold text-[#171717] whitespace-nowrap tabular-nums">
                            {formatUGX(item.priceUGX)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Special Instructions Quote */}
                  {order.specialInstructions && (
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs text-amber-900">
                      <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
                        comment
                      </span>
                      <span className="italic font-medium">"{order.specialInstructions}"</span>
                    </div>
                  )}

                  {/* Total Calculation */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-[#525252]">Order Total Due:</span>
                    <span className="text-xl font-extrabold text-[#171717] tabular-nums">
                      {formatUGX(order.totalUGX)}
                    </span>
                  </div>

                  {/* Action Buttons depending on stage */}
                  <div className="pt-2 flex flex-col gap-2.5 border-t border-[#E5E5E5]">
                    {/* Kitchen and Delivery Progression Buttons */}
                    {isPreparing && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                        className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">room_service</span>
                        <span>Mark Ready at Pass (Plated) →</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'served')}
                        className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                        <span>Mark Delivered &amp; Served to Table →</span>
                      </button>
                    )}

                    {/* Settle Payment Section: Payment at the End */}
                    {!order.paymentVerified ? (
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#171717] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-[#F97316]">
                              point_of_sale
                            </span>
                            Settle Bill at End:
                          </span>
                          {order.paymentRequestedMethod && (
                            <span className="text-[10px] bg-orange-100 text-[#EA580C] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">credit_card</span>
                              Guest requested: {order.paymentRequestedMethod}
                            </span>
                          )}
                        </div>

                        {/* 4 Payment Methods including Card */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {/* Card */}
                          <button
                            onClick={() => onConfirmPayment(order.id, 'Card')}
                            className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                              order.paymentRequestedMethod === 'Card'
                                ? 'bg-orange-50 border-orange-400 text-[#EA580C] ring-2 ring-orange-200 font-extrabold'
                                : 'bg-white hover:bg-gray-100 text-[#171717] border-gray-200'
                            }`}
                            title="Collect via portable POS wireless card terminal"
                          >
                            <span className="material-symbols-outlined text-[16px] text-blue-600">
                              credit_card
                            </span>
                            <span className="text-[11px]">Card (POS)</span>
                          </button>

                          {/* Cash */}
                          <button
                            onClick={() => onConfirmPayment(order.id, 'Cash')}
                            className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                              order.paymentRequestedMethod === 'Cash'
                                ? 'bg-orange-50 border-orange-400 text-[#EA580C] ring-2 ring-orange-200 font-extrabold'
                                : 'bg-white hover:bg-gray-100 text-[#171717] border-gray-200'
                            }`}
                            title="Collect cash at table"
                          >
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">
                              payments
                            </span>
                            <span className="text-[11px]">Cash</span>
                          </button>

                          {/* MTN MoMo */}
                          <button
                            onClick={() => onConfirmPayment(order.id, 'MTN MoMo')}
                            className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                              order.paymentRequestedMethod === 'MTN MoMo'
                                ? 'bg-orange-50 border-orange-400 text-[#EA580C] ring-2 ring-orange-200 font-extrabold'
                                : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                            title="Confirm MTN MoMo transfer"
                          >
                            <span className="material-symbols-outlined text-[16px] text-amber-700">
                              smartphone
                            </span>
                            <span className="text-[11px]">MTN</span>
                          </button>

                          {/* Airtel Money */}
                          <button
                            onClick={() => onConfirmPayment(order.id, 'Airtel Money')}
                            className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                              order.paymentRequestedMethod === 'Airtel Money'
                                ? 'bg-orange-50 border-orange-400 text-[#EA580C] ring-2 ring-orange-200 font-extrabold'
                                : 'bg-white hover:bg-red-50 text-red-900 border-red-200'
                            }`}
                            title="Confirm Airtel Money transfer"
                          >
                            <span className="material-symbols-outlined text-[16px] text-red-700">
                              contactless
                            </span>
                            <span className="text-[11px]">Airtel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-emerald-700">
                            verified
                          </span>
                          Settled via {order.paymentMethod || 'Card'} by Sarah K.
                        </span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                          Paid
                        </span>
                      </div>
                    )}

                    {/* Clear Server Alert if active */}
                    {order.serverAlertActive && (
                      <button
                        onClick={() => onClearServerAlert(order.id)}
                        className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">notifications_off</span>
                        <span>Acknowledge &amp; Clear Table Alert</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
