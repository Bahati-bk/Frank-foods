/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScreenId =
  | 'menu-feed'
  | 'customer-cart'
  | 'customer-tracker'
  | 'kitchen'
  | 'staff-dashboard'
  | 'manager-login'
  | 'manager-dashboard';

export interface RouteMatch {
  screen: ScreenId;
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

/**
 * Maps URL path to internal ScreenId
 */
export function pathToScreen(pathname: string): { screen: ScreenId; params: Record<string, string> } {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/' || clean === '/menu') {
    return { screen: 'menu-feed', params: {} };
  }
  if (clean === '/cart') {
    return { screen: 'customer-cart', params: {} };
  }
  if (clean.startsWith('/orders/') || clean === '/orders' || clean === '/tracker') {
    const parts = clean.split('/');
    const ticket = parts[2] || '';
    return { screen: 'customer-tracker', params: { ticket } };
  }
  if (clean === '/kitchen' || clean === '/kds') {
    return { screen: 'kitchen', params: {} };
  }
  if (clean === '/staff') {
    return { screen: 'staff-dashboard', params: {} };
  }
  if (clean === '/manager' || clean === '/admin') {
    return { screen: 'manager-dashboard', params: {} };
  }
  if (clean === '/login' || clean === '/staff-login') {
    return { screen: 'manager-login', params: {} };
  }

  // Fallback default
  return { screen: 'menu-feed', params: {} };
}

/**
 * Maps ScreenId to clean URL path
 */
export function screenToPath(screen: ScreenId, params?: Record<string, string>): string {
  switch (screen) {
    case 'menu-feed':
      return '/menu';
    case 'customer-cart':
      return '/cart';
    case 'customer-tracker':
      return params?.ticket ? `/orders/${encodeURIComponent(params.ticket)}` : '/orders';
    case 'kitchen':
      return '/kitchen';
    case 'staff-dashboard':
      return '/staff';
    case 'manager-dashboard':
      return '/manager';
    case 'manager-login':
      return '/login';
    default:
      return '/menu';
  }
}

/**
 * Push URL to browser history without reloading page
 */
export function pushAppRoute(screen: ScreenId, params?: Record<string, string>, preserveSearch = true): void {
  try {
    const basePath = screenToPath(screen, params);
    const search = preserveSearch ? window.location.search : '';
    const fullUrl = `${basePath}${search}`;
    if (window.location.pathname + window.location.search !== fullUrl) {
      window.history.pushState({ screen, params }, '', fullUrl);
    }
  } catch (err) {
    console.warn('Could not push history state:', err);
  }
}
