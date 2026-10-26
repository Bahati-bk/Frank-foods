/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  INITIAL_DISHES,
  INITIAL_ORDERS,
  INITIAL_TABLES,
  INITIAL_STAFF,
  INITIAL_SHIFT_PERFORMANCE,
} from './data/initialData';
import {
  Dish,
  Order,
  CartItem,
  TableStand,
  StaffMember,
  ShiftPerformance,
  OrderStatus,
  PaymentMethod,
  AuthenticatedUser,
  MenuCategory,
} from './types/dining';
import { DineInMenuFeedScreen } from './components/screens/DineInMenuFeedScreen';
import { DineInCustomerCartScreen } from './components/screens/DineInCustomerCartScreen';
import { CustomerOrderTrackerScreen } from './components/screens/CustomerOrderTrackerScreen';
import { StaffOrderDashboardScreen } from './components/screens/StaffOrderDashboardScreen';
import { KitchenKdsScreen } from './components/screens/KitchenKdsScreen';
import { ManagerLoginScreen } from './components/screens/ManagerLoginScreen';
import { ManagerAdminDashboardScreen } from './components/screens/ManagerAdminDashboardScreen';
import { DatabaseManagerModal } from './components/common/DatabaseManagerModal';
import { restaurantService, TENANTS, TenantId } from './services/restaurantService';
import { authService } from './services/authService';
import { pathToScreen, pushAppRoute, ScreenId } from './utils/router';

const CART_STORAGE_KEY = 'frank_foods_cart_v3';
const ACTIVE_ORDER_STORAGE_KEY = 'frank_foods_active_order_v3';

