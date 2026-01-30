/**
 * Data migrations for handling schema changes
 */

import type { Order, Platform, PlatformId } from '../types';
import type { PlatformTier } from '../constants/platforms';
import { DEFAULT_PLATFORM_GOALS, DEFAULT_PLATFORM_TIERS } from '../constants/platforms';

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
