// =============================================================================
// PLATFORM CONFIGURATION - Single Source of Truth
// =============================================================================
// To add a new BNPL platform:
// 1. Add it to DEFAULT_PLATFORMS below
// 2. The PlatformId type and PLATFORM_COLORS will update automatically
// =============================================================================

// Platform configuration - source of truth for all platform data
export const DEFAULT_PLATFORMS = [
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
] as const;

// Derive PlatformId type from DEFAULT_PLATFORMS
export type PlatformId = (typeof DEFAULT_PLATFORMS)[number]['id'];

// Platform tier classification
export type PlatformTier = 'flexible' | 'limited';

// Subscription interface defined here to avoid circular dependency with types/index.ts
export interface Subscription {
  platformId: PlatformId;
  isActive: boolean;
  monthlyCost: number;
  benefits: string[];
  startDate?: string;
}

// Platform interface (mutable version for runtime use)
export interface Platform {
  id: PlatformId;
  name: string;
  creditLimit: number; // in cents
  color: string;
  defaultInstallments: number;
  defaultIntervalDays: number;
  // Goal tracking
  goalLimit?: number; // in cents - target limit user wants to reach
  tier?: PlatformTier; // 'flexible' (virtual Visa) or 'limited' (merchant-specific)
}

// Default goals for each platform (in cents)
export const DEFAULT_PLATFORM_GOALS: Record<PlatformId, number> = {
  sezzle: 300000,   // $3,000
  klarna: 75000,    // $750
  zip: 100000,      // $1,000
  afterpay: 200000, // $2,000
  four: 30000,      // $300
  affirm: 0,        // No set goal for Affirm (variable)
};

// Default tier for each platform
export const DEFAULT_PLATFORM_TIERS: Record<PlatformId, PlatformTier> = {
  sezzle: 'flexible',  // Virtual Visa
  klarna: 'flexible',  // Virtual Visa
  zip: 'flexible',     // Virtual Visa
  afterpay: 'limited', // Merchant-specific
  four: 'limited',     // Merchant-specific
  affirm: 'limited',   // Merchant-specific
};

// Generate PLATFORM_COLORS from DEFAULT_PLATFORMS
export const PLATFORM_COLORS: Record<PlatformId, string> = Object.fromEntries(
  DEFAULT_PLATFORMS.map((p) => [p.id, p.color])
) as Record<PlatformId, string>;

export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [
  {
    platformId: 'sezzle',
    isActive: true,
    monthlyCost: 0,
    benefits: [],
    startDate: undefined,
  },
  {
    platformId: 'four',
    isActive: true,
    monthlyCost: 0,
    benefits: [],
    startDate: undefined,
  },
];

// Affirm installment options
export const AFFIRM_INSTALLMENT_OPTIONS = [3, 4, 6, 12, 18, 24, 36, 48];