export default function App() {
  // Screen and routing state initialized from URL
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    const route = pathToScreen(window.location.pathname);
    return route.screen;
  });

  const [activeTenantId, setActiveTenantId] = useState<TenantId>(
    () => (authService.getCurrentUser()?.restaurantId as TenantId | undefined) || TENANTS.FRANK_FOODS.id
  );
  const activeTenantIdRef = useRef(activeTenantId);
  activeTenantIdRef.current = activeTenantId;
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [tables, setTables] = useState<TableStand[]>(INITIAL_TABLES);
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [shiftStats, setShiftStats] = useState<ShiftPerformance>(INITIAL_SHIFT_PERFORMANCE);
  const [selectedTable, setSelectedTable] = useState<string>('Table 07');
  const [currentQrToken, setCurrentQrToken] = useState<string>('qr_ff_table_07_live');
  const [qrTokenError, setQrTokenError] = useState<string | null>(null);
  const [managerBranch, setManagerBranch] = useState<string>('Acacia Mall Flagship');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);

  // Authenticated staff session
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => authService.getCurrentUser());

  // Cart & Customizer State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('table_token') || params.has('token')) {
        localStorage.removeItem(CART_STORAGE_KEY);
        return [];
      }

      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customizingDish, setCustomizingDish] = useState<Dish | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Customer active submitted order (persisted for tracking across reloads)
  const [activeCustomerOrder, setActiveCustomerOrder] = useState<Order | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active tenant metadata
  const currentTenant = activeTenantId === TENANTS.FRANK_FOODS.id ? TENANTS.FRANK_FOODS : TENANTS.DEMO_BISTRO;

  // Browser navigation popstate listener (back/forward button support)
  useEffect(() => {
    const handlePopState = () => {
      const route = pathToScreen(window.location.pathname);
      setCurrentScreen(route.screen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Safe navigation helper that updates both screen state and URL bar
  const handleNavigateScreen = (screenId: ScreenId, params?: Record<string, string>) => {
    setCurrentScreen(screenId);
    pushAppRoute(screenId, params);
  };

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.warn('Failed to persist cart:', err);
    }
  }, [cartItems]);

  // Persist active order to localStorage
  useEffect(() => {
    try {
      if (activeCustomerOrder) {
        localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(activeCustomerOrder));
      }
    } catch (err) {
      console.warn('Failed to persist active order:', err);
    }
  }, [activeCustomerOrder]);

  // URL QR Parameter Parsing & Table Identification on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableToken = params.get('table_token') || params.get('token');
    const restaurantSlug = params.get('restaurant');

    if (tableToken) {
      setCartItems([]);
      setCustomizingDish(null);
      setDishes([]);
      setCategories([]);
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear saved cart after scanning a table QR code:', err);
      }
    }

    if (restaurantSlug === 'demo-bistro') {
      setActiveTenantId(TENANTS.DEMO_BISTRO.id);
    } else if (restaurantSlug === 'frank-foods') {
      setActiveTenantId(TENANTS.FRANK_FOODS.id);
    }

    if (tableToken) {
      restaurantService
        .resolveTableByQrToken(tableToken)
        .then((res) => {
          setActiveTenantId(res.restaurant_id as TenantId);
          setSelectedTable(res.table_number);
          setCurrentQrToken(tableToken);
          setQrTokenError(null);
        })
        .catch((err) => {
          console.warn('QR code resolution warning:', err.message);
          setQrTokenError(`Scanned QR Token "${tableToken}" is invalid or inactive. Please select your table.`);
        });
    }
  }, []);

  // Load tenant-isolated data whenever tenant changes
  const loadTenantData = useCallback(async () => {
    try {
      const [tenantDishes, tenantTables, tenantOrders, tenantCategories, tenantStaff, tenantStats] = await Promise.all([
        restaurantService.getMenuDishes(activeTenantId),
        restaurantService.getTables(activeTenantId),
        restaurantService.getStaffOrders(activeTenantId),
        restaurantService.getCategories(activeTenantId),
        restaurantService.getStaffProfiles(activeTenantId),
        restaurantService.getShiftPerformance(activeTenantId),
      ]);

      if (activeTenantIdRef.current !== activeTenantId) return;

      if (tenantDishes.length > 0) setDishes(tenantDishes);
      if (tenantCategories.length > 0) setCategories(tenantCategories);
      if (tenantStaff.length > 0) setStaff(tenantStaff);
      if (tenantStats) setShiftStats(tenantStats);

      if (tenantTables.length > 0) {
        setTables(tenantTables);
        const selectedTableData = tenantTables.find((table) => table.label === selectedTable) || tenantTables[0];
        setSelectedTable(selectedTableData.label);
        setCurrentQrToken(
          selectedTableData.qrCodeToken ||
            new URL(selectedTableData.path, window.location.origin).searchParams.get('token') ||
            ''
        );
      }
      if (tenantOrders.length > 0) setOrders(tenantOrders);
      setManagerBranch(currentTenant.branch);
    } catch (err: any) {
      console.error('Failed to load tenant data:', err);
      if (activeTenantIdRef.current === activeTenantId) {
        setErrorMessage(`Failed to refresh restaurant data: ${err.message || 'Please check your connection and retry.'}`);
      }
    }
  }, [activeTenantId, selectedTable, currentTenant.branch]);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  const hasStaffRouteAccess =
    (currentScreen !== 'kitchen' ||
      (authService.canAccessKitchen(currentUser) && currentUser?.restaurantId === activeTenantId)) &&
    (currentScreen !== 'manager-dashboard' ||
      (authService.canAccessManager(currentUser) && currentUser?.restaurantId === activeTenantId)) &&
    (currentScreen !== 'staff-dashboard' ||
      (Boolean(currentUser) && currentUser?.restaurantId === activeTenantId));

  useEffect(() => {
    if (!hasStaffRouteAccess) {
      setCurrentScreen('manager-login');
      pushAppRoute('manager-login', undefined, false);
    }
  }, [currentScreen, hasStaffRouteAccess]);

  // Periodic polling for shared order updates (every 3 seconds for near real-time status reflection)
  useEffect(() => {
    const pollOrders = () => {
      restaurantService
        .getStaffOrders(activeTenantId)
        .then((latestOrders) => {
          if (latestOrders && latestOrders.length > 0) {
            setOrders(latestOrders);

            // Sync activeCustomerOrder with latest state from database
            setActiveCustomerOrder((prev) => {
              if (!prev) return null;
              const match = latestOrders.find((o) => o.id === prev.id || o.orderNumber === prev.orderNumber);
              if (match) {
                const updated: Order = {
                  ...prev,
                  ...match,
                  items: match.items && match.items.length > 0 ? match.items : prev.items,
                };
                if (
                  updated.status !== prev.status ||
                  updated.paymentVerified !== prev.paymentVerified ||
                  updated.cancellationReason !== prev.cancellationReason
                ) {
                  try {
                    localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(updated));
                  } catch {}
                  return updated;
                }
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    };

    pollOrders();
    const pollInterval = setInterval(pollOrders, 3000);
    return () => clearInterval(pollInterval);
  }, [activeTenantId]);

  // Primary order for tracking view (always reflects latest live status from orders or activeCustomerOrder)
  const primaryOrder: Order = useMemo(() => {
    // 1. Check if URL specifies a ticket (/orders/:ticket or ?ticket=...)
    const urlParams = new URLSearchParams(window.location.search);
    const queryTicket = urlParams.get('ticket');
    const pathMatch = window.location.pathname.match(/\/orders\/(.+)/);
    const pathTicket = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
    const targetTicket = pathTicket || queryTicket;

    if (targetTicket) {
      const match = orders.find(
        (o) =>
          o.orderNumber.toLowerCase() === targetTicket.toLowerCase() ||
          o.orderNumber.replace('#', '').toLowerCase() === targetTicket.replace('#', '').toLowerCase()
      );
      if (match) return match;
    }

    // 2. If customer has an active order, find the live match in orders
    if (activeCustomerOrder) {
      const liveMatch = orders.find(
        (o) => o.id === activeCustomerOrder.id || o.orderNumber === activeCustomerOrder.orderNumber
      );
      if (liveMatch) {
        return {
          ...activeCustomerOrder,
          ...liveMatch,
          items: liveMatch.items && liveMatch.items.length > 0 ? liveMatch.items : activeCustomerOrder.items,
        };
      }
      return activeCustomerOrder;
    }

    // 3. Fallback to order #FF-0842 or first order in system
    return (
      orders.find((o) => o.orderNumber === '#FF-0842') ||
      orders[0] || {
        id: 'placeholder-order',
        orderNumber: '#FF-0001',
        tableNumber: selectedTable,
        tableLocation: `${selectedTable} (Terrace)`,
        timePlaced: '1:42 PM',
        timePlacedAgo: '1m ago',
        status: 'preparing' as OrderStatus,
        paymentVerified: false,
        orderType: 'table_qr' as const,
        items: [],
        subtotalUGX: 0,
        totalUGX: 0,
      }
    );
  }, [activeCustomerOrder, orders, selectedTable]);

  // Cart calculations
  const cartItemsCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const cartTotalUGX = cartItems.reduce((acc, it) => acc + it.lineTotal, 0);

  // Cart actions
  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) =>
          it.dishId === newItem.dishId &&
          it.cookPreference === newItem.cookPreference &&
          JSON.stringify(it.selectedExtras) === JSON.stringify(newItem.selectedExtras)
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        const match = next[existingIdx];
        const newQty = match.quantity + newItem.quantity;
        next[existingIdx] = {
          ...match,
          quantity: newQty,
          lineTotal: match.priceUGX * newQty,
        };
        return next;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === cartItemId) {
            const newQty = it.quantity + delta;
            return {
              ...it,
              quantity: newQty,
              lineTotal: it.priceUGX * newQty,
            };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}
  };

  const handleQuickAdd = (dish: Dish) => {
    if (dish.cookPreferences && dish.cookPreferences.length > 0) {
      setCustomizingDish(dish);
      handleNavigateScreen('customer-cart');
      return;
    }

    handleAddToCart({
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dishId: dish.id,
      name: dish.name,
      priceUGX: dish.priceUGX,
      quantity: 1,
      selectedExtras: [],
      lineTotal: dish.priceUGX,
      image: dish.image,
    });
  };

  const handleOpenCustomizer = (dish: Dish) => {
    setCustomizingDish(dish);
    handleNavigateScreen('customer-cart');
  };

  // Submit Order: Server/database-authoritative price calculation & unique ticket generation
  const handleSubmitOrder = async (specialNotes: string) => {
    if (cartItems.length === 0) {
      throw new Error('Your cart is empty.');
    }
    const hasInvalidMenuItemId = cartItems.some((item) =>
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.dishId)
    );
    if (hasInvalidMenuItemId) {
      throw new Error(
        'Your cart contains items from an older menu. Clear the cart, refresh the menu, and add the items again.'
      );
    }

    setIsSubmittingOrder(true);
    setErrorMessage(null);

    try {
      const tableMatch = tables.find((t) => t.label === selectedTable);
      const tableToken =
        tableMatch?.qrCodeToken ||
        (tableMatch?.path
          ? new URL(tableMatch.path, window.location.origin).searchParams.get('token') || undefined
          : undefined);
      const tokenToUse = tableToken || currentQrToken;

      if (!tokenToUse) {
        throw new Error('Could not find an active QR code for this table. Please select your table again.');
      }

      const itemsPayload = cartItems.map((it) => {
        const extraNames = it.selectedExtras.map((e) => e.name).join(', ');
        const notes = [it.cookPreference, extraNames, it.specialInstructions].filter(Boolean).join(' • ');
        return {
          menu_item_id: it.dishId,
          quantity: it.quantity,
          special_instructions: notes || undefined,
        };
      });

      const result = await restaurantService.placeGuestOrder({
        tenantId: activeTenantId,
        qrToken: tokenToUse,
        items: itemsPayload,
        specialInstructions: specialNotes,
        orderType: 'table',
      });

      const now = new Date();
      const timePlaced = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newOrder: Order = {
        id: result.order_id,
        orderNumber: result.order_number,
        tableNumber: selectedTable,
        tableLocation: `${selectedTable} (Terrace)`,
        timePlaced: timePlaced,
        timePlacedAgo: 'Just now',
        status: result.status,
        paymentVerified: false,
        orderType: 'table_qr',
        subtotalUGX: result.subtotal,
        totalUGX: result.total,
        specialInstructions: specialNotes || undefined,
        guestAccessToken: result.guest_access_token,
        restaurantName: currentTenant.name,
        createdAt: now.toISOString(),
        items: cartItems.map((it) => ({
          name: `${it.quantity}x ${it.name}`,
          details: [it.cookPreference, it.selectedExtras.map((e) => e.name).join(', '), it.specialInstructions]
            .filter(Boolean)
            .join(' • ') || 'Standard preparation',
          quantity: it.quantity,
          priceUGX: it.lineTotal,
        })),
      };

      setOrders((prev) => [newOrder, ...prev]);
      setActiveCustomerOrder(newOrder);

      setShiftStats((prev) => ({
        ...prev,
        ordersCompletedCount: prev.ordersCompletedCount + 1,
        qrDineInCount: prev.qrDineInCount + 1,
        estimatedSalesUGX: prev.estimatedSalesUGX + result.total,
      }));

      handleClearCart();
      handleNavigateScreen('customer-tracker', { ticket: result.order_number });
    } catch (err: any) {
      console.error('Order submission error:', err);
      throw err;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Handler: Staff confirms in-person payment
  const handleConfirmPayment = async (orderId: string, method: PaymentMethod) => {
    try {
      setErrorMessage(null);
      await restaurantService.verifyPayment({
        tenantId: activeTenantId,
        orderId,
        method,
      });

      const verifier = currentUser ? currentUser.fullName : 'Sarah K. (Floor Staff)';

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === orderId) {
            return {
              ...ord,
              paymentVerified: true,
              paymentMethod: method,
              verifiedBy: verifier,
            };
          }
          return ord;
        })
      );

      // Immediately sync customer tracker order if matching
      setActiveCustomerOrder((prev) => {
        if (!prev) return null;
        if (prev.id === orderId) {
          const updated: Order = {
            ...prev,
            paymentVerified: true,
            paymentMethod: method,
            verifiedBy: verifier,
          };
          try {
            localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        }
        return prev;
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed');
    }
  };

  // Handler: Staff / Kitchen advances order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus, cancellationReason?: string) => {
    try {
      setErrorMessage(null);
      await restaurantService.updateOrderStatus({
        tenantId: activeTenantId,
        orderId,
        newStatus,
        cancellationReason,
        verifiedBy: currentUser ? currentUser.fullName : undefined,
      });

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === orderId) {
            return {
              ...ord,
              status: newStatus,
              cancellationReason: cancellationReason || ord.cancellationReason,
            };
          }
          return ord;
        })
      );

      // Immediately sync customer tracker order if matching
      setActiveCustomerOrder((prev) => {
        if (!prev) return null;
        if (prev.id === orderId) {
          const updated: Order = {
            ...prev,
            status: newStatus,
            cancellationReason: cancellationReason || prev.cancellationReason,
          };
          try {
            localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        }
        return prev;
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Status update failed');
    }
  };

  // Handler: Customer alerts server
  const handleCallServer = async (reason?: string, requestedPaymentMethod?: PaymentMethod) => {
    try {
      await restaurantService.setServerAlert(primaryOrder.id, true);
    } catch (err) {
      console.warn('Could not sync server alert to db:', err);
    }
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === primaryOrder.id) {
          return {
            ...ord,
            serverAlertActive: true,
            serverAlertReason: reason,
            paymentRequestedMethod: requestedPaymentMethod || ord.paymentRequestedMethod,
          };
        }
        return ord;
      })
    );
    if (activeCustomerOrder && activeCustomerOrder.id === primaryOrder.id) {
      setActiveCustomerOrder((prev) =>
        prev
          ? {
              ...prev,
              serverAlertActive: true,
              serverAlertReason: reason,
              paymentRequestedMethod: requestedPaymentMethod || prev.paymentRequestedMethod,
            }
          : prev
      );
    }
  };

  // Handler: Staff clears server alert
  const handleClearServerAlert = async (orderId: string) => {
    try {
      await restaurantService.setServerAlert(orderId, false);
    } catch (err) {
      console.warn('Could not clear server alert in db:', err);
    }
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, serverAlertActive: false } : ord))
    );
    if (activeCustomerOrder && activeCustomerOrder.id === orderId) {
      setActiveCustomerOrder((prev) => (prev ? { ...prev, serverAlertActive: false } : prev));
    }
  };

  // Manager: Add dish
  const handleAddDish = async (newDish: Dish) => {
    try {
      const firstCat = categories[0]?.id || '11111111-c000-0000-0000-000000000001';
      const created = await restaurantService.createMenuItem({
        tenantId: activeTenantId,
        categoryId: newDish.categoryId || firstCat,
        name: newDish.name,
        description: newDish.description,
        price: newDish.priceUGX,
        imageUrl: newDish.image,
      });
      setDishes((prev) => [created, ...prev]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create dish');
    }
  };

  // Manager: Update dish
  const handleUpdateDish = async (updatedDish: Dish) => {
    try {
      await restaurantService.updateMenuItem({
        tenantId: activeTenantId,
        itemId: updatedDish.id,
        name: updatedDish.name,
        description: updatedDish.description,
        price: updatedDish.priceUGX,
      });
      setDishes((prev) => prev.map((d) => (d.id === updatedDish.id ? updatedDish : d)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update dish');
    }
  };

  // Manager: Delete dish
  const handleDeleteDish = async (dishId: string) => {
    try {
      await restaurantService.deleteMenuItem(activeTenantId, dishId);
      setDishes((prev) => prev.filter((d) => d.id !== dishId));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete dish');
    }
  };

  // Manager: Toggle stock availability (86-ing)
  const handleToggleDishStock = async (dishId: string) => {
    try {
      await restaurantService.toggleMenuItemAvailability(activeTenantId, dishId);
      setDishes((prev) =>
        prev.map((d) => {
          if (d.id === dishId) {
            const newStatus = d.stockStatus === 'available' ? 'sold_out' : 'available';
            return {
              ...d,
              stockStatus: newStatus,
              pauseReason: newStatus === 'sold_out' ? 'Temporarily paused by shift manager' : undefined,
            };
          }
          return d;
        })
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle dish stock');
    }
  };

  // Manager: Add Category
  const handleAddCategory = async (name: string) => {
    try {
      const created = await restaurantService.createCategory(activeTenantId, name);
      setCategories((prev) => [...prev, created]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add category');
    }
  };

  // Manager: Add Table
  const handleAddTable = async (tableNumber: string, locationZone: TableStand['locationZone']) => {
    try {
      const created = await restaurantService.createTable({
        tenantId: activeTenantId,
        tableNumber,
        locationZone,
      });
      setTables((prev) => [...prev, created]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add table');
    }
  };

  // Manager: Regenerate Table QR Token
  const handleRegenerateTableQr = async (tableId: string) => {
    try {
      const newToken = await restaurantService.regenerateTableQr(activeTenantId, tableId);
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === tableId) {
            return {
              ...t,
              qrCodeToken: newToken,
              path: `/dine-in?token=${newToken}`,
              fullUrl: `https://frankfoods.ug/dine-in?token=${newToken}`,
            };
          }
          return t;
        })
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to regenerate QR token');
    }
  };

  // Manager: Add Staff Profile
  const handleAddStaff = async (fullName: string, role: string, email: string) => {
    try {
      const created = await restaurantService.createStaffProfile({
        tenantId: activeTenantId,
        fullName,
        role,
        email,
      });
      setStaff((prev) => [...prev, created]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add staff member');
    }
  };

  // Manager / Kitchen: Cancel order with audit
  const handleCancelOrder = async (orderId: string, reason: string) => {
    try {
      await restaurantService.cancelOrder({
        tenantId: activeTenantId,
        orderId,
        cancellationReason: reason,
        cancelledBy: currentUser ? currentUser.fullName : 'Shift Manager',
      });
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'cancelled', cancellationReason: reason } : ord))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel order');
    }
  };

  // Open table dine-in simulation
  const handleOpenTableDineIn = (tableLabel: string) => {
    setSelectedTable(tableLabel);
    const match = tables.find((t) => t.label === tableLabel);
    if (match) {
      setCurrentQrToken(match.qrCodeToken || match.path.split('token=')[1] || 'qr_ff_table_01_live');
    }
    handleNavigateScreen('menu-feed');
  };

  // Staff Login Success
  const handleLoginSuccess = (user: AuthenticatedUser) => {
    setCurrentUser(user);
    if (user.restaurantId) {
      setActiveTenantId(user.restaurantId as TenantId);
    }
    if (user.role === 'kitchen') {
      handleNavigateScreen('kitchen');
    } else if (user.role === 'staff') {
      handleNavigateScreen('staff-dashboard');
    } else {
      handleNavigateScreen('manager-dashboard');
    }
  };

  // Staff Sign Out
  const handleSignOut = () => {
    authService.logout();
    setCurrentUser(null);
    handleNavigateScreen('manager-login');
  };

  const availableTableLabels = tables.map((t) => t.label);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans">
      {/* Global Toast / Error Alert */}
      {errorMessage && (
        <div className="bg-red-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-auto underline text-white/80 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Render Active Screen Component */}
      <main className="flex-1 w-full">
        {import.meta.env.DEV && currentScreen === 'manager-dashboard' && hasStaffRouteAccess && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 flex justify-end print:hidden">
            <button
              onClick={() => setIsDbModalOpen(true)}
              title="Open development database tools"
              className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#F97316]">database</span>
              <span>Database &amp; Tables</span>
            </button>
          </div>
        )}

        {(!hasStaffRouteAccess || currentScreen === 'manager-login') && (
          <ManagerLoginScreen
            onLoginSuccess={handleLoginSuccess}
            onSelectScreen={(screen) => handleNavigateScreen(screen as ScreenId)}
          />
        )}

        {hasStaffRouteAccess && currentScreen === 'menu-feed' && (
          <DineInMenuFeedScreen
            dishes={dishes}
            tableNumber={selectedTable}
            onSelectTable={(tbl) => {
              setSelectedTable(tbl);
              const match = tables.find((t) => t.label === tbl);
              if (match) setCurrentQrToken(match.qrCodeToken || match.path.split('token=')[1] || 'qr_ff_table_01_live');
            }}
            onOpenCustomizer={handleOpenCustomizer}
            onQuickAdd={handleQuickAdd}
            cartItemsCount={cartItemsCount}
            cartTotalUGX={cartTotalUGX}
            onViewCart={() => {
              setCustomizingDish(null);
              handleNavigateScreen('customer-cart');
            }}
            availableTables={availableTableLabels}
            restaurantName={currentTenant.name}
            branchLocation={currentTenant.branch}
            qrToken={currentQrToken}
            qrTokenError={qrTokenError}
          />
        )}

        {hasStaffRouteAccess && currentScreen === 'customer-cart' && (
          <DineInCustomerCartScreen
            dishes={dishes}
            cartItems={cartItems}
            customizingDish={customizingDish}
            onCloseCustomizer={() => setCustomizingDish(null)}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onSubmitOrder={handleSubmitOrder}
            onSelectScreen={(screen) => handleNavigateScreen(screen as ScreenId)}
            tableNumber={selectedTable}
            tableLocation={`${selectedTable} (Terrace)`}
            restaurantName={currentTenant.name}
            isSubmitting={isSubmittingOrder}
          />
        )}

        {hasStaffRouteAccess && currentScreen === 'customer-tracker' && (
          <CustomerOrderTrackerScreen
            order={primaryOrder}
            onCallServer={handleCallServer}
            onSelectScreen={(screen) => handleNavigateScreen(screen as ScreenId)}
          />
        )}

        {hasStaffRouteAccess && currentScreen === 'kitchen' && (
          <KitchenKdsScreen
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onRefreshOrders={loadTenantData}
            onSelectScreen={authService.canAccessManager(currentUser) ? (screen) => handleNavigateScreen(screen as ScreenId) : undefined}
            onSignOut={handleSignOut}
            restaurantName={currentTenant.name}
            branchName={currentTenant.branch}
            staffName={currentUser ? currentUser.fullName : 'Head Chef Ronald'}
          />
        )}

        {hasStaffRouteAccess && currentScreen === 'staff-dashboard' && (
          <StaffOrderDashboardScreen
            orders={orders}
            onConfirmPayment={handleConfirmPayment}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onClearServerAlert={handleClearServerAlert}
            onSelectScreen={(screen) => handleNavigateScreen(screen as ScreenId)}
          />
        )}

        {hasStaffRouteAccess && currentScreen === 'manager-dashboard' && (
          <ManagerAdminDashboardScreen
            dishes={dishes}
            tables={tables}
            staff={staff}
            shiftStats={shiftStats}
            categories={categories}
            orders={orders}
            onUpdateDish={handleUpdateDish}
            onAddDish={handleAddDish}
            onDeleteDish={handleDeleteDish}
            onToggleDishStock={handleToggleDishStock}
            onAddCategory={handleAddCategory}
            onAddTable={handleAddTable}
            onRegenerateTableQr={handleRegenerateTableQr}
            onAddStaff={handleAddStaff}
            onCancelOrder={handleCancelOrder}
            onOpenTableDineIn={handleOpenTableDineIn}
            onSignOut={handleSignOut}
            onSelectScreen={(screen) => handleNavigateScreen(screen as ScreenId)}
            branchName={managerBranch}
            restaurantName={currentTenant.name}
          />
        )}
      </main>

      {/* Database & Tables Manager Modal (SQLite & PostgreSQL) */}
      {import.meta.env.DEV && (
        <DatabaseManagerModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
          activeTenantId={activeTenantId}
        />
      )}
    </div>
  );
}
