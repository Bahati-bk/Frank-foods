/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured, DbRestaurant, DbRestaurantTable } from '../lib/supabase';
import {
  sqliteGetRestaurants,
  sqliteGetTables,
  sqliteGetMenuItems,
  sqliteGetStaffOrders,
  sqliteCreateGuestOrder,
  sqliteGetGuestOrder,
  sqliteVerifyStaffPayment,
  sqliteAdvanceOrderStatus,
  sqliteToggleMenuItemAvailability,
  sqliteResolveTableByQrToken,
  sqliteSetServerAlert,
  sqliteGetCategories,
  sqliteCreateCategory,
  sqliteUpdateCategory,
  sqliteDeleteCategory,
  sqliteCreateMenuItem,
  sqliteUpdateMenuItem,
  sqliteDeleteMenuItem,
  sqliteCreateTableStand,
  sqliteUpdateTableStand,
  sqliteRegenerateQrToken,
  sqliteDeleteTableStand,
  sqliteGetStaffProfiles,
  sqliteCreateStaffProfile,
  sqliteUpdateOrderStatus,
  sqliteCancelOrder,
  sqliteGetShiftStats,
} from '../lib/sqliteDatabase';
import { Dish, Order, OrderStatus, PaymentMethod, TableStand, MenuCategory, StaffMember, ShiftPerformance } from '../types/dining';

// Known Tenant Constants
export const TENANTS = {
  FRANK_FOODS: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Frank Foods',
    slug: 'frank-foods',
    branch: 'Acacia Mall, Kampala',
    currency: 'UGX',
  },
  DEMO_BISTRO: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Demo Bistro',
    slug: 'demo-bistro',
    branch: 'Kololo Heights, Kampala',
    currency: 'UGX',
  },
} as const;

export type TenantId = typeof TENANTS[keyof typeof TENANTS]['id'];

export interface GuestOrderItemInput {
  menu_item_id: string;
  quantity: number;
  special_instructions?: string;
}

export interface GuestOrderResult {
  order_id: string;
  order_number: string;
  restaurant_id: string;
  table_id: string | null;
  status: OrderStatus;
  payment_status: 'pending' | 'paid';
  subtotal: number;
  total: number;
  guest_access_token: string;
}

export interface GuestOrderDetails {
  id: string;
  order_number: string;
  restaurant_name: string;
  restaurant_currency: string;
  table_number: string;
  table_location: string;
  status: OrderStatus;
  payment_status: 'pending' | 'paid' | 'refunded';
  subtotal: number;
  total: number;
  special_instructions?: string | null;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
    special_instructions?: string | null;
  }>;
  payment_verified: boolean;
}

// ----------------------------------------------------------------------------
// Restaurant Service Layer (Powered by SQLite on-device & Supabase cloud)
// ----------------------------------------------------------------------------

