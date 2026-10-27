import React, { useState, useEffect } from 'react';
import { Dish, TableStand, StaffMember, ShiftPerformance, MenuCategory, Order } from '../../types/dining';
import { formatUGX } from '../../utils/format';
import { TableQrPrintModal } from '../common/TableQrPrintModal';

interface Props {
  dishes: Dish[];
  tables: TableStand[];
  staff: StaffMember[];
  shiftStats: ShiftPerformance;
  onUpdateDish: (updatedDish: Dish) => void;
  onAddDish: (newDish: Dish) => void;
  onDeleteDish?: (dishId: string) => void;
  onToggleDishStock: (dishId: string) => void;
  onAddCategory?: (name: string) => void;
  onAddTable?: (tableNumber: string, locationZone: TableStand['locationZone']) => void;
  onRegenerateTableQr?: (tableId: string) => void;
  onDeleteTable?: (tableId: string) => void;
  onAddStaff?: (fullName: string, role: string, email: string) => void;
  onSelectScreen?: (screenId: string) => void;
  onOpenTableDineIn?: (tableLabel: string) => void;
  onSignOut?: () => void;
  branchName?: string;
  restaurantName?: string;
  categories?: MenuCategory[];
  orders?: Order[];
  onCancelOrder?: (orderId: string, reason: string) => void;
}

