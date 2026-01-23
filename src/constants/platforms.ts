import type { Platform, Subscription } from '../types';

export const DEFAULT_PLATFORMS: Platform[] = [
  {
    id: 'afterpay',
    name: 'Afterpay',
    creditLimit: 80000, // $800
    color: '#B2FCE4',
    defaultInstallments: 4,
    defaultIntervalDays: 14,
  },
  {
    id: 'sezzle',
    name: 'Sezzle',
    creditLimit: 25000, // $250
    color: '#8832D4',
    defaultInstallments: 4,
    defaultIntervalDays: 14,
  },
  {
    id: 'klarna',
    name: 'Klarna',
    creditLimit: 35000, // $350
    color: '#FFB3C7',
    defaultInstallments: 4,
    defaultIntervalDays: 14,
  },
  {
    id: 'zip',
    name: 'Zip',
    creditLimit: 15000, // $150
    color: '#00A9E0',
    defaultInstallments: 4,
    defaultIntervalDays: 14,
  },
  {
    id: 'four',
    name: 'Four',
    creditLimit: 18000, // $180
    color: '#FF6B35',
    defaultInstallments: 4,
    defaultIntervalDays: 14,
  },
  {
    id: 'affirm',
    name: 'Affirm',
    creditLimit: 0, // Variable - no set limit
    color: '#0FA0EA',
    defaultInstallments: 4,
    defaultIntervalDays: 14,
  },
];

export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [
  {
    platformId: 'sezzle',
    isActive: true,
    monthlyCost: 0, // To be filled by user
    benefits: [],
    startDate: undefined,
  },
  {
    platformId: 'four',
    isActive: true,
    monthlyCost: 0, // To be filled by user
    benefits: [],
    startDate: undefined,
  },
];

// Affirm installment options
export const AFFIRM_INSTALLMENT_OPTIONS = [3, 4, 6, 12, 18, 24, 36, 48];

// Platform color mapping for dynamic use
export const PLATFORM_COLORS: Record<string, string> = {
  afterpay: '#B2FCE4',
  sezzle: '#8832D4',
  klarna: '#FFB3C7',
  zip: '#00A9E0',
  four: '#FF6B35',
  affirm: '#0FA0EA',
};
