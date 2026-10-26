import React, { useState } from 'react';
import { Dish, CartItem } from '../../types/dining';
import { formatUGX } from '../../utils/format';

interface Props {
  dishes: Dish[];
  tableNumber: string;
  onSelectTable: (table: string) => void;
  onOpenCustomizer: (dish: Dish) => void;
  onQuickAdd: (dish: Dish) => void;
  cartItemsCount: number;
  cartTotalUGX: number;
  onViewCart: () => void;
  availableTables: string[];
  restaurantName?: string;
  branchLocation?: string;
  qrToken?: string;
  qrTokenError?: string | null;
}

export const DineInMenuFeedScreen: React.FC<Props> = ({
  dishes,
  tableNumber,
  onSelectTable,
  onOpenCustomizer,
  onQuickAdd,
  cartItemsCount,
  cartTotalUGX,
  onViewCart,
  availableTables,
  restaurantName = 'Frank Foods',
  branchLocation = 'Acacia Mall • Dine-In',
  qrToken,
  qrTokenError,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Popular Specials' | 'Flame Grills' | 'Burgers' | 'Rice Platters' | 'Fresh Juices'>('All');
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  const categories = [
    { id: 'All', label: 'All', icon: 'check' },
    { id: 'Popular Specials', label: 'Popular Specials', emoji: '🔥' },
    { id: 'Flame Grills', label: 'Flame Grills', icon: 'skillet' },
    { id: 'Burgers', label: 'Burgers', icon: 'lunch_dining' },
    { id: 'Rice Platters', label: 'Rice Platters', icon: 'rice_bowl' },
    { id: 'Fresh Juices', label: 'Fresh Juices', icon: 'local_bar' },
  ];

  // Filter dishes
  const filteredDishes = dishes.filter((dish) => {
    // Category filter
    if (selectedCategory === 'Popular Specials') {
      if (!dish.chefChoice && dish.id !== 'dish-flame-grilled-chicken') return false;
    } else if (selectedCategory === 'Flame Grills') {
      if (dish.category !== 'Grills') return false;
    } else if (selectedCategory === 'Burgers') {
      if (dish.category !== 'Burgers') return false;
    } else if (selectedCategory === 'Rice Platters') {
      if (dish.category !== 'Rice Platters') return false;
    } else if (selectedCategory === 'Fresh Juices') {
      if (dish.category !== 'Fresh Juices') return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = dish.name.toLowerCase().includes(q);
      const matchDesc = dish.description.toLowerCase().includes(q);
      const matchCat = dish.category.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  const handleAddClick = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    if (dish.stockStatus === 'sold_out') return;

    // If burger or items with customizable options, open customizer
    if (dish.cookPreferences && dish.cookPreferences.length > 0) {
      onOpenCustomizer(dish);
    } else {
      // Quick add directly
      onQuickAdd(dish);
      setAddedAnimationId(dish.id);
      setTimeout(() => setAddedAnimationId(null), 1200);
    }
  };

  return (
    <div className="w-full flex justify-center bg-[#F9FAFB] min-h-screen">
      {/* Mobile Viewport Container matching screen_90d188ca.png */}
      <div className="w-full max-w-[420px] bg-white min-h-screen flex flex-col shadow-sm border-x border-[#E5E5E5] pb-36 relative">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-[#E5E5E5]/60">
          {/* Brand Logo & Location */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F97316] shrink-0">
              <span className="material-symbols-outlined text-[20px]">restaurant</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center text-lg font-black tracking-tight leading-none text-[#171717]">
                <span>{restaurantName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#525252] mt-0.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{branchLocation}</span>
              </div>
            </div>
          </div>

          {/* Table Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50/60 text-[#EA580C] text-xs font-bold hover:bg-orange-100/60 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">table_restaurant</span>
              <span>{tableNumber}</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>

            {/* Table Dropdown Menu */}
            {isTableDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-[#E5E5E5] py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#737373] border-b border-gray-100">
                  Select Your Table
                </div>
                {availableTables.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onSelectTable(t);
                      setIsTableDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-orange-50 transition-colors ${
                      t === tableNumber ? 'text-[#F97316] bg-orange-50/50 font-bold' : 'text-[#171717]'
                    }`}
                  >
                    <span>{t}</span>
                    {t === tableNumber && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* QR Token Status Notification */}
        {qrTokenError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">qr_code_scanner</span>
            <div>
              <p className="font-bold">QR Code Notice</p>
              <p className="text-[11px] text-red-700 mt-0.5">{qrTokenError}</p>
            </div>
          </div>
        )}
        {qrToken && !qrTokenError && (
          <div className="mx-4 mt-3 py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
              <span className="font-bold text-[11px]">QR Table Verified: {tableNumber}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600">Token Active</span>
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 pt-3 space-y-4">
          {/* Search Bar */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search burger, chicken, pilau..."
              className="w-full bg-[#F3F4F6] text-[#171717] placeholder:text-[#737373] text-xs pl-10 pr-9 py-2.5 rounded-full border border-transparent focus:border-[#F97316] focus:bg-white outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Hero Promo Banner */}
          <div className="relative rounded-2xl bg-[#1C1917] text-white p-4 overflow-hidden flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-1.5 flex-1 z-10">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#F97316] text-white text-[10px] font-extrabold uppercase tracking-wider">
                FLAME FRESH
              </span>
              <h2 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Good food. Great moments.
              </h2>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Flame-grilled Ugandan favorites delivered straight to {tableNumber}.
              </p>
            </div>

            {/* Banner Food Thumbnail */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700 shadow-inner">
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80"
                alt="Promo burger"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Category Chips Scroll Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#F97316] text-white shadow-xs'
                      : 'bg-white border border-[#E5E5E5] text-[#525252] hover:bg-neutral-50'
                  }`}
                >
                  {cat.icon && (
                    <span className="material-symbols-outlined text-[14px]">
                      {cat.icon}
                    </span>
                  )}
                  {cat.emoji && <span>{cat.emoji}</span>}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Menu Items Cards List */}
          <div className="space-y-3.5 pt-1">
            {filteredDishes.map((dish) => {
              const isAvailable = dish.stockStatus === 'available';
              const isPopular = dish.id === 'dish-flame-grilled-chicken';
              const isChefChoice = dish.chefChoice;

              return (
                <div
                  key={dish.id}
                  onClick={() => isAvailable && onOpenCustomizer(dish)}
                  className={`bg-white rounded-2xl border p-3 flex gap-3.5 items-stretch transition-all relative ${
                    isAvailable
                      ? 'border-[#E5E5E5] hover:border-orange-300 shadow-2xs hover:shadow-xs cursor-pointer'
                      : 'border-[#E5E5E5] bg-neutral-50/70 opacity-80'
                  }`}
                >
                  {/* Dish Thumbnail */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                      }}
                    />

                    {/* Image Badges */}
                    {isChefChoice && isAvailable && (
                      <div className="absolute top-1.5 left-1.5 bg-[#EA580C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Chef's Choice
                      </div>
                    )}
                    {isPopular && isAvailable && (
                      <div className="absolute top-1.5 left-1.5 bg-[#171717] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Popular
                      </div>
                    )}
                    {!isAvailable && (
                      <div className="absolute top-1.5 left-1.5 bg-neutral-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Sold Out
                      </div>
                    )}
                  </div>

                  {/* Dish Info & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-[#171717] leading-tight line-clamp-1">
                        {dish.name}
                      </h3>
                      <p className="text-[11px] text-[#737373] line-clamp-2 mt-1 leading-snug">
                        {dish.description}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        {/* Status bullet */}
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          ></span>
                          <span
                            className={isAvailable ? 'text-emerald-700' : 'text-red-600'}
                          >
                            {isAvailable ? 'AVAILABLE' : 'CURRENTLY UNAVAILABLE'}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#171717] tabular-nums mt-0.5">
                          {formatUGX(dish.priceUGX)}
                        </span>
                      </div>

                      {/* Add Button */}
                      {isAvailable ? (
                        <button
                          onClick={(e) => handleAddClick(e, dish)}
                          className={`px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer ${
                            addedAnimationId === dish.id ? 'bg-emerald-600' : ''
                          }`}
                        >
                          {addedAnimationId === dish.id ? (
                            <>
                              <span className="material-symbols-outlined text-[15px]">check</span>
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[15px]">add</span>
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-400 text-xs font-semibold flex items-center gap-1 cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[14px]">block</span>
                          <span>Sold Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDishes.length === 0 && (
              <div className="p-8 text-center text-[#737373] bg-white rounded-2xl border border-[#E5E5E5] space-y-2">
                <span className="material-symbols-outlined text-4xl text-neutral-300">search_off</span>
                <p className="text-xs font-bold text-[#171717]">No dishes found</p>
                <p className="text-[11px]">Try searching for something else or reset your filter.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-50 text-[#EA580C] text-xs font-bold hover:bg-orange-100"
                >
                  Show All Dishes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Floating Bar & Notice matching screen_90d188ca.png */}
        <div className="fixed bottom-0 max-w-[420px] w-full bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] p-3 space-y-2.5 z-40 shadow-xl">
          {/* Pay notice pill */}
          <div className="py-2 px-3 rounded-xl bg-orange-50/80 border border-orange-200 text-center flex items-center justify-center gap-2 text-[11px] text-[#EA580C] font-semibold leading-tight">
            <span className="material-symbols-outlined text-[16px]">payments</span>
            <span>Pay in cash or mobile money with your server upon order verification.</span>
          </div>

          {/* Floating Dark Cart Bar */}
          <div className="bg-[#171717] rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-lg text-white">
            <div className="flex items-center gap-3">
              {/* Shopping bag with badge */}
              <div className="relative w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center text-white shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[#EA580C] font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                    {cartItemsCount}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-neutral-300 font-medium">
                  {cartItemsCount} {cartItemsCount === 1 ? 'Item' : 'Items'} in Order
                </span>
                <span className="text-base font-extrabold text-white tabular-nums tracking-tight">
                  {formatUGX(cartTotalUGX)}
                </span>
              </div>
            </div>

            {/* View Cart Button */}
            <button
              onClick={onViewCart}
              className="py-2.5 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>View Cart &amp; Order</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
