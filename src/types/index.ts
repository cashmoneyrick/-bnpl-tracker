export type PlatformId = 'afterpay' | 'sezzle' | 'klarna' | 'zip' | 'four' | 'affirm';

export interface Platform {
  id: PlatformId;
  name: string;
  creditLimit: number; // in cents
  color: string;
  defaultInstallments: number;
  defaultIntervalDays: number;
}

export interface Order {
  id: string;
  platformId: PlatformId;
  storeName?: string;
  totalAmount: number; // in cents
  firstPaymentDate: string; // ISO date
  status: 'active' | 'completed';
  createdAt: string; // ISO timestamp
  // Affirm-specific fields
  customInstallments?: number;
  apr?: number; // e.g., 0.15 = 15%
}

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

export interface Subscription {
  platformId: PlatformId;
  isActive: boolean;
  monthlyCost: number; // in cents
  benefits: string[];
  startDate?: string; // ISO date
}

// Input types for creating new entities
export interface NewOrderInput {
  platformId: PlatformId;
  storeName?: string;
  totalAmount: number; // in cents
  firstPaymentDate: string; // ISO date
  customInstallments?: number; // for Affirm
  apr?: number; // for Affirm
  paymentOverrides?: Record<number, { amount?: number; dueDate?: string }>; // installmentNumber -> overrides
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

// Export/Import data format
export interface ExportedData {
  version: number;
  exportedAt: string;
  orders: Order[];
  payments: Payment[];
  platforms: Platform[];
  subscriptions: Subscription[];
}
