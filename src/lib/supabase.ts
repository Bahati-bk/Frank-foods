/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (name: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name] !== undefined) {
      return import.meta.env[name];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
      return process.env[name];
    }
  } catch {}
  return undefined;
};

// Environment variables for Supabase project
const rawSupabaseUrl = getEnvVar('VITE_SUPABASE_URL');
export const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Auto-correct common typos in Supabase project hostname (e.g. xbatvm... -> xbaltvm...)
export const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace('xbatvmjdrynrtugapul', 'xbaltvmjdrynrtugapul')
  : undefined;

/**
 * Check if shared API mode is enabled.
 * Handles "true", "True", "1", or boolean true across browser Vite and Node environments.
 */
export const isSharedApiEnabled = (): boolean => {
  const flag = getEnvVar('VITE_SHARED_API_ENABLED');
  if (!flag) return false;
  if ((flag as any) === true) return true;
  const str = String(flag).trim().toLowerCase();
  return str === 'true' || str === '1';
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

let supabaseReachable = true;
let lastSupabaseFailureTime = 0;
const RETRY_COOLDOWN_MS = 60000; // Wait 60s before retesting remote connection

export const isSupabaseLive = (): boolean => {
  if (isSharedApiEnabled()) {
    return Boolean(supabaseUrl && supabaseAnonKey && supabaseReachable);
  }
  if (!isSupabaseConfigured()) return false;
  if (!supabaseReachable) {
    if (Date.now() - lastSupabaseFailureTime > RETRY_COOLDOWN_MS) {
      return true;
    }
    return false;
  }
  return true;
};

export const markSupabaseUnavailable = (err?: unknown) => {
  supabaseReachable = false;
  lastSupabaseFailureTime = Date.now();
  console.warn('[Supabase] Remote database unreachable, falling back to on-device relational SQLite:', err);
};

export const markSupabaseHealthy = () => {
  supabaseReachable = true;
};

/**
 * Live Supabase Client instance (when env variables are provided)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Core Database Types matching Phase 2 Schema
 */
export interface DbRestaurant {
  id: string;
  name: string;
  slug: string;
  currency: string;
  tax_rate_percent: number;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export interface DbRestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  location_zone: 'Terrace' | 'Indoor' | 'Walk-Up' | 'Barista';
  qr_code_token: string;
  is_active: boolean;
  created_at: string;
}

export interface DbMenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbMenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  preparation_time_minutes: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
}

export interface DbOrder {
  id: string;
  restaurant_id: string;
  table_id?: string | null;
  order_number: string;
  order_type: 'table' | 'counter';
  status: 'pending_payment' | 'preparing' | 'ready' | 'served' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  subtotal: number;
  total: number;
  special_instructions?: string | null;
  guest_access_token: string;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  restaurant_id: string;
  order_id: string;
  menu_item_id?: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  special_instructions?: string | null;
  created_at: string;
}

export interface DbPayment {
  id: string;
  restaurant_id: string;
  order_id: string;
  amount: number;
  method: 'Cash' | 'MTN MoMo' | 'Airtel Money' | 'Card';
  status: 'pending' | 'verified' | 'failed' | 'refunded';
  reference?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
}
