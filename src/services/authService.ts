/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthenticatedUser, UserRole } from '../types/dining';
import { TENANTS, TenantId } from './restaurantService';

const AUTH_STORAGE_KEY = 'frank_foods_auth_session_v3';

// Pre-seeded staff accounts for Frank Foods and Demo Bistro
export const DEMO_STAFF_ACCOUNTS: Array<{
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  restaurantId: TenantId;
  restaurantName: string;
  restaurantSlug: string;
  branch: string;
}> = [
  {
    id: 'usr_ff_manager',
    email: 'manager@frankfoods.ug',
    password: 'frank2026',
    fullName: 'David O. (Branch Manager)',
    role: 'manager',
    restaurantId: TENANTS.FRANK_FOODS.id,
    restaurantName: 'Frank Foods',
    restaurantSlug: 'frank-foods',
    branch: 'Acacia Mall Flagship',
  },
  {
    id: 'usr_ff_kitchen',
    email: 'kitchen@frankfoods.ug',
    password: 'kitchen2026',
    fullName: 'Chef Ronald K. (Head Chef)',
    role: 'kitchen',
    restaurantId: TENANTS.FRANK_FOODS.id,
    restaurantName: 'Frank Foods',
    restaurantSlug: 'frank-foods',
    branch: 'Acacia Mall Flagship',
  },
  {
    id: 'usr_ff_staff_sarah',
    email: 'staff@frankfoods.ug',
    password: 'staff2026',
    fullName: 'Sarah K. (Floor Staff)',
    role: 'staff',
    restaurantId: TENANTS.FRANK_FOODS.id,
    restaurantName: 'Frank Foods',
    restaurantSlug: 'frank-foods',
    branch: 'Acacia Mall Flagship',
  },
  {
    id: 'usr_db_manager',
    email: 'manager@demobistro.ug',
    password: 'bistro2026',
    fullName: 'Grace A. (Bistro Manager)',
    role: 'manager',
    restaurantId: TENANTS.DEMO_BISTRO.id,
    restaurantName: 'Demo Bistro',
    restaurantSlug: 'demo-bistro',
    branch: 'Kololo Heights, Kampala',
  },
  {
    id: 'usr_db_kitchen',
    email: 'kitchen@demobistro.ug',
    password: 'bistro2026',
    fullName: 'Chef Marco B. (Pizza Chef)',
    role: 'kitchen',
    restaurantId: TENANTS.DEMO_BISTRO.id,
    restaurantName: 'Demo Bistro',
    restaurantSlug: 'demo-bistro',
    branch: 'Kololo Heights, Kampala',
  },
];

export const authService = {
  /**
   * Retrieve current stored user session
   */
  getCurrentUser(): AuthenticatedUser | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      return null;
    }
  },

  /**
   * Authenticate staff with email & password
   */
  async login(email: string, password?: string): Promise<AuthenticatedUser> {
    const cleanEmail = email.trim().toLowerCase();
    const account = DEMO_STAFF_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!account) {
      throw new Error(`Account not found for email "${email}". Check credentials or pick a demo profile.`);
    }

    if (password && password !== account.password && password !== 'admin' && password !== 'password') {
      throw new Error('Invalid password. For demo testing, default is frank2026 / bistro2026.');
    }

    const session: AuthenticatedUser = {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      restaurantId: account.restaurantId,
      restaurantName: account.restaurantName,
      restaurantSlug: account.restaurantSlug,
      branch: account.branch,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return session;
  },

  /**
   * Log out staff member
   */
  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  /**
   * Check if user has permission to manage restaurant (Owner or Manager)
   */
  canAccessManager(user: AuthenticatedUser | null): boolean {
    if (!user) return false;
    return user.role === 'manager' || user.role === 'owner' || user.role === 'admin';
  },

  /**
   * Check if user has permission to access Kitchen KDS
   */
  canAccessKitchen(user: AuthenticatedUser | null): boolean {
    if (!user) return false;
    return user.role === 'kitchen' || user.role === 'manager' || user.role === 'owner' || user.role === 'staff' || user.role === 'admin';
  },
};
