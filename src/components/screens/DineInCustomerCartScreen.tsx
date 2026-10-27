/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Dish, CartItem, SelectedExtra } from '../../types/dining';
import { formatUGX } from '../../utils/format';

interface Props {
  dishes: Dish[];
  cartItems: CartItem[];
  customizingDish: Dish | null;
  onCloseCustomizer: () => void;
  onAddToCart: (item: CartItem) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onSubmitOrder: (specialNotes: string) => Promise<void>;
  onSelectScreen: (screenId: string) => void;
  tableNumber?: string;
  tableLocation?: string;
  restaurantName?: string;
  isSubmitting?: boolean;
}

export const DineInCustomerCartScreen: React.FC<Props> = ({
  dishes,
  cartItems,
  customizingDish,
  onCloseCustomizer,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onSelectScreen,
  tableNumber = 'Table 07',
  tableLocation = 'Table 07 (Terrace)',
  restaurantName = 'Frank Foods',
  isSubmitting = false,
}) => {
  // --------------------------------------------------------------------------
  // Customizer State (Active when customizingDish is present)
  // --------------------------------------------------------------------------
  const [cookPref, setCookPref] = useState<'Medium Well (Recommended)' | 'Well Done'>(
    'Medium Well (Recommended)'
  );

  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({
    'extra-cheddar': false,
    'extra-bacon': false,
    'extra-egg': false,
  });

  const [customizerQuantity, setCustomizerQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');

  // --------------------------------------------------------------------------
  // Order-wide Checkout State
  // --------------------------------------------------------------------------
  const [orderSpecialNotes, setOrderSpecialNotes] = useState<string>(
    'Please serve drinks first, extra napkins requested for table.'
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Extras configuration matching UI
  const EXTRAS_OPTIONS = [
    {
      id: 'extra-cheddar',
      name: 'Extra Smoked Cheddar',
      description: 'Melted artisan Gouda-Cheddar blend',
      priceUGX: 3500,
    },
    {
      id: 'extra-bacon',
      name: 'Crispy Beef Bacon',
      description: 'Two slow-smoked beef strips',
      priceUGX: 5000,
    },
    {
      id: 'extra-egg',
      name: 'Fried Egg',
      description: 'Pasture-raised sunny-side up',
      priceUGX: 2500,
    },
  ];

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Base price calculation for customizing item
  const dishBasePrice = customizingDish ? customizingDish.priceUGX : 0;
  const extrasTotal = EXTRAS_OPTIONS.reduce((acc, ext) => {
    return acc + (selectedExtras[ext.id] ? ext.priceUGX : 0);
  }, 0);
  const customizerUnitTotal = dishBasePrice + extrasTotal;
  const customizerLineTotal = customizerUnitTotal * customizerQuantity;

  // Grand total for cart items
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);

  const handleAddCustomizedItem = () => {
    if (!customizingDish) return;

    const extrasList: SelectedExtra[] = EXTRAS_OPTIONS.filter((e) => selectedExtras[e.id]).map(
      (e) => ({
        id: e.id,
        name: e.name,
        priceUGX: e.priceUGX,
      })
    );

    const newItem: CartItem = {
      id: `cart-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dishId: customizingDish.id,
      name: customizingDish.name,
      priceUGX: customizerUnitTotal,
      quantity: customizerQuantity,
      cookPreference: cookPref,
      selectedExtras: extrasList,
      specialInstructions: itemNotes.trim() ? itemNotes.trim() : undefined,
      lineTotal: customizerLineTotal,
      image: customizingDish.image,
    };

    onAddToCart(newItem);
    onCloseCustomizer();
  };

  const handleSubmitCart = async () => {
    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty. Please add items before submitting.');
      return;
    }
    setSubmitError(null);
    try {
      await onSubmitOrder(orderSpecialNotes);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit order. Please check your connection and retry.');
    }
  };

  return (
    <div className="w-full flex justify-center bg-[#F9FAFB] min-h-screen">
      {/* Mobile Frame Container matching Image_3 */}
      <div className="w-full max-w-[440px] bg-white min-h-screen flex flex-col shadow-sm border-x border-[#E5E5E5] relative pb-28">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (customizingDish) {
                onCloseCustomizer();
              } else {
                onSelectScreen('menu-feed');
              }
            }}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#171717] hover:text-[#F97316] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>{customizingDish ? 'Back to Cart' : 'Back to Menu'}</span>
          </button>

          {/* Dine-In Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50/80 border border-orange-200 text-[#EA580C] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span>{tableNumber.toUpperCase()} • DINE-IN</span>
          </div>
        </header>

        {/* Global Error Banner */}
        {submitError && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{submitError}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW A: DISH CUSTOMIZER (When customizingDish is selected)          */}
        {/* ------------------------------------------------------------------ */}
        {customizingDish ? (
          <div>
            {/* Hero Product Image */}
            <div className="relative w-full aspect-[4/3] bg-neutral-900 overflow-hidden">
              <img
                src={customizingDish.image}
                alt={customizingDish.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80';
                }}
              />
              {/* Chef's Choice Badge */}
              {customizingDish.chefChoice && (
                <div className="absolute top-3.5 left-3.5 bg-black/70 backdrop-blur-md text-amber-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-amber-400/30 shadow-md">
                  <span className="material-symbols-outlined text-[15px] filled">stars</span>
                  <span>Chef's Choice</span>
                </div>
              )}

              {/* Prep Time Badge */}
              <div className="absolute bottom-3.5 right-3.5 bg-white/90 backdrop-blur-md text-[#171717] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md border border-white/50">
                <span className="material-symbols-outlined text-[15px] text-[#F97316]">schedule</span>
                <span>{customizingDish.prepTimeText || '15 MIN PREP'}</span>
              </div>
            </div>

            {/* Product Details Section */}
            <div className="p-4 space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#171717] leading-tight">
                  {customizingDish.name}
                </h1>

                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-block px-3 py-1 rounded-lg bg-orange-50 text-[#EA580C] font-extrabold text-sm border border-orange-200">
                    Base: {formatUGX(customizingDish.priceUGX)}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[#525252]">
                  {customizingDish.description}
                </p>
              </div>

              {/* Cook Preference Group */}
              <div className="bg-[#FAFAFA] rounded-xl p-3.5 border border-[#E5E5E5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#171717]">
                    <span className="material-symbols-outlined text-[16px] text-[#F97316]">skillet</span>
                    <span>Cook Preference</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
                    Included
                  </span>
                </div>

                <div className="space-y-2">
                  <label
                    onClick={() => setCookPref('Medium Well (Recommended)')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      cookPref === 'Medium Well (Recommended)'
                        ? 'bg-white border-[#F97316] shadow-xs'
                        : 'bg-white/60 border-[#E5E5E5] hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          cookPref === 'Medium Well (Recommended)'
                            ? 'border-[#F97316] bg-[#F97316]'
                            : 'border-neutral-400'
                        }`}
                      >
                        {cookPref === 'Medium Well (Recommended)' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#171717]">Medium Well (Recommended)</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-amber-500">thumb_up</span>
                  </label>

                  <label
                    onClick={() => setCookPref('Well Done')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      cookPref === 'Well Done'
                        ? 'bg-white border-[#F97316] shadow-xs'
                        : 'bg-white/60 border-[#E5E5E5] hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          cookPref === 'Well Done'
                            ? 'border-[#F97316] bg-[#F97316]'
                            : 'border-neutral-400'
                        }`}
                      >
                        {cookPref === 'Well Done' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#171717]">Well Done</span>
                    </div>
                    <span className="text-[11px] text-[#737373]">Fully charred edge</span>
                  </label>
                </div>
              </div>

              {/* Optional Extras Group */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#171717]">
                    <span className="material-symbols-outlined text-[16px] text-[#F97316]">add_circle</span>
                    <span>Optional Extras</span>
                  </div>
                  <span className="text-xs text-[#737373]">Custom toppings</span>
                </div>

                <div className="space-y-2">
                  {EXTRAS_OPTIONS.map((ext) => {
                    const isChecked = Boolean(selectedExtras[ext.id]);
                    return (
                      <div
                        key={ext.id}
                        onClick={() => toggleExtra(ext.id)}
                        className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-orange-50/40 border-[#F97316] shadow-xs'
                            : 'bg-white border-[#E5E5E5]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                              isChecked ? 'bg-[#F97316] border-[#F97316] text-white' : 'border-neutral-400'
                            }`}
                          >
                            {isChecked && <span className="material-symbols-outlined text-[14px]">check</span>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#171717]">{ext.name}</p>
                            <p className="text-[11px] text-[#737373]">{ext.description}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#171717] tabular-nums">
                          +{formatUGX(ext.priceUGX)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Instructions for Dish */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#171717]">
                  <span className="material-symbols-outlined text-[16px] text-[#F97316]">edit_note</span>
                  <span>Special Notes for this Dish</span>
                </div>
                <textarea
                  rows={2}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g., Sauce on the side, no raw onions..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-[#171717] focus:bg-white focus:border-[#F97316] outline-none transition-all resize-none placeholder:text-neutral-400"
                />
              </div>

              {/* Quantity Stepper & Add to Cart Button */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl px-2 py-1 shadow-2xs">
                    <button
                      onClick={() => setCustomizerQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 font-bold active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-[#171717] tabular-nums">
                      {customizerQuantity}
                    </span>
                    <button
                      onClick={() => setCustomizerQuantity((q) => q + 1)}
                      className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 font-bold active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>

                  <button
                    onClick={handleAddCustomizedItem}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                    <span>Add to Cart • {formatUGX(customizerLineTotal)}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* VIEW B: CART REVIEW & CHECKOUT (List of all items)                */
          /* ------------------------------------------------------------------ */
          <div className="p-4 space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#171717]">
                Your Dining Order Cart
              </h1>
              <p className="text-xs text-[#737373] mt-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#F97316]">
                  table_restaurant
                </span>
                <span>
                  {restaurantName} • {tableLocation}
                </span>
              </p>
            </div>

            {/* Empty State */}
            {cartItems.length === 0 ? (
              <div className="py-12 px-4 text-center bg-[#FAFAFA] rounded-2xl border border-dashed border-[#E5E5E5] space-y-3">
                <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 text-[#F97316] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">remove_shopping_cart</span>
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Your Cart is Empty</h3>
                <p className="text-xs text-[#737373] max-w-xs mx-auto">
                  You haven't added any meals yet. Browse our flame-grilled dishes, burgers, and platters!
                </p>
                <button
                  onClick={() => onSelectScreen('menu-feed')}
                  className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Browse Delicious Menu
                </button>
              </div>
            ) : (
              /* Populated Cart Items */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#F97316] text-[18px]">
                      shopping_cart
                    </span>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#171717]">
                      Items to Order ({cartItems.reduce((acc, it) => acc + it.quantity, 0)} total)
                    </h2>
                  </div>
                  <button
                    onClick={() => onSelectScreen('menu-feed')}
                    className="text-xs font-bold text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Add More Items</span>
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const extrasDescription = item.selectedExtras.map((e) => e.name).join(', ');
                    const detailsString = [item.cookPreference, extrasDescription, item.specialInstructions]
                      .filter(Boolean)
                      .join(' • ');

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border border-[#E5E5E5] bg-white flex items-start justify-between gap-3 shadow-2xs hover:border-orange-200 transition-all"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                          <img
                            src={
                              item.image ||
                              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80'
                            }
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80';
                            }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-[#171717] leading-tight line-clamp-1">
                              {item.name}
                            </p>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              title="Remove item"
                              className="text-neutral-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>

                          {detailsString && (
                            <p className="text-[11px] text-[#737373] mt-0.5 line-clamp-2">
                              {detailsString}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-extrabold text-[#171717] tabular-nums">
                              {formatUGX(item.lineTotal)}
                            </span>

                            {/* Quantity Stepper */}
                            <div className="flex items-center bg-[#F3F4F6] rounded-lg px-1.5 py-0.5 border border-neutral-200">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900 font-bold active:scale-95 transition-transform cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">remove</span>
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-[#171717] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900 font-bold active:scale-95 transition-transform cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Special Instructions for Order */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#171717]">
                    <span className="material-symbols-outlined text-[16px] text-[#F97316]">edit_note</span>
                    <span>Order Notes for Kitchen &amp; Floor Staff</span>
                  </div>
                  <textarea
                    rows={2}
                    value={orderSpecialNotes}
                    onChange={(e) => setOrderSpecialNotes(e.target.value)}
                    placeholder="e.g., Please bring extra napkins, serve drinks first..."
                    className="w-full text-xs p-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-[#171717] focus:bg-white focus:border-[#F97316] outline-none transition-all resize-none placeholder:text-neutral-400"
                  />
                </div>

                {/* Pricing Breakdown Card */}
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[#525252]">
                    <span>Subtotal ({cartItems.reduce((acc, it) => acc + it.quantity, 0)} items)</span>
                    <span className="font-semibold text-[#171717] tabular-nums">
                      {formatUGX(cartSubtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#525252]">
                    <span>Taxes / Service</span>
                    <span className="text-neutral-500 font-medium">Included in menu prices</span>
                  </div>
                  <div className="pt-2 border-t border-[#E5E5E5] flex items-baseline justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-[#171717]">Total Payable</p>
                      <p className="text-[11px] text-[#737373]">No hidden surcharges</p>
                    </div>
                    <p className="text-xl font-extrabold text-[#EA580C] tabular-nums tracking-tight">
                      {formatUGX(cartSubtotal)}
                    </p>
                  </div>
                </div>

                {/* Pay at End & Card Payment Notice */}
                <div className="p-3.5 rounded-xl bg-orange-50/90 border border-orange-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#EA580C] text-[18px] shrink-0 mt-0.5">
                    credit_card
                  </span>
                  <p className="text-xs text-neutral-800 leading-relaxed">
                    <strong className="font-bold text-[#EA580C]">Order First, Pay at the End:</strong> Your food goes straight to the kitchen. You can settle your bill at the end of your meal via <strong className="font-bold text-[#171717]">Card (POS)</strong>, <strong className="font-bold text-[#171717]">Cash</strong>, <strong className="font-bold text-[#171717]">MTN MoMo</strong>, or <strong className="font-bold text-[#171717]">Airtel Money</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* BOTTOM ACTION BAR (Submit Order when not customizing)              */}
        {/* ------------------------------------------------------------------ */}
        {!customizingDish && cartItems.length > 0 && (
          <div className="fixed bottom-0 max-w-[440px] w-full bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] p-4 shadow-lg z-30">
            <button
              disabled={isSubmitting}
              onClick={handleSubmitCart}
              className={`w-full py-3.5 px-5 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                isSubmitting ? 'bg-neutral-400 cursor-not-allowed' : 'bg-[#F97316] hover:bg-[#EA580C]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Submitting Secure Order...</span>
                </>
              ) : (
                <>
                  <span>Confirm &amp; Place Order ({formatUGX(cartSubtotal)})</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