export const restaurantService = {
  /**
   * Fetch restaurant details
   */
  async getRestaurant(tenantId: TenantId): Promise<DbRestaurant> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw new Error(`Supabase error: ${error.message}`);
      return data as DbRestaurant;
    }

    const rows = await sqliteGetRestaurants();
    const match = rows.find((r) => r.id === tenantId);
    if (!match) throw new Error(`Tenant ${tenantId} not found in SQLite database`);
    return {
      id: match.id,
      name: match.name,
      slug: match.slug,
      currency: match.currency,
      tax_rate_percent: match.tax_rate_percent,
      phone: match.phone,
      address: match.address,
      is_active: match.is_active === 1,
      created_at: match.created_at,
    };
  },

  /**
   * Fetch active tables for a restaurant from SQLite/Supabase
   */
  async getTables(tenantId: TenantId): Promise<TableStand[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', tenantId)
        .eq('is_active', true)
        .order('table_number');

      if (error) throw new Error(`Supabase error: ${error.message}`);
      return (data || []).map((t: DbRestaurantTable) => ({
        id: t.id,
        label: t.table_number,
        locationZone: t.location_zone,
        path: `/dine-in?token=${t.qr_code_token}`,
        fullUrl: `https://frankfoods.ug/dine-in?token=${t.qr_code_token}`,
        status: 'occupied',
      }));
    }

    const rows = await sqliteGetTables(tenantId);
    return rows.map((t) => ({
      id: t.id,
      label: t.table_number,
      locationZone: t.location_zone,
      path: `/dine-in?token=${t.qr_code_token}`,
      fullUrl: `https://frankfoods.ug/dine-in?token=${t.qr_code_token}`,
      status: 'occupied',
    }));
  },

  /**
   * Resolve table and restaurant from scanned QR token
   */
  async resolveTableByQrToken(qrToken: string): Promise<{
    table_id: string;
    table_number: string;
    location_zone: string;
    restaurant_id: string;
    restaurant_name: string;
    restaurant_slug: string;
    currency: string;
  }> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select(`
          id,
          table_number,
          location_zone,
          restaurant_id,
          restaurant:restaurants(name, slug, currency, is_active)
        `)
        .eq('qr_code_token', qrToken)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error(`Invalid or inactive table QR code token: "${qrToken}"`);
      }

      const rest: any = data.restaurant;
      if (!rest || !rest.is_active) {
        throw new Error('This restaurant is currently not accepting orders.');
      }

      return {
        table_id: data.id,
        table_number: data.table_number,
        location_zone: data.location_zone,
        restaurant_id: data.restaurant_id,
        restaurant_name: rest.name,
        restaurant_slug: rest.slug,
        currency: rest.currency || 'UGX',
      };
    }

    return await sqliteResolveTableByQrToken(qrToken);
  },

  /**
   * Toggle server alert on active order
   */
  async setServerAlert(orderId: string, active: boolean): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('orders')
        .update({ server_alert_active: active })
        .eq('id', orderId);
      return;
    }

    await sqliteSetServerAlert(orderId, active);
  },

  /**
   * Fetch menu items for a restaurant (maps to UI Dish type)
   */
  async getMenuDishes(tenantId: TenantId): Promise<Dish[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          prep_time_minutes,
          is_available,
          is_chef_choice,
          category:menu_categories(name)
        `)
        .eq('restaurant_id', tenantId)
        .order('display_order');

      if (error) throw new Error(`Supabase error: ${error.message}`);
      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: (item.category?.name || 'Burgers') as any,
        priceUGX: Number(item.price),
        prepTimeText: `${item.prep_time_minutes || 15} MIN PREP`,
        description: item.description,
        chefChoice: item.is_chef_choice,
        image: item.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        stockStatus: item.is_available ? 'available' : 'sold_out',
        pauseReason: item.is_available ? undefined : 'Paused by shift manager',
      }));
    }

    const rows = await sqliteGetMenuItems(tenantId);
    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      category: (item.category_name || 'Burgers') as any,
      priceUGX: Number(item.price),
      prepTimeText: `${item.prep_time_minutes || 15} MIN PREP`,
      description: item.description,
      chefChoice: item.is_chef_choice === 1,
      image: item.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      stockStatus: item.is_available === 1 ? 'available' : 'sold_out',
      pauseReason: item.is_available === 1 ? undefined : 'Paused by shift manager',
    }));
  },

  /**
   * Place guest order: writes order & items to SQLite or Supabase
   */
  async placeGuestOrder(params: {
    tenantId: TenantId;
    qrToken: string;
    items: GuestOrderItemInput[];
    specialInstructions?: string;
    orderType?: 'table' | 'counter';
  }): Promise<GuestOrderResult> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.rpc('create_guest_order', {
        p_qr_token: params.qrToken,
        p_items: params.items,
        p_special_instructions: params.specialInstructions || null,
        p_order_type: params.orderType || 'table',
      });

      if (error) {
        throw new Error(error.message);
      }
      return data as GuestOrderResult;
    }

    const result = await sqliteCreateGuestOrder({
      restaurantId: params.tenantId,
      qrToken: params.qrToken,
      items: params.items,
      specialInstructions: params.specialInstructions,
      orderType: params.orderType,
    });

    return {
      order_id: result.order_id,
      order_number: result.order_number,
      restaurant_id: params.tenantId,
      table_id: null,
      status: 'preparing',
      payment_status: 'pending',
      subtotal: result.subtotal,
      total: result.total,
      guest_access_token: result.guest_access_token,
    };
  },

  /**
   * Track guest order using guest access token
   */
  async trackGuestOrder(orderId: string, guestAccessToken: string): Promise<GuestOrderDetails> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.rpc('get_guest_order', {
        p_order_id: orderId,
        p_guest_access_token: guestAccessToken,
      });

      if (error) throw new Error(`Unauthorized or order not found: ${error.message}`);
      return data as GuestOrderDetails;
    }

    const ord = await sqliteGetGuestOrder(orderId, guestAccessToken);
    return {
      id: ord.id,
      order_number: ord.order_number,
      restaurant_name: ord.restaurant_name,
      restaurant_currency: ord.restaurant_currency,
      table_number: ord.table_number || 'Counter',
      table_location: `${ord.table_number || 'Counter'} (${ord.location_zone || 'Walk-Up'})`,
      status: ord.status as OrderStatus,
      payment_status: ord.payment_status,
      subtotal: Number(ord.subtotal),
      total: Number(ord.total),
      special_instructions: ord.special_instructions,
      created_at: ord.created_at,
      items: (ord.items || []).map((i: any) => ({
        id: i.id,
        name: i.item_name,
        unit_price: Number(i.unit_price),
        quantity: i.quantity,
        line_total: Number(i.line_total),
        special_instructions: i.special_instructions,
      })),
      payment_verified: ord.payment_verified,
    };
  },

  /**
   * Fetch active orders for staff dashboard from SQLite or Supabase
   */
  async getStaffOrders(tenantId: TenantId): Promise<Order[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          status,
          payment_status,
          subtotal,
          total,
          special_instructions,
          created_at,
          table:restaurant_tables(table_number, location_zone),
          items:order_items(item_name, unit_price, quantity, line_total, special_instructions),
          payments(method, verified_by, status)
        `)
        .eq('restaurant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Supabase error: ${error.message}`);

      return (data || []).map((o: any) => {
        const timePlaced = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const minutesAgo = Math.max(1, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000));
        const payment = o.payments?.[0];

        return {
          id: o.id,
          orderNumber: o.order_number,
          tableNumber: o.table?.table_number || 'Counter',
          tableLocation: o.table ? `${o.table.table_number} (${o.table.location_zone})` : 'Counter Walk-Up',
          timePlaced,
          timePlacedAgo: `${minutesAgo}m ago`,
          status: o.status as OrderStatus,
          paymentVerified: o.payment_status === 'paid',
          paymentMethod: payment?.method as PaymentMethod | undefined,
          verifiedBy: payment?.verified_by || undefined,
          orderType: o.order_type === 'counter' ? 'counter_walk_in' : 'table_qr',
          items: (o.items || []).map((it: any) => ({
            name: it.item_name,
            details: it.special_instructions || 'Standard prep',
            quantity: it.quantity,
            priceUGX: Number(it.line_total),
          })),
          specialInstructions: o.special_instructions || undefined,
          subtotalUGX: Number(o.subtotal),
          totalUGX: Number(o.total),
        };
      });
    }

    const rows = await sqliteGetStaffOrders(tenantId);
    return rows.map((o) => {
      const timePlaced = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const minutesAgo = Math.max(1, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000));

      return {
        id: o.id,
        orderNumber: o.order_number,
        tableNumber: o.table_number || 'Counter',
        tableLocation: `${o.table_number || 'Counter'} (${o.location_zone || 'Walk-Up'})`,
        timePlaced,
        timePlacedAgo: `${minutesAgo}m ago`,
        status: o.status as OrderStatus,
        paymentVerified: o.payment_status === 'paid',
        paymentMethod: o.payment_method as PaymentMethod | undefined,
        verifiedBy: o.verified_by,
        orderType: o.order_type === 'counter' ? 'counter_walk_in' : 'table_qr',
        items: (o.items || []).map((it: any) => ({
          name: it.item_name,
          details: it.special_instructions || 'Standard prep',
          quantity: it.quantity,
          priceUGX: Number(it.line_total),
        })),
        specialInstructions: o.special_instructions || undefined,
        subtotalUGX: Number(o.subtotal),
        totalUGX: Number(o.total),
      };
    });
  },

  /**
   * Verify staff payment: writes to SQLite payments table and updates order
   */
  async verifyPayment(params: {
    tenantId: TenantId;
    orderId: string;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
  }): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.rpc('verify_staff_payment', {
        p_order_id: params.orderId,
        p_method: params.method,
        p_amount: null,
        p_reference: params.reference || null,
        p_notes: params.notes || null,
      });

      if (error) throw new Error(`Payment verification failed: ${error.message}`);
      return;
    }

    await sqliteVerifyStaffPayment({
      restaurantId: params.tenantId,
      orderId: params.orderId,
      method: params.method,
      reference: params.reference,
      notes: params.notes,
    });
  },

  /**
   * Advance order status: enforces payment verification gate before preparing
   */
  async advanceOrderStatus(params: {
    tenantId: TenantId;
    orderId: string;
    newStatus: OrderStatus;
  }): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.rpc('advance_order_status', {
        p_order_id: params.orderId,
        p_new_status: params.newStatus,
      });

      if (error) throw new Error(error.message);
      return;
    }

    await sqliteAdvanceOrderStatus({
      restaurantId: params.tenantId,
      orderId: params.orderId,
      newStatus: params.newStatus,
    });
  },

  /**
   * Toggle menu item availability (86-ing) in SQLite or Supabase
   */
  async toggleMenuItemAvailability(tenantId: TenantId, menuItemId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { data: item, error: fetchErr } = await supabase
        .from('menu_items')
        .select('is_available')
        .eq('id', menuItemId)
        .eq('restaurant_id', tenantId)
        .single();

      if (fetchErr || !item) throw new Error('Menu item not found');

      const nextState = !item.is_available;
      const { error: updateErr } = await supabase
        .from('menu_items')
        .update({ is_available: nextState })
        .eq('id', menuItemId)
        .eq('restaurant_id', tenantId);

      if (updateErr) throw new Error(`Failed to update item: ${updateErr.message}`);
      return nextState;
    }

    return await sqliteToggleMenuItemAvailability(tenantId, menuItemId);
  },

  /**
   * Get active categories for restaurant
   */
  async getCategories(tenantId: TenantId): Promise<MenuCategory[]> {
    const rows = await sqliteGetCategories(tenantId);
    return rows.map((r) => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      name: r.name,
      displayOrder: r.display_order,
      isActive: r.is_active === 1,
    }));
  },

  /**
   * Create new category
   */
  async createCategory(tenantId: TenantId, name: string): Promise<MenuCategory> {
    const cat = await sqliteCreateCategory(tenantId, name);
    return {
      id: cat.id,
      restaurantId: cat.restaurant_id,
      name: cat.name,
      displayOrder: cat.display_order,
      isActive: true,
    };
  },

  /**
   * Update category
   */
  async updateCategory(tenantId: TenantId, categoryId: string, name: string): Promise<void> {
    await sqliteUpdateCategory(tenantId, categoryId, name);
  },

  /**
   * Delete category
   */
  async deleteCategory(tenantId: TenantId, categoryId: string): Promise<void> {
    await sqliteDeleteCategory(tenantId, categoryId);
  },

  /**
   * Create menu item
   */
  async createMenuItem(params: {
    tenantId: TenantId;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    prepTimeMinutes?: number;
    isChefChoice?: boolean;
  }): Promise<Dish> {
    const item = await sqliteCreateMenuItem({
      restaurantId: params.tenantId,
      categoryId: params.categoryId,
      name: params.name,
      description: params.description,
      price: params.price,
      imageUrl: params.imageUrl,
      prepTimeMinutes: params.prepTimeMinutes,
      isChefChoice: params.isChefChoice,
    });

    const categories = await sqliteGetCategories(params.tenantId);
    const catName = categories.find((c) => c.id === params.categoryId)?.name || 'Mains';

    return {
      id: item.id,
      restaurantId: params.tenantId,
      categoryId: params.categoryId,
      name: item.name,
      category: catName,
      priceUGX: item.price,
      prepTimeText: `${item.prepTimeMinutes || 15} MIN PREP`,
      description: item.description,
      chefChoice: item.isChefChoice,
      image: item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      stockStatus: 'available',
    };
  },

  /**
   * Update menu item
   */
  async updateMenuItem(params: {
    tenantId: TenantId;
    itemId: string;
    name: string;
    description: string;
    price: number;
    categoryId?: string;
    imageUrl?: string;
    prepTimeMinutes?: number;
    isChefChoice?: boolean;
    isAvailable?: boolean;
  }): Promise<void> {
    await sqliteUpdateMenuItem({
      restaurantId: params.tenantId,
      itemId: params.itemId,
      name: params.name,
      description: params.description,
      price: params.price,
      categoryId: params.categoryId,
      imageUrl: params.imageUrl,
      prepTimeMinutes: params.prepTimeMinutes,
      isChefChoice: params.isChefChoice,
      isAvailable: params.isAvailable,
    });
  },

  /**
   * Delete menu item
   */
  async deleteMenuItem(tenantId: TenantId, itemId: string): Promise<void> {
    await sqliteDeleteMenuItem(tenantId, itemId);
  },

  /**
   * Create restaurant table stand
   */
  async createTable(params: {
    tenantId: TenantId;
    tableNumber: string;
    locationZone: 'Terrace' | 'Indoor' | 'Walk-Up' | 'Barista';
  }): Promise<TableStand> {
    const table = await sqliteCreateTableStand({
      restaurantId: params.tenantId,
      tableNumber: params.tableNumber,
      locationZone: params.locationZone,
    });

    return {
      id: table.id,
      restaurantId: params.tenantId,
      label: table.table_number,
      locationZone: table.location_zone,
      path: `/dine-in?token=${table.qr_code_token}`,
      fullUrl: `https://frankfoods.ug/dine-in?token=${table.qr_code_token}`,
      qrCodeToken: table.qr_code_token,
      status: 'available',
      isActive: true,
    };
  },

  /**
   * Update restaurant table stand
   */
  async updateTable(params: {
    tenantId: TenantId;
    tableId: string;
    tableNumber: string;
    locationZone: 'Terrace' | 'Indoor' | 'Walk-Up' | 'Barista';
    isActive?: boolean;
  }): Promise<void> {
    await sqliteUpdateTableStand({
      restaurantId: params.tenantId,
      tableId: params.tableId,
      tableNumber: params.tableNumber,
      locationZone: params.locationZone,
      isActive: params.isActive,
    });
  },

  /**
   * Regenerate table QR token
   */
  async regenerateTableQr(tenantId: TenantId, tableId: string): Promise<string> {
    return await sqliteRegenerateQrToken(tenantId, tableId);
  },

  /**
   * Delete restaurant table stand
   */
  async deleteTable(tenantId: TenantId, tableId: string): Promise<void> {
    await sqliteDeleteTableStand(tenantId, tableId);
  },

  /**
   * Fetch staff profiles for a restaurant
   */
  async getStaffProfiles(tenantId: TenantId): Promise<StaffMember[]> {
    const rows = await sqliteGetStaffProfiles(tenantId);
    return rows.map((p) => {
      const initials = p.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      return {
        id: p.id,
        name: p.full_name,
        initials,
        role: p.role === 'manager' ? 'Floor Manager' : p.role === 'kitchen' ? 'Kitchen Chef' : 'Service Staff',
        roleType: p.role,
        email: p.email || undefined,
        restaurantId: p.restaurant_id,
        assignedTables: p.role === 'kitchen' ? 'All Kitchen Stations' : 'Floors & Terrace',
        station: p.role === 'kitchen' ? 'Hot Kitchen Line' : 'Floor Service',
        active: p.is_active === 1,
      };
    });
  },

  /**
   * Invite / create staff member
   */
  async createStaffProfile(params: {
    tenantId: TenantId;
    fullName: string;
    role: string;
    email: string;
  }): Promise<StaffMember> {
    const p = await sqliteCreateStaffProfile({
      restaurantId: params.tenantId,
      fullName: params.fullName,
      role: params.role,
      email: params.email,
    });

    const initials = p.fullName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return {
      id: p.id,
      name: p.fullName,
      initials,
      role: p.role === 'manager' ? 'Floor Manager' : p.role === 'kitchen' ? 'Kitchen Chef' : 'Service Staff',
      roleType: p.role,
      email: p.email,
      restaurantId: p.restaurantId,
      assignedTables: p.role === 'kitchen' ? 'All Kitchen Stations' : 'Floors & Terrace',
      station: p.role === 'kitchen' ? 'Hot Kitchen Line' : 'Floor Service',
      active: true,
    };
  },

  /**
   * Update order status with optional cancellation or staff audit
   */
  async updateOrderStatus(params: {
    tenantId: TenantId;
    orderId: string;
    newStatus: OrderStatus;
    cancellationReason?: string;
    verifiedBy?: string;
  }): Promise<void> {
    await sqliteUpdateOrderStatus({
      restaurantId: params.tenantId,
      orderId: params.orderId,
      newStatus: params.newStatus,
      cancellationReason: params.cancellationReason,
      verifiedBy: params.verifiedBy,
    });
  },

  /**
   * Cancel order with mandatory reason
   */
  async cancelOrder(params: {
    tenantId: TenantId;
    orderId: string;
    cancellationReason: string;
    cancelledBy: string;
  }): Promise<void> {
    await sqliteCancelOrder({
      restaurantId: params.tenantId,
      orderId: params.orderId,
      cancellationReason: params.cancellationReason,
      cancelledBy: params.cancelledBy,
    });
  },

  /**
   * Fetch live shift stats from real database
   */
  async getShiftPerformance(tenantId: TenantId): Promise<ShiftPerformance> {
    return await sqliteGetShiftStats(tenantId);
  },
};
