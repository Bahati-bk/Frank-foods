export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'pending_payment';
export type PaymentMethod = 'Cash' | 'MTN MoMo' | 'Airtel Money' | 'Card';
export type OrderType = 'table_qr' | 'counter_walk_in';
export type UserRole = 'owner' | 'manager' | 'kitchen' | 'staff' | 'admin';

export interface AuthenticatedUser {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  fullName: string;
  email: string;
  role: UserRole;
  branch?: string;
}

export interface ExtraOption {
  id: string;
  name: string;
  priceUGX: number;
  description: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Dish {
  id: string;
  restaurantId?: string;
  categoryId?: string;
  name: string;
  category: 'Burgers' | 'Grills' | 'Rice Platters' | 'Sides' | 'Fresh Juices' | string;
  priceUGX: number;
  prepTimeText: string;
  description: string;
  chefChoice?: boolean;
  image: string;
  cookPreferences?: string[];
  extras?: ExtraOption[];
  stockStatus: 'available' | 'sold_out';
  pauseReason?: string;
  displayOrder?: number;
}

export interface SelectedExtra {
  id: string;
  name: string;
  priceUGX: number;
}

export interface CartItem {
  id: string;
  dishId: string;
  name: string;
  priceUGX: number;
  quantity: number;
  cookPreference?: string;
  selectedExtras: SelectedExtra[];
  specialInstructions?: string;
  lineTotal: number;
  image?: string;
}

export interface OrderItem {
  name: string;
  details: string;
  quantity: number;
  priceUGX: number;
  badge?: string;
}

export interface Order {
  id: string;
  restaurantId?: string;
  orderNumber: string; // e.g. #FF-0842
  tableId?: string;
  tableNumber: string; // e.g. Table 07
  tableLocation: string; // e.g. Table 07 (Terrace)
  timePlaced: string; // e.g. 1:42 PM
  timePlacedAgo: string; // e.g. 4m ago
  status: OrderStatus;
  paymentVerified: boolean;
  paymentMethod?: PaymentMethod;
  paymentRequestedMethod?: PaymentMethod;
  verifiedBy?: string;
  orderType: OrderType;
  items: OrderItem[];
  specialInstructions?: string;
  subtotalUGX: number;
  totalUGX: number;
  serverAlertActive?: boolean;
  serverAlertReason?: string;
  guestAccessToken?: string;
  restaurantName?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableStand {
  id: string;
  restaurantId?: string;
  label: string;
  locationZone: 'Terrace' | 'Indoor' | 'Walk-Up' | 'Barista';
  path: string;
  fullUrl: string;
  qrCodeToken?: string;
  status: 'occupied' | 'available';
  isActive?: boolean;
  activeOrderId?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  roleType?: UserRole;
  email?: string;
  restaurantId?: string;
  assignedTables: string;
  station: string;
  active: boolean;
}

export interface ShiftPerformance {
  estimatedSalesUGX: number;
  ordersCompletedCount: number;
  qrDineInCount: number;
  counterCount: number;
  occupiedTablesCount: number;
  totalTablesCount: number;
  paymentBreakdown: {
    mtnPercent: number;
    airtelPercent: number;
    cashPercent: number;
    cardPercent?: number;
  };
}
