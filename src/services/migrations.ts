/**
 * Data migrations for handling schema changes
 */

import type { Order, Platform, PlatformId } from '../types';
import type { PlatformTier } from '../constants/platforms';
import { DEFAULT_PLATFORM_GOALS, DEFAULT_PLATFORM_TIERS, findMatchingPlan } from '../constants/platforms';

export interface MigrationContext {
  orders: Order[];
  platforms: Platform[];
}

/**
 * Get the default tier for a platform
 */
export function getDefaultTier(platformId: PlatformId): PlatformTier {
  return DEFAULT_PLATFORM_TIERS[platformId] || 'limited';
}

/**
 * Get the default goal for a platform
 */
export function getDefaultGoal(platformId: PlatformId): number {
  return DEFAULT_PLATFORM_GOALS[platformId] || 0;
}

/**
 * Migrate data to v2 schema:
 * - Add orderType: 'personal' to orders without it
 * - Add tier to platforms without it
 * - Add goalLimit to platforms without it
 */
export function migrateToV2(data: MigrationContext): {
  orders: Order[];
  platforms: Platform[];
  ordersChanged: boolean;
  platformsChanged: boolean;
} {
  let ordersChanged = false;
  let platformsChanged = false;

  // Migrate orders - add default orderType
  const migratedOrders = data.orders.map((order) => {
    if (!order.orderType) {
      ordersChanged = true;
      return {
        ...order,
        orderType: 'personal' as const,
      };
    }
    return order;
  });

  // Migrate platforms - add default tier and goalLimit
  const migratedPlatforms = data.platforms.map((platform) => {
    const needsTier = !platform.tier;
    const needsGoal = platform.goalLimit === undefined;

    if (needsTier || needsGoal) {
      platformsChanged = true;
      return {
        ...platform,
        tier: platform.tier || getDefaultTier(platform.id),
        goalLimit: platform.goalLimit ?? getDefaultGoal(platform.id),
      };
    }
    return platform;
  });

  return {
    orders: migratedOrders,
    platforms: migratedPlatforms,
    ordersChanged,
    platformsChanged,
  };
}

/**
 * Migrate data to v3 schema:
 * - Backfill planId on orders by matching installments + intervalDays to known plans
 * - Best-effort: if no match found, planId stays undefined
 */
export function migrateToV3(data: MigrationContext): {
  orders: Order[];
  platforms: Platform[];
  ordersChanged: boolean;
  platformsChanged: boolean;
} {
  let ordersChanged = false;

  const migratedOrders = data.orders.map((order) => {
    // Skip orders that already have a planId
    if (order.planId) return order;

    // Try to match using per-order overrides first
    const installments = order.customInstallments;
    const interval = order.intervalDays;

    if (installments && interval) {
      const plan = findMatchingPlan(order.platformId, installments, interval);
      if (plan) {
        ordersChanged = true;
        return { ...order, planId: plan.id };
      }
    }

    // Fall back to platform defaults
    const platform = data.platforms.find((p) => p.id === order.platformId);
    if (platform) {
      const plan = findMatchingPlan(
        order.platformId,
        platform.defaultInstallments,
        platform.defaultIntervalDays
      );
      if (plan) {
        ordersChanged = true;
        return { ...order, planId: plan.id };
      }
    }

    return order;
  });

  return {
    orders: migratedOrders,
    platforms: data.platforms,
    ordersChanged,
    platformsChanged: false,
  };
}
