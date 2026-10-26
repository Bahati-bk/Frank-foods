import React, { useState } from 'react';
import { Order, PaymentMethod } from '../../types/dining';
import { formatUGX } from '../../utils/format';
import { FRANK_FOODS_BRAND_LOGO } from '../../data/initialData';

interface Props {
  order: Order;
  onCallServer: (reason?: string, requestedPaymentMethod?: PaymentMethod) => void;
  onSelectScreen?: (screenId: string) => void;
}

export const CustomerOrderTrackerScreen: React.FC<Props> = ({
  order,
  onCallServer,
  onSelectScreen,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(order.paymentRequestedMethod || 'Card');
  const [isCallingServer, setIsCallingServer] = useState(false);
  const [serverAlerted, setServerAlerted] = useState(false);
  const [billRequestedMessage, setBillRequestedMessage] = useState<string | null>(null);
  const [wifiCopied, setWifiCopied] = useState(false);

  const handleCallServer = () => {
    setIsCallingServer(true);
    setServerAlerted(true);
    setBillRequestedMessage(null);
    onCallServer('Assistance requested at table');

    setTimeout(() => {
      setIsCallingServer(false);
    }, 4000);
  };

  const handleRequestBill = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setIsCallingServer(true);
    setServerAlerted(true);
    setBillRequestedMessage(`Bill requested with ${method}`);
    onCallServer(`Guest requested bill: ${method}`, method);

    setTimeout(() => {
      setIsCallingServer(false);
    }, 4000);
  };

  const copyWifi = () => {
    navigator.clipboard.writeText('Acacia2025');
    setWifiCopied(true);
    setTimeout(() => setWifiCopied(false), 2500);
  };

  // Determine current step index (1-based, 0 if cancelled)
  // Dine-in order progression: 1. Cooking in Kitchen -> 2. Ready at Pass -> 3. Served to Table -> 4. Bill & Payment Settled at End
  const getStepNumber = () => {
    if (order.status === 'cancelled') return 0;
    if (order.paymentVerified) return 4;
    switch (order.status) {
      case 'served':
        return 3;
      case 'ready':
        return 2;
      case 'preparing':
      case 'confirmed':
      case 'pending':
      case 'pending_payment':
      default:
        return 1;
    }
  };

  const currentStep = getStepNumber();

  return (
    <div className="w-full flex justify-center bg-[#F9FAFB] min-h-screen">
      {/* Mobile Container matching Image_5 and Image_6 */}
      <div className="w-full max-w-[420px] bg-white min-h-screen flex flex-col shadow-sm border-x border-[#E5E5E5] pb-10">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              alt="Frank Foods Brand Logo"
              className="h-7 w-auto object-contain"
              src={FRANK_FOODS_BRAND_LOGO}
              onError={(e) => {
                // Graceful fallback if image unavailable
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
            <span className="font-extrabold text-[17px] tracking-tight text-[#171717]">
              {order.restaurantName || 'Frank Foods'}
            </span>
          </div>

          {/* Dine-in badge with live indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{order.tableNumber} • Live Status</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-4 space-y-4">
          {/* Order Identification Card */}
          <section className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                    Order Ticket
                  </span>
                  {order.status === 'cancelled' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                      Cancelled
                    </span>
                  ) : order.paymentVerified ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Paid ({order.paymentMethod || 'Card'})
                    </span>
                  ) : order.status === 'served' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Served • Pay at End
                    </span>
                  ) : order.status === 'ready' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                      Plated &amp; Ready at Pass
                    </span>
                  ) : order.status === 'confirmed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Accepted by Kitchen
                    </span>
                  ) : order.status === 'pending' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                      Order Received
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-[#EA580C] border border-orange-200 animate-pulse">
                      Cooking in Kitchen
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">
                  Order {order.orderNumber}
                </h1>
              </div>
              <span className="p-2 rounded-xl bg-orange-50 text-[#F97316]">
                <span className="material-symbols-outlined text-[26px]">receipt_long</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-[#E5E5E5] text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-[#737373] font-medium">Table Location</span>
                <span className="font-semibold text-[#171717] flex items-center gap-1 mt-0.5 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-[#F97316]">
                    table_restaurant
                  </span>
                  {order.tableLocation}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#737373] font-medium">Time Placed</span>
                <span className="font-semibold text-[#171717] mt-0.5 text-xs">
                  {order.timePlaced}
                </span>
              </div>
            </div>
          </section>

          {/* Cancellation Notice Banner if Order was Cancelled */}
          {order.status === 'cancelled' && (
            <section className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600 text-[24px] shrink-0 mt-0.5">
                  cancel
                </span>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-red-900">Order Cancelled</h3>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {order.cancellationReason || 'This order was cancelled by the kitchen.'}
                  </p>
                  <p className="text-[11px] text-red-600 pt-1 font-medium">
                    If you have questions or wish to re-order, please speak to your floor server or tap the Call Server button below.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 4 Core States Tracker */}
          <section className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                Order Status
              </h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                order.status === 'cancelled'
                  ? 'text-red-700 bg-red-50'
                  : currentStep === 4
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-[#EA580C] bg-[#FFF7ED]'
              }`}>
                {order.status === 'cancelled' ? 'Cancelled' : `Step ${currentStep} of 4`}
              </span>
            </div>

            <div className="relative pl-1">
              {/* Continuous Vertical Tracker Line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-neutral-200"></div>

              {/* Stage 1: Received & Cooking in Kitchen */}
              <div className="relative flex items-start gap-3.5 pb-5">
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    currentStep === 1
                      ? 'bg-[#F97316] text-white shadow-md ring-4 ring-orange-100 animate-pulse'
                      : currentStep > 1
                      ? 'bg-emerald-600 text-white'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-500 border border-red-200'
                      : 'bg-neutral-100 border border-neutral-300 text-neutral-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {currentStep > 1 ? 'check' : order.status === 'cancelled' ? 'close' : 'skillet'}
                  </span>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm ${
                        currentStep === 1
                          ? 'font-bold text-[#171717]'
                          : currentStep > 1
                          ? 'font-semibold text-[#171717]'
                          : 'font-semibold text-neutral-400'
                      }`}
                    >
                      {currentStep > 1
                        ? '1. Order Prepared & Cooked'
                        : order.status === 'confirmed'
                        ? '1. Order Confirmed by Kitchen'
                        : order.status === 'pending'
                        ? '1. Order Received & Queued'
                        : '1. Cooking Fresh in Kitchen'}
                    </p>
                    {currentStep === 1 && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                        {order.status === 'confirmed'
                          ? 'Accepted'
                          : order.status === 'pending'
                          ? 'Queued'
                          : 'Cooking Fresh'}
                      </span>
                    )}
                    {currentStep > 1 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Done
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      currentStep === 1
                        ? 'text-[#EA580C] font-medium'
                        : 'text-[#737373]'
                    }`}
                  >
                    {currentStep > 1
                      ? 'Cooked fresh to perfection by kitchen stations'
                      : order.status === 'confirmed'
                      ? 'Kitchen acknowledged ticket and queued for cooking'
                      : order.status === 'pending'
                      ? 'Ticket sent to kitchen stations, awaiting chef assignment'
                      : 'Dispatched straight to kitchen & cooking fresh'}
                  </p>
                </div>
              </div>

              {/* Stage 2: Ready at Pass */}
              <div className="relative flex items-start gap-3.5 pb-5">
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    currentStep === 2
                      ? 'bg-[#F97316] text-white shadow-md ring-4 ring-orange-100 animate-pulse'
                      : currentStep > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 border border-neutral-300 text-neutral-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {currentStep > 2 ? 'check' : 'room_service'}
                  </span>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm ${
                        currentStep === 2
                          ? 'font-bold text-[#171717]'
                          : currentStep > 2
                          ? 'font-semibold text-[#171717]'
                          : 'font-semibold text-neutral-400'
                      }`}
                    >
                      2. Plated &amp; Ready at Pass
                    </p>
                    {currentStep === 2 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-pulse">
                        Ready for Delivery
                      </span>
                    )}
                    {currentStep > 2 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737373]">
                    {currentStep === 2
                      ? `Plated and hot at the pass! Floor server is delivering to ${order.tableNumber}.`
                      : currentStep > 2
                      ? 'Plated and picked up by server'
                      : 'Awaiting kitchen preparation'}
                  </p>
                </div>
              </div>

              {/* Stage 3: Served to Table */}
              <div className="relative flex items-start gap-3.5 pb-5">
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    currentStep === 3
                      ? 'bg-[#F97316] text-white shadow-md ring-4 ring-orange-100 animate-pulse'
                      : currentStep > 3
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 border border-neutral-300 text-neutral-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {currentStep > 3 ? 'check' : 'table_restaurant'}
                  </span>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm ${
                        currentStep === 3
                          ? 'font-bold text-[#171717]'
                          : currentStep > 3
                          ? 'font-semibold text-[#171717]'
                          : 'font-semibold text-neutral-400'
                      }`}
                    >
                      3. Served to Table
                    </p>
                    {currentStep === 3 && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Enjoy Meal!
                      </span>
                    )}
                    {currentStep > 3 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Served
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737373]">
                    {currentStep >= 3
                      ? `Delivered to ${order.tableNumber} • Enjoy your meal!`
                      : `Will be brought to ${order.tableNumber}`}
                  </p>
                </div>
              </div>

              {/* Stage 4: Bill & Payment at End */}
              <div className="relative flex items-start gap-3.5">
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    order.paymentVerified
                      ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100'
                      : currentStep === 4
                      ? 'bg-[#F97316] text-white shadow-md ring-4 ring-orange-100'
                      : 'bg-neutral-100 border border-neutral-300 text-neutral-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {order.paymentVerified ? 'check_circle' : 'credit_card'}
                  </span>
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm ${
                        order.paymentVerified
                          ? 'font-bold text-emerald-800'
                          : 'font-semibold text-[#171717]'
                      }`}
                    >
                      4. Bill &amp; Payment (Pay at End)
                    </p>
                    {order.paymentVerified ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Paid ({order.paymentMethod || 'Card'})
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Pay when Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737373]">
                    {order.paymentVerified
                      ? `Payment settled via ${order.paymentMethod || 'Card'}`
                      : 'Pay at the end of dining via Card, Cash, or MoMo'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Prominent Pay-at-the-End & Card Payment Section */}
          <section className="rounded-2xl p-4 bg-orange-50/90 border border-[#F97316]/30 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F97316] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">
                  {order.paymentVerified ? 'verified' : 'credit_card'}
                </span>
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#171717] leading-tight">
                    {order.paymentVerified
                      ? 'Payment Settled & Complete'
                      : 'Payment at the End of Your Meal'}
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#EA580C] border border-[#F97316]/30">
                    {order.paymentVerified ? 'Settled' : 'Pay when Ready'}
                  </span>
                </div>
                <p className="text-xs text-[#525252] leading-relaxed">
                  {order.paymentVerified ? (
                    <span>
                      Your payment of{' '}
                      <strong className="text-[#171717] font-semibold">
                        {formatUGX(order.totalUGX)}
                      </strong>{' '}
                      has been verified by floor staff via{' '}
                      <strong className="text-[#171717] font-semibold">
                        {order.paymentMethod || 'Card'}
                      </strong>
                      . Thank you for dining at Frank Foods!
                    </span>
                  ) : (
                    <span>
                      Enjoy your dining! In our restaurant, payment is settled when you finish. Select how you would like to pay and request your bill when you're ready:
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Payment Method Selector (when not paid yet) */}
            {!order.paymentVerified && (
              <div className="mt-3.5 pt-3 border-t border-[#F97316]/20 space-y-2.5">
                <span className="text-xs font-bold text-[#171717] block">
                  Select Payment Option:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* Card Option (Primary) */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('Card')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPaymentMethod === 'Card'
                        ? 'border-[#F97316] bg-white ring-2 ring-orange-200 shadow-xs'
                        : 'border-[#E5E5E5] bg-white/70 hover:bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#171717] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#F97316]">
                          credit_card
                        </span>
                        Card (POS)
                      </span>
                      <span className="text-[9px] bg-neutral-100 text-neutral-700 font-bold px-1.5 py-0.5 rounded">
                        Visa/MC
                      </span>
                    </div>
                    <span className="text-[10px] text-[#737373] mt-1">
                      Wireless POS terminal at table
                    </span>
                  </button>

                  {/* Cash Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('Cash')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPaymentMethod === 'Cash'
                        ? 'border-[#F97316] bg-white ring-2 ring-orange-200 shadow-xs'
                        : 'border-[#E5E5E5] bg-white/70 hover:bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#171717] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">
                          payments
                        </span>
                        Cash UGX
                      </span>
                      <span className="text-[9px] bg-neutral-100 text-neutral-700 font-bold px-1.5 py-0.5 rounded">
                        Cash
                      </span>
                    </div>
                    <span className="text-[10px] text-[#737373] mt-1">
                      Change brought to table
                    </span>
                  </button>

                  {/* MTN MoMo */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('MTN MoMo')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPaymentMethod === 'MTN MoMo'
                        ? 'border-[#F97316] bg-white ring-2 ring-orange-200 shadow-xs'
                        : 'border-[#E5E5E5] bg-white/70 hover:bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#171717] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">
                          smartphone
                        </span>
                        MTN MoMo
                      </span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        *165#
                      </span>
                    </div>
                    <span className="text-[10px] text-[#737373] mt-1">
                      Instant mobile money
                    </span>
                  </button>

                  {/* Airtel Money */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('Airtel Money')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPaymentMethod === 'Airtel Money'
                        ? 'border-[#F97316] bg-white ring-2 ring-orange-200 shadow-xs'
                        : 'border-[#E5E5E5] bg-white/70 hover:bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#171717] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-red-600">
                          contactless
                        </span>
                        Airtel Money
                      </span>
                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                        *185#
                      </span>
                    </div>
                    <span className="text-[10px] text-[#737373] mt-1">
                      Merchant code or push
                    </span>
                  </button>
                </div>

                {/* Primary Action Button: Request Bill with Selected Method */}
                <button
                  type="button"
                  disabled={isCallingServer}
                  onClick={() => handleRequestBill(selectedPaymentMethod)}
                  className="w-full py-3 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>
                    {isCallingServer
                      ? 'Alerting Floor Staff...'
                      : `Request Bill • Pay with ${selectedPaymentMethod} (${formatUGX(order.totalUGX)})`}
                  </span>
                </button>

                {/* Secondary: General Call Server button */}
                <button
                  type="button"
                  disabled={isCallingServer}
                  onClick={handleCallServer}
                  className="w-full py-2 px-3 rounded-lg bg-white/80 hover:bg-white text-[#525252] border border-[#E5E5E5] font-semibold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#F97316]">
                    notifications_active
                  </span>
                  <span>Need something else? Call server to table</span>
                </button>
              </div>
            )}

            {/* Confirmation Banner */}
            {serverAlerted && (
              <div className="mt-3 text-center text-xs font-bold text-emerald-800 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  check_circle
                </span>
                <span>
                  {billRequestedMessage
                    ? `✓ Floor staff notified! Server is bringing the ${selectedPaymentMethod} terminal/bill to ${order.tableNumber}.`
                    : `✓ Floor staff alerted for ${order.tableNumber}. A server is on their way!`}
                </span>
              </div>
            )}
          </section>

          {/* Order Summary Card */}
          <section className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                Order Summary
              </h2>
              <span className="text-xs font-medium text-[#525252]">
                {order.items.length} items
              </span>
            </div>

            {/* Itemized List */}
            <div className="divide-y divide-neutral-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded bg-[#FFF7ED] text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.quantity}x
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#171717] leading-tight">
                        {item.name.replace(/^\d+x\s*/, '')}
                      </p>
                      <p className="text-xs text-[#737373] mt-0.5">{item.details}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#171717] whitespace-nowrap tabular-nums">
                    {formatUGX(item.priceUGX)}
                  </span>
                </div>
              ))}
            </div>

            {/* Special Instructions Box */}
            {order.specialInstructions && (
              <div className="mt-1 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E5E5] flex items-start gap-2">
                <span className="material-symbols-outlined text-[#737373] text-[17px] shrink-0 mt-0.5">
                  chat
                </span>
                <div className="text-xs">
                  <span className="font-semibold text-[#171717]">Special Instructions:</span>
                  <p className="text-[#525252] mt-0.5 italic">“{order.specialInstructions}”</p>
                </div>
              </div>
            )}

            {/* Financial Totals */}
            <div className="mt-3.5 pt-3 border-t border-[#E5E5E5] space-y-2">
              <div className="flex justify-between items-center text-xs text-[#525252]">
                <span>Subtotal</span>
                <span className="font-medium text-[#171717] tabular-nums">
                  {formatUGX(order.subtotalUGX)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#525252]">
                <span>Taxes &amp; Levies</span>
                <span className="text-neutral-500 font-medium">Included in menu prices</span>
              </div>
              <div className="pt-2 border-t border-[#E5E5E5] flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-bold text-[#171717]">Total Payable</p>
                  <p
                    className={`text-[11px] font-medium ${
                      order.status === 'cancelled'
                        ? 'text-red-700'
                        : order.paymentVerified
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    Status: {order.status === 'cancelled' ? 'Order Cancelled' : order.paymentVerified ? 'Payment Verified' : 'Pending Verification'}
                  </p>
                </div>
                <p className="text-xl font-extrabold text-[#EA580C] tracking-tight tabular-nums">
                  {formatUGX(order.totalUGX)}
                </p>
              </div>
            </div>
          </section>

          {/* Dining Utilities / Guest Wi-Fi */}
          <section className="bg-[#F9FAFB] rounded-2xl p-3.5 border border-[#E5E5E5] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#737373] text-[18px]">wifi</span>
              <div>
                <p className="font-semibold text-[#171717]">Guest Wi-Fi</p>
                <p className="text-[#737373]">Network: FrankFoods_Guest</p>
              </div>
            </div>
            <button
              onClick={copyWifi}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E5E5] font-medium text-[#171717] hover:bg-neutral-50 active:scale-95 transition-all text-xs cursor-pointer shadow-2xs"
            >
              {wifiCopied ? 'Copied!' : 'Pass: Acacia2025'}
            </button>
          </section>

          {/* Quick link to return to menu or order again */}
          <div className="text-center pt-2">
            <button
              onClick={() => onSelectScreen && onSelectScreen('menu-feed')}
              className="text-xs font-semibold text-[#F97316] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">restaurant_menu</span>
              <span>Need to order more items for {order.tableNumber}? Browse Menu</span>
            </button>
          </div>
        </main>

        {/* Customer Footer */}
        <footer className="mt-auto px-4 pt-4 border-t border-[#E5E5E5] text-center">
          <p className="text-xs text-[#737373]">{order.restaurantName || 'Frank Foods'} • Dine-In Platform</p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Need help? Ask any dining staff member near your table.
          </p>
        </footer>
      </div>
    </div>
  );
};
