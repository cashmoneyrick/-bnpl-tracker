// =============================================================================
// PLATFORM CONFIGURATION - Single Source of Truth
// =============================================================================
// To add a new BNPL platform:
// 1. Add its id to PLATFORM_IDS
// 2. Add it to DEFAULT_PLATFORMS below
// 3. Add its config to PLATFORM_CONFIGS
// The PlatformId type and PLATFORM_COLORS will update automatically
// =============================================================================

// ─── BNPL Plan Types ────────────────────────────────────────────────────────

export interface BNPLPlan {
  id: string;                    // e.g. 'pay-in-4', 'buy-in-2'
  label: string;                 // e.g. 'Pay in 4', 'Buy in 2'
  installments: number;
  intervalDays: number;
  minimumOrder: number;          // in cents - minimum to use this plan
  hasInterest: boolean;
  isDefault: boolean;            // which plan to use when not specified
}

export interface PlatformConfig {
  shopAnywhere: boolean;         // true = virtual card/anywhere, false = approved vendors only
  plans: BNPLPlan[];             // all available plans for this platform
  progressionType: 'per-order' | 'per-payment';  // what triggers limit increases
  progressionMinimum: number;    // in cents - minimum transaction to count toward progression
  hasSubscription: boolean;      // whether platform offers/requires a subscription
  approvedCategories?: string[]; // only relevant if shopAnywhere is false
}

// ─── Platform ID & Tier Types ───────────────────────────────────────────────

export const PLATFORM_IDS = ['afterpay', 'sezzle', 'klarna', 'zip', 'four', 'affirm'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export type PlatformTier = 'flexible' | 'limited';

// ─── Subscription Interface ─────────────────────────────────────────────────

export interface Subscription {
  platformId: PlatformId;
  isActive: boolean;
  monthlyCost: number;
  benefits: string[];
  startDate?: string;
}

// ─── Platform Interface (stored in IndexedDB) ───────────────────────────────

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

// ─── Enriched Platform (runtime merge of stored + static config) ────────────

export type EnrichedPlatform = Platform & PlatformConfig;

// ─── Platform Configs (static, never stored in DB) ──────────────────────────

export const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
  afterpay: {
    shopAnywhere: false,
    progressionType: 'per-payment',
    progressionMinimum: 0,
    hasSubscription: false,
    plans: [
      { id: 'pay-in-4', label: 'Pay in 4', installments: 4, intervalDays: 14, minimumOrder: 0, hasInterest: false, isDefault: true },
      { id: 'pay-in-6', label: 'Pay in 6', installments: 6, intervalDays: 30, minimumOrder: 0, hasInterest: true, isDefault: false },
    ],
  },
  sezzle: {
    shopAnywhere: true,
    progressionType: 'per-payment',
    progressionMinimum: 1500, // $15 minimum per payment to count
    hasSubscription: true,
    plans: [
      { id: 'pay-in-4', label: 'Pay in 4', installments: 4, intervalDays: 14, minimumOrder: 6000, hasInterest: false, isDefault: true },
      { id: 'pay-in-5', label: 'Pay in 5', installments: 5, intervalDays: 14, minimumOrder: 7500, hasInterest: false, isDefault: false },
    ],
  },
  klarna: {
    shopAnywhere: true,
    progressionType: 'per-payment',
    progressionMinimum: 0,
    hasSubscription: false,
    plans: [
      { id: 'pay-in-4', label: 'Pay in 4', installments: 4, intervalDays: 14, minimumOrder: 3500, hasInterest: false, isDefault: true },
      { id: 'pay-in-3', label: 'Pay in 3', installments: 3, intervalDays: 30, minimumOrder: 0, hasInterest: true, isDefault: false },
    ],
  },
  zip: {
    shopAnywhere: true,
    progressionType: 'per-order',
    progressionMinimum: 0,
    hasSubscription: false,
    plans: [
      { id: 'buy-in-2', label: 'Buy in 2', installments: 2, intervalDays: 14, minimumOrder: 2000, hasInterest: false, isDefault: false },
      { id: 'buy-in-4', label: 'Buy in 4', installments: 4, intervalDays: 14, minimumOrder: 3500, hasInterest: false, isDefault: true },
    ],
  },
  four: {
    shopAnywhere: false,
    progressionType: 'per-payment',
    progressionMinimum: 0,
    hasSubscription: true,
    plans: [
      { id: 'pay-in-4', label: 'Pay in 4', installments: 4, intervalDays: 14, minimumOrder: 3500, hasInterest: false, isDefault: true },
    ],
  },
  affirm: {
    shopAnywhere: false,
    progressionType: 'per-payment',
    progressionMinimum: 0,
    hasSubscription: false,
    plans: [], // dynamic, handled separately via APR/installment selection
  },
};

// ─── Default Platforms (stored shape) ───────────────────────────────────────

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

// ─── Default Goals & Tiers ──────────────────────────────────────────────────

export const DEFAULT_PLATFORM_GOALS: Record<PlatformId, number> = {
  sezzle: 300000,   // $3,000
  klarna: 75000,    // $750
  zip: 100000,      // $1,000
  afterpay: 200000, // $2,000
  four: 30000,      // $300
  affirm: 0,        // No set goal for Affirm (variable)
};

export const DEFAULT_PLATFORM_TIERS: Record<PlatformId, PlatformTier> = {
  sezzle: 'flexible',  // Virtual Visa
  klarna: 'flexible',  // Virtual Visa
  zip: 'flexible',     // Virtual Visa
  afterpay: 'limited', // Merchant-specific
  four: 'limited',     // Merchant-specific
  affirm: 'limited',   // Merchant-specific
};

// ─── Derived Constants ──────────────────────────────────────────────────────

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

export const AFFIRM_INSTALLMENT_OPTIONS = [3, 4, 6, 12, 18, 24, 36, 48];

// ─── Helper Functions ───────────────────────────────────────────────────────

/** Get the default plan for a platform (isDefault: true) */
export function getDefaultPlan(platformId: PlatformId): BNPLPlan | null {
  return PLATFORM_CONFIGS[platformId].plans.find((p) => p.isDefault) ?? null;
}

/** Merge stored platform data with static config for runtime use */
export function getEnrichedPlatform(platform: Platform): EnrichedPlatform {
  const config = PLATFORM_CONFIGS[platform.id as PlatformId];
  return { ...platform, ...config };
}

/** Find a specific plan by ID within a platform */
export function getPlanById(platformId: PlatformId, planId: string): BNPLPlan | null {
  return PLATFORM_CONFIGS[platformId].plans.find((p) => p.id === planId) ?? null;
}

/** Find a plan matching specific installments and intervalDays */
export function findMatchingPlan(
  platformId: PlatformId,
  installments: number,
  intervalDays: number
): BNPLPlan | null {
  return (
    PLATFORM_CONFIGS[platformId].plans.find(
      (p) => p.installments === installments && p.intervalDays === intervalDays
    ) ?? null
  );
}