export const ManagerAdminDashboardScreen: React.FC<Props> = ({
  dishes,
  tables,
  staff,
  shiftStats,
  onUpdateDish,
  onAddDish,
  onDeleteDish,
  onToggleDishStock,
  onAddCategory,
  onAddTable,
  onRegenerateTableQr,
  onDeleteTable,
  onAddStaff,
  onOpenTableDineIn,
  onSignOut,
  onSelectScreen,
  branchName = 'Acacia Mall Flagship',
  restaurantName = 'Frank Foods',
  categories = [],
  orders = [],
  onCancelOrder,
}) => {
  const [activeNav, setActiveNav] = useState<'overview' | 'menu' | 'tables' | 'staff'>('overview');

  // Smoothly scroll to a section on the page taking sticky header height into account
  const scrollToSection = (sectionId: string, navKey: 'overview' | 'menu' | 'tables' | 'staff') => {
    setActiveNav(navKey);
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 110;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    }
  };

  // Sync active nav tab with scroll position
  useEffect(() => {
    const sectionIds: Array<{ id: string; nav: 'overview' | 'menu' | 'tables' | 'staff' }> = [
      { id: 'section-performance', nav: 'overview' },
      { id: 'section-menu', nav: 'menu' },
      { id: 'section-tables', nav: 'tables' },
      { id: 'section-staff', nav: 'staff' },
    ];

    const handleScroll = () => {
      const scrollPosition = window.pageYOffset + 140;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveNav(sectionIds[i].nav);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Currently editing dish in the Quick Dish Editor
  const [editingDishId, setEditingDishId] = useState<string>(dishes[0]?.id || '');
  const editingDish = dishes.find((d) => d.id === editingDishId) || dishes[0];

  const [editName, setEditName] = useState(editingDish?.name || '');
  const [editPrice, setEditPrice] = useState(editingDish?.priceUGX || 28000);
  const [editCategory, setEditCategory] = useState(editingDish?.category || 'Burgers');
  const [editStockStatus, setEditStockStatus] = useState<'available' | 'sold_out'>(
    editingDish?.stockStatus || 'available'
  );
  const [editDescription, setEditDescription] = useState(editingDish?.description || '');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Add dish modal state
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState<number>(20000);
  const [newDishCategory, setNewDishCategory] = useState<Dish['category']>('Grills');
  const [newDishDescription, setNewDishDescription] = useState('');

  // Real QR print modal state
  const [isTableQrModalOpen, setIsTableQrModalOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<TableStand | null>(null);

  // Add table modal state
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableZone, setNewTableZone] = useState<TableStand['locationZone']>('Terrace');

  // Add category modal state
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add staff modal state
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('kitchen');
  const [newStaffEmail, setNewStaffEmail] = useState('');

  // Cancel order modal state
  const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // When changing selected dish
  const handleSelectDishToEdit = (dish: Dish) => {
    setEditingDishId(dish.id);
    setEditName(dish.name);
    setEditPrice(dish.priceUGX);
    setEditCategory(dish.category);
    setEditStockStatus(dish.stockStatus);
    setEditDescription(dish.description);
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;

    const updated: Dish = {
      ...editingDish,
      name: editName,
      priceUGX: Number(editPrice),
      category: editCategory as Dish['category'],
      stockStatus: editStockStatus,
      description: editDescription,
    };

    onUpdateDish(updated);
    setSaveFeedback('Dish updated live in digital menu!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleResetEdit = () => {
    if (editingDish) {
      setEditName(editingDish.name);
      setEditPrice(editingDish.priceUGX);
      setEditCategory(editingDish.category);
      setEditStockStatus(editingDish.stockStatus);
      setEditDescription(editingDish.description);
    }
  };

  const handleCreateNewDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) return;

    const newDish: Dish = {
      id: `dish-${Date.now()}`,
      name: newDishName,
      priceUGX: Number(newDishPrice),
      category: newDishCategory,
      prepTimeText: '12–15 mins prep',
      description: newDishDescription,
      stockStatus: 'available',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    };

    onAddDish(newDish);
    setIsAddDishModalOpen(false);
    setNewDishName('');
    setNewDishDescription('');
    setSaveFeedback(`"${newDish.name}" added to menu catalog!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handlePrintCard = (label: string) => {
    if (label === 'All Table Stands') {
      setSelectedTableForQr(null);
    } else {
      const match = tables.find((t) => t.label === label);
      setSelectedTableForQr(match || null);
    }
    setIsTableQrModalOpen(true);
  };

  const handleCreateNewTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    if (onAddTable) {
      onAddTable(newTableNumber.trim(), newTableZone);
    }
    setIsAddTableModalOpen(false);
    setNewTableNumber('');
    setSaveFeedback(`Table "${newTableNumber.trim()}" stand created!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
    }
    setIsAddCategoryModalOpen(false);
    setNewCategoryName('');
    setSaveFeedback(`Category "${newCategoryName.trim()}" created!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;
    if (onAddStaff) {
      onAddStaff(newStaffName.trim(), newStaffRole, newStaffEmail.trim());
    }
    setIsAddStaffModalOpen(false);
    setNewStaffName('');
    setNewStaffEmail('');
    setSaveFeedback(`Staff profile "${newStaffName.trim()}" provisioned!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleConfirmCancelOrder = () => {
    if (!cancelOrderTarget) return;
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for order cancellation.');
      return;
    }
    if (onCancelOrder) {
      onCancelOrder(cancelOrderTarget.id, cancellationReason.trim());
    }
    setCancelOrderTarget(null);
    setCancellationReason('');
  };

  const availableCount = dishes.filter((d) => d.stockStatus === 'available').length;
  const soldOutCount = dishes.filter((d) => d.stockStatus === 'sold_out').length;

  return (
    <div className="bg-[#FAFAFA] min-h-screen text-[#171717] font-sans antialiased pb-20">
      {/* Top Header matching Image_11 */}
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center text-white font-extrabold text-xl shadow-xs">
              <span className="material-symbols-outlined text-2xl">restaurant</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-[#171717] leading-none">
                  Frank Foods
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">Restaurant Owner Admin</p>
            </div>
          </div>

          {/* Center branch pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 border border-[#E5E5E5] text-xs font-semibold text-[#171717]">
            <span className="material-symbols-outlined text-[16px] text-[#F97316]">storefront</span>
            <span>Branch: <strong className="font-bold">{branchName}</strong></span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePrintCard('All Table Stands')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#171717] hover:bg-neutral-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#525252]">print</span>
              <span>Print Table QRs</span>
            </button>

            <button
              onClick={() => setIsAddDishModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Dish</span>
            </button>

            {/* User Owner profile */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#E5E5E5]">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-[#EA580C] font-extrabold flex items-center justify-center text-xs border border-[#F97316]/20">
                FM
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-[#171717] leading-tight">Frank M.</span>
                <span className="text-[11px] text-[#737373]">Owner</span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign out of portal"
                  className="text-neutral-400 hover:text-red-600 transition-colors ml-1 p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 text-xs font-bold border-t border-[#E5E5E5] overflow-x-auto">
          <button
            onClick={() => scrollToSection('section-performance', 'overview')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeNav === 'overview'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#525252] hover:text-[#171717]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">trending_up</span>
            <span>Overview &amp; Sales</span>
          </button>

          <button
            onClick={() => scrollToSection('section-menu', 'menu')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeNav === 'menu'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#525252] hover:text-[#171717]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">menu_book</span>
            <span>Menu &amp; Catalog Management</span>
            <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[#525252] text-[10px] font-bold">
              {dishes.length} items
            </span>
          </button>

          <button
            onClick={() => scrollToSection('section-tables', 'tables')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeNav === 'tables'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#525252] hover:text-[#171717]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
            <span>Table &amp; QR Stands</span>
            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-[#EA580C] text-[10px] font-bold">
              {tables.length} Stands
            </span>
          </button>

          <button
            onClick={() => scrollToSection('section-staff', 'staff')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeNav === 'staff'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#525252] hover:text-[#171717]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">group</span>
            <span>Staff Accounts</span>
            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
              {staff.length} Active
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {saveFeedback && (
          <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-orange-600">check_circle</span>
              {saveFeedback}
            </span>
            <button
              onClick={() => setSaveFeedback(null)}
              className="text-orange-700 hover:text-orange-900"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 1: TODAY'S SHIFT PERFORMANCE                                      */}
        {/* ========================================================================= */}
        <section id="section-performance" className="space-y-4 scroll-mt-32">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">
                Today's Shift Performance
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#525252] mt-0.5">
                <span className="inline-flex items-center gap-1.5 text-orange-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Shift active
                </span>
                <span>• 11:30 AM - Present (Acacia Mall)</span>
                <span className="text-[#E5E5E5]">|</span>
                <span className="text-[#737373]">Live floor sync</span>
              </div>
            </div>

            <div className="text-xs text-[#737373] font-medium flex items-center gap-1">
              <span>Last refreshed:</span>
              <strong className="text-[#171717]">Just now</strong>
            </div>
          </div>

          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Sales */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                  Today's Estimated Sales
                </span>
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#171717] tracking-tight tabular-nums">
                  {formatUGX(shiftStats.estimatedSalesUGX)}
                </p>
                <p className="text-xs font-semibold text-orange-700 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                  Healthy lunch run
                </p>
              </div>
            </div>

            {/* Card 2: Orders Completed */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                  Orders Completed
                </span>
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#171717] tracking-tight tabular-nums">
                  {shiftStats.ordersCompletedCount} <span className="text-sm font-semibold text-[#737373]">Orders</span>
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-[#525252]">
                  <span className="px-2 py-0.5 rounded bg-gray-100">{shiftStats.qrDineInCount} QR Dine-in</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100">{shiftStats.counterCount} Counter</span>
                </div>
              </div>
            </div>

            {/* Card 3: Active Tables */}
            <div
              onClick={() => scrollToSection('section-tables', 'tables')}
              className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all cursor-pointer group"
              title="Click to jump to Table & QR Stands"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373] group-hover:text-[#EA580C] transition-colors">
                  Active Tables
                </span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-[#EA580C] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#171717] tracking-tight tabular-nums">
                  {shiftStats.occupiedTablesCount}{' '}
                  <span className="text-sm font-semibold text-[#737373]">
                    / {shiftStats.totalTablesCount} Occupied
                  </span>
                </p>
                {/* Floor utilization bar */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-[#F97316] h-full w-[70%] rounded-full"></div>
                </div>
                <p className="text-[11px] text-[#737373] mt-1 text-right">
                  70% current floor utilization
                </p>
              </div>
            </div>

            {/* Card 4: Payment Breakdown */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                  Payment Breakdown
                </span>
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">pie_chart</span>
                </span>
              </div>
              <div className="mt-3">
                {/* Multi-segment bar */}
                <div className="h-2.5 w-full rounded-full flex overflow-hidden">
                  <div className="bg-blue-600 h-full w-[35%]" title="Card (POS): 35%"></div>
                  <div className="bg-amber-500 h-full w-[35%]" title="MTN MoMo: 35%"></div>
                  <div className="bg-red-500 h-full w-[15%]" title="Airtel Money: 15%"></div>
                  <div className="bg-neutral-800 h-full w-[15%]" title="Cash: 15%"></div>
                </div>
                <div className="mt-2 text-[11px] space-y-1 text-[#525252] font-medium">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> Card (Visa/MC POS):
                    </span>
                    <strong className="text-[#171717] tabular-nums">35%</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> MTN Mobile Money:
                    </span>
                    <strong className="text-[#171717] tabular-nums">35%</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Airtel Money:
                    </span>
                    <strong className="text-[#171717] tabular-nums">15%</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neutral-800"></span> Cash UGX:
                    </span>
                    <strong className="text-[#171717] tabular-nums">15%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: MENU CATALOG & INSTANT 86-ING                                  */}
        {/* ========================================================================= */}
        <section id="section-menu" className="space-y-4 scroll-mt-32">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">
                Menu Catalog &amp; Instant 86-ing
              </h2>
              <p className="text-xs text-[#525252]">
                Manage real-time dish availability. Toggling an item "Off" immediately prevents diners
                from ordering it.
              </p>
            </div>
            <button
              onClick={() => setIsAddDishModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add New Dish</span>
            </button>
          </div>

          {/* Catalog Layout Split: Left List, Right Quick Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 8 Cols: Dish List */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E5E5] p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#737373]">Catalog items:</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                    {availableCount} Available
                  </span>
                  {soldOutCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                      {soldOutCount} Sold Out (86-ed)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#737373] hidden sm:inline">
                  Toggle switch to pause or restore items instantly
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#E5E5E5]">
                {dishes.map((dish) => {
                  const isPaused = dish.stockStatus === 'sold_out';
                  const isCurrent = editingDishId === dish.id;

                  return (
                    <div
                      key={dish.id}
                      className={`py-3.5 flex items-center justify-between gap-3 transition-colors rounded-xl px-2.5 ${
                        isCurrent ? 'bg-orange-50/50' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-12 h-12 rounded-xl object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#171717] truncate">
                              {dish.name}
                            </span>
                            <span className="text-[10px] bg-gray-100 text-[#525252] font-semibold px-2 py-0.5 rounded">
                              {dish.category}
                            </span>
                            {isPaused && (
                              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                                86-ed / Sold Out
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold text-[#EA580C] tabular-nums mt-0.5">
                            {formatUGX(dish.priceUGX)}
                          </p>
                          <p className="text-[11px] text-[#737373] truncate mt-0.5">
                            {isPaused && dish.pauseReason
                              ? `Reason: ${dish.pauseReason}`
                              : dish.description}
                          </p>
                        </div>
                      </div>

                      {/* Stock Switch & Edit */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              isPaused ? 'text-red-600' : 'text-orange-700'
                            }`}
                          >
                            {isPaused ? 'Paused' : 'Available'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleDishStock(dish.id)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                              isPaused ? 'bg-neutral-300' : 'bg-orange-600'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                isPaused ? 'translate-x-0' : 'translate-x-5'
                              }`}
                            ></div>
                          </button>
                        </div>

                        {isPaused ? (
                          <button
                            onClick={() => onToggleDishStock(dish.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#171717] text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelectDishToEdit(dish)}
                            className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-[#171717] text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Cols: Quick Dish Editor */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#F97316]">
                    edit_note
                  </span>
                  <h3 className="font-extrabold text-sm text-[#171717]">Quick Dish Editor</h3>
                </div>
                <span className="text-[11px] font-bold text-[#EA580C] bg-orange-50 px-2.5 py-0.5 rounded-md">
                  Active Menu
                </span>
              </div>

              <form onSubmit={handleSaveDish} className="space-y-4">
                {/* Dish Name */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Dish Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-[#E5E5E5] outline-none focus:border-[#F97316] bg-white text-[#171717]"
                    required
                  />
                </div>

                {/* Price and Category in 2 columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#171717] mb-1">
                      Price (UGX)
                    </label>
                    <input
                      type="number"
                      step={500}
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-[#E5E5E5] outline-none focus:border-[#F97316] bg-white text-[#171717]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#171717] mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as Dish['category'])}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-[#E5E5E5] outline-none focus:border-[#F97316] bg-white text-[#171717] cursor-pointer"
                    >
                      <option value="Burgers">Burgers</option>
                      <option value="Grills">Grills</option>
                      <option value="Rice Platters">Rice Platters</option>
                      <option value="Sides">Sides</option>
                      <option value="Fresh Juices">Fresh Juices</option>
                    </select>
                  </div>
                </div>

                {/* Stock Availability */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Stock Availability
                  </label>
                  <select
                    value={editStockStatus}
                    onChange={(e) =>
                      setEditStockStatus(e.target.value as 'available' | 'sold_out')
                    }
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-[#E5E5E5] outline-none focus:border-[#F97316] bg-white text-[#171717] cursor-pointer"
                  >
                    <option value="available">Available (Ready to order)</option>
                    <option value="sold_out">86-ed / Sold Out</option>
                  </select>
                </div>

                {/* Diner Description */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Diner Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E5E5E5] outline-none focus:border-[#F97316] bg-white text-[#171717] resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Save &amp; Update Live Menu
                  </button>
                  <button
                    type="button"
                    onClick={handleResetEdit}
                    className="py-3 px-4 rounded-xl border border-[#E5E5E5] hover:bg-neutral-100 text-[#525252] font-semibold text-xs transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: TABLE QR CODE MANAGEMENT                                      */}
        {/* ========================================================================= */}
        <section id="section-tables" className="space-y-4 scroll-mt-32">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#F97316] text-[22px]">
                  qr_code_scanner
                </span>
                <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">
                  Table QR Code Management
                </h2>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                Movable table acrylic stands. Diners scan each unique code to open the ordering
                menu pre-locked to their table location.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Table Stand</span>
              </button>
              <button
                onClick={() => handlePrintCard('All Table Stands')}
                className="px-4 py-2.5 rounded-xl bg-[#171717] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print All Stand Cards</span>
              </button>
            </div>
          </div>

          {/* 6 Stand Cards matching Image_11 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {tables.map((table) => {
              const isTable7 = table.id === 'table-07';
              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl p-4 border flex flex-col justify-between text-center transition-all shadow-xs ${
                    isTable7 ? 'border-orange-400 ring-2 ring-orange-200' : 'border-[#E5E5E5]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-extrabold text-[#171717]">{table.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        table.locationZone === 'Terrace'
                          ? 'bg-orange-50 text-[#EA580C]'
                          : table.locationZone === 'Walk-Up'
                          ? 'bg-amber-50 text-amber-800'
                          : table.locationZone === 'Barista'
                          ? 'bg-purple-50 text-purple-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {table.locationZone}
                    </span>
                  </div>

                  {/* QR Graphic box */}
                  <div className="my-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col items-center justify-center">
                    {/* SVG Realistic QR Matrix */}
                    <div className="w-20 h-20 bg-white p-1 rounded-lg border border-neutral-200 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* 3 Position Corners */}
                        <rect x="5" y="5" width="28" height="28" fill="#171717" rx="3" />
                        <rect x="11" y="11" width="16" height="16" fill="#fff" />
                        <rect x="15" y="15" width="8" height="8" fill="#171717" />

                        <rect x="67" y="5" width="28" height="28" fill="#171717" rx="3" />
                        <rect x="73" y="11" width="16" height="16" fill="#fff" />
                        <rect x="77" y="15" width="8" height="8" fill="#171717" />

                        <rect x="5" y="67" width="28" height="28" fill="#171717" rx="3" />
                        <rect x="11" y="73" width="16" height="16" fill="#fff" />
                        <rect x="15" y="77" width="8" height="8" fill="#171717" />

                        {/* Center accent dot in brand color */}
                        <rect x="44" y="44" width="12" height="12" fill="#F97316" rx="2" />
                        {/* Data dots */}
                        <rect x="40" y="10" width="8" height="8" fill="#171717" />
                        <rect x="52" y="10" width="8" height="8" fill="#171717" />
                        <rect x="40" y="24" width="8" height="8" fill="#171717" />
                        <rect x="10" y="42" width="8" height="8" fill="#171717" />
                        <rect x="24" y="42" width="8" height="8" fill="#171717" />
                        <rect x="68" y="42" width="8" height="8" fill="#171717" />
                        <rect x="82" y="42" width="8" height="8" fill="#171717" />
                        <rect x="42" y="68" width="8" height="8" fill="#171717" />
                        <rect x="54" y="80" width="8" height="8" fill="#171717" />
                        <rect x="68" y="68" width="8" height="8" fill="#171717" />
                        <rect x="82" y="80" width="8" height="8" fill="#171717" />
                      </svg>
                    </div>
                    <span className="text-[10px] text-[#737373] font-mono mt-1">
                      {table.fullUrl}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="my-1.5 text-[11px]">
                    {isTable7 ? (
                      <span className="font-bold text-[#EA580C] flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                        Active Dine-In (#FF-0842)
                      </span>
                    ) : (
                      <span className="text-[#525252]">Status: <strong className="font-semibold text-neutral-800">Available</strong></span>
                    )}
                  </div>

                  {/* Print Button */}
                  <button
                    onClick={() => handlePrintCard(table.label)}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isTable7
                        ? 'bg-[#F97316] text-white hover:bg-[#EA580C]'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-[#171717]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    <span>Print Card</span>
                  </button>

                  {/* Quick simulate table QR scan */}
                  {onOpenTableDineIn && (
                    <button
                      type="button"
                      onClick={() => onOpenTableDineIn(table.label)}
                      className="text-[10px] text-[#F97316] font-semibold hover:underline mt-1 cursor-pointer"
                    >
                      Simulate Guest Scan
                    </button>
                  )}

                  {/* Regenerate Token button */}
                  {onRegenerateTableQr && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Regenerate QR token for ${table.label}? The existing QR code will be revoked.`)) {
                          onRegenerateTableQr(table.id);
                        }
                      }}
                      className="text-[9px] text-neutral-400 hover:text-red-500 hover:underline mt-0.5 cursor-pointer"
                    >
                      Regenerate Token
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: STAFF ACCOUNTS & STATION SHIFTS                                */}
        {/* ========================================================================= */}
        <section id="section-staff" className="space-y-4 scroll-mt-32">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#F97316] text-[20px]">
                  badge
                </span>
                <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">
                  Staff Accounts &amp; Station Shifts
                </h2>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                Active personnel authorized for Acacia Mall restaurant operations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddStaffModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Invite Staff Member</span>
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 text-xs font-bold border border-orange-200">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                {staff.length} Accounts Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {staff.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-orange-100 text-[#EA580C] font-extrabold flex items-center justify-center text-sm border border-[#F97316]/20">
                    {member.initials}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#171717] leading-tight">
                      {member.name}
                    </h4>
                    <p className="text-xs text-[#525252] mt-0.5">{member.role}</p>
                    <p className="text-[11px] text-[#737373] mt-0.5">
                      PIN: •••• | {member.assignedTables ? `Assigned: ${member.assignedTables}` : member.station}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                  Active
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Add New Dish Modal */}
      {isAddDishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5E5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
              <h3 className="font-bold text-base text-[#171717]">Add New Dish to Menu</h3>
              <button
                onClick={() => setIsAddDishModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewDish} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">Dish Name</label>
                <input
                  type="text"
                  placeholder="e.g., Crispy Chicken Rolex Platter"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E5E5E5] focus:border-[#F97316] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Price (UGX)
                  </label>
                  <input
                    type="number"
                    step={500}
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E5E5E5] focus:border-[#F97316] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Category</label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value as Dish['category'])}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E5E5E5] focus:border-[#F97316] outline-none"
                  >
                    <option value="Burgers">Burgers</option>
                    <option value="Grills">Grills</option>
                    <option value="Rice Platters">Rice Platters</option>
                    <option value="Sides">Sides</option>
                    <option value="Fresh Juices">Fresh Juices</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Freshly rolled Ugandan chapati with eggs and seasoned minced chicken..."
                  value={newDishDescription}
                  onChange={(e) => setNewDishDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E5E5E5] focus:border-[#F97316] outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#F97316] text-white font-bold text-xs hover:bg-[#EA580C] transition-colors"
                >
                  Create &amp; Publish Dish
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDishModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Resolution Printable Table QR Stand Modal */}
      <TableQrPrintModal
        isOpen={isTableQrModalOpen}
        onClose={() => setIsTableQrModalOpen(false)}
        table={selectedTableForQr}
        allTables={tables}
        restaurantName={restaurantName}
        branchName={branchName}
      />

      {/* Add New Table Stand Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <h3 className="font-bold text-base text-neutral-900">Add New Table Stand</h3>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Table Label / Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table 25 or VIP Booth 02"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-[#F97316] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Floor Zone
                </label>
                <select
                  value={newTableZone}
                  onChange={(e) => setNewTableZone(e.target.value as TableStand['locationZone'])}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-[#F97316] outline-none"
                >
                  <option value="Terrace">Terrace Outdoor</option>
                  <option value="Indoor">Indoor Main Hall</option>
                  <option value="Barista">Barista Lounge</option>
                  <option value="Walk-Up">Walk-Up Counter</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#F97316] text-white font-bold text-xs hover:bg-[#EA580C] transition-colors"
                >
                  Create Stand
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <h3 className="font-bold text-base text-neutral-900">Add Menu Category</h3>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wood-Fired Specialties, Desserts, Mocktails"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-[#F97316] outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#F97316] text-white font-bold text-xs hover:bg-[#EA580C] transition-colors"
                >
                  Save Category
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Staff Member Modal */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <h3 className="font-bold text-base text-neutral-900">Invite Staff Member</h3>
              <button
                type="button"
                onClick={() => setIsAddStaffModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patrick M. (Grill Master)"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-[#F97316] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Station Role
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-[#F97316] outline-none"
                >
                  <option value="kitchen">Kitchen Chef (KDS Station)</option>
                  <option value="staff">Floor Staff (Table Service &amp; Bill Settle)</option>
                  <option value="manager">Assistant Branch Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. patrick@frankfoods.ug"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-[#F97316] outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#F97316] text-white font-bold text-xs hover:bg-[#EA580C] transition-colors"
                >
                  Provision Profile
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelOrderTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-extrabold text-base text-neutral-900">
                Cancel Order {cancelOrderTarget.orderNumber}?
              </h3>
            </div>
            <p className="text-xs text-neutral-600">
              Provide an operational cancellation reason. This action will be audited in the database:
            </p>

            <textarea
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Out of stock / Customer requested void / Duplicate entry"
              className="w-full p-2.5 border border-neutral-300 rounded-xl text-xs focus:border-red-500 outline-none"
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelOrderTarget(null);
                  setCancellationReason('');
                }}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
