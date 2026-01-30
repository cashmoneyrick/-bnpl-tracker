// Import platform types from constants (single source of truth)
import type { PlatformId, Platform, Subscription, PlatformTier } from '../constants/platforms';

// Re-export for consumers
export type { PlatformId, Platform, Subscription, PlatformTier };

// Order type classification
export type OrderType = 'necessity' | 'arbitrage' | 'personal';

// Limit change tracking for credit growth history
export interface LimitChange {
  id: string;
  platformId: PlatformId;
  previousLimit: number;  // in cents
  newLimit: number;       // in cents
  changedAt: string;      // ISO timestamp
  onTimeStreakAtChange: number;  // streak when limit changed
}

export interface Order {
  id: string;
  platformId: PlatformId;
  storeName?: string;
  totalAmount: number; // in cents
  firstPaymentDate: string; // ISO date
  status: 'active' | 'completed' | 'cancelled' | 'refunded';
  createdAt: string; // ISO timestamp
  tags?: string[]; // e.g., ['groceries', 'electronics']
  notes?: string; // User notes, e.g., "Birthday gift for mom"
  // Payment schedule
  intervalDays?: number; // Days between payments, overrides platform default
  customInstallments?: number; // For Affirm or custom schedules
  apr?: number; // e.g., 0.15 = 15% (Affirm-specific)
  // Order classification (for analytics)
  orderType?: OrderType; // defaults to 'personal'
  // Arbitrage tracking (when orderType === 'arbitrage')
  saleAmount?: number; // in cents - what you sold it for
  saleDate?: string; // ISO date - when you received the cash
}

// Default tag options for orders
export const ORDER_TAG_OPTIONS = [
  'Groceries',
  'Electronics',
  'Clothing',
  'Home',
  'Entertainment',
  'Health',
  'Travel',
  'Other',
] as const;

export interface Payment {
  id: string;
  orderId: string;
  platformId: PlatformId;
  amount: number; // in cents
  dueDate: string; // ISO date
  installmentNumber: number;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string; // ISO date when marked as paid
  paidOnTime?: boolean; // for analytics
  isManualOverride: boolean;
}

// Input types for creating new entities
export interface NewOrderInput {
  platformId: PlatformId;
  storeName?: string;
  totalAmount: number; // in cents
  firstPaymentDate: string; // ISO date
  tags?: string[];
  notes?: string;
  intervalDays?: number; // Days between payments, overrides platform default
  customInstallments?: number; // for Affirm or custom schedules
  apr?: number; // for Affirm
  paymentOverrides?: Record<number, { amount?: number; dueDate?: string }>; // installmentNumber -> overrides
  orderType?: OrderType; // defaults to 'personal'
  saleAmount?: number; // for arbitrage orders
  saleDate?: string; // for arbitrage orders
}

export interface NewPaymentInput {
  orderId: string;
  platformId: PlatformId;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  isManualOverride: boolean;
}

// Calculated/derived types
export interface CalculatedPayment {
  installmentNumber: number;
  amount: number; // in cents
  dueDate: Date;
}

export interface PlatformUtilization {
  platformId: PlatformId;
  used: number; // in cents
  limit: number; // in cents
  available: number; // in cents
  percentage: number; // 0-100
}

export interface PlatformStats {
  platformId: PlatformId;
  totalOrders: number;
  totalSpent: number; // in cents
  averageOrderSize: number; // in cents
  ordersPerMonth: number;
  onTimePaymentRate: number; // 0-100
  totalPayments: number;
  onTimePayments: number;
}

// Date range filter options
export type DateRangeOption = 'this-month' | 'last-3-months' | 'last-6-months' | 'all-time';

// Notification settings
export interface NotificationSettings {
  enabled: boolean;
  daysBefore: number; // 1, 2, or 3 days before due
  notifyOnDueDate: boolean;
  notifyOverdue: boolean;
}

// Export/Import data format
export interface ExportedData {
  version: number;
  exportedAt: string;
  orders: Order[];
  payments: Payment[];
  platforms: Platform[];
  subscriptions: Subscription[];
  limitHistory?: LimitChange[]; // optional for backwards compatibility
}
