/**
 * Platform Recommender Service
 *
 * Scores platform+plan combinations for a given order amount
 * based on eligibility, credit utilization, and platform features.
 * Pure functions — no React dependency.
 */

import type { Payment } from '../types';
import type { EnrichedPlatform, BNPLPlan, PlatformId } from '../constants/platforms';

export interface PlatformRecommendation {
  platformId: PlatformId;
  platform: EnrichedPlatform;
  plan: BNPLPlan | null;         // null for Affirm (dynamic APR flow)
  eligible: boolean;
  disqualifyReason?: string;     // why it can't be used (if ineligible)
  score: number;                 // 0-100, higher = better recommendation
  scoreReasons: string[];        // human-readable reasons for ranking
  progressionValue: boolean;     // does this order count toward limit progression?
  availableCredit: number;       // in cents
  utilizationAfter: number;      // % utilization if this order is placed
}

/**
 * Compute used credit for a platform from unpaid payments
 */
function getUsedCredit(platformId: PlatformId, payments: Payment[]): number {
  return payments
    .filter((p) => p.platformId === platformId && p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Get ranked platform+plan recommendations for a given order amount.
 *
 * @param orderAmount - Order total in cents
 * @param platforms - Enriched platforms (stored data + static config)
 * @param payments - All payments from the store
 * @returns Sorted recommendations: eligible (score desc) then ineligible
 */
export function getRecommendations(
  orderAmount: number,
  platforms: EnrichedPlatform[],
  payments: Payment[]
): PlatformRecommendation[] {
  const results: PlatformRecommendation[] = [];

  for (const platform of platforms) {
    const usedCredit = getUsedCredit(platform.id, payments);
    const availableCredit = platform.creditLimit - usedCredit;
    const hasFixedLimit = platform.creditLimit > 0;

    // ── Affirm special case (no predefined plans) ─────────────────────
    if (platform.plans.length === 0) {
      const eligible = !hasFixedLimit || availableCredit >= orderAmount;
      const utilizationAfter = hasFixedLimit
        ? ((usedCredit + orderAmount) / platform.creditLimit) * 100
        : 0;

      results.push({
        platformId: platform.id,
        platform,
        plan: null,
        eligible,
        disqualifyReason: eligible ? undefined : 'Insufficient credit',
        score: eligible ? 10 : 0, // Low base for Affirm (interest-based)
        scoreReasons: eligible ? ['Custom financing available'] : [],
        progressionValue: false,
        availableCredit,
        utilizationAfter,
      });
      continue;
    }

    // ── Score each plan for this platform ──────────────────────────────
    for (const plan of platform.plans) {
      let eligible = true;
      let disqualifyReason: string | undefined;

      // Check minimum order
      if (orderAmount < plan.minimumOrder) {
        eligible = false;
        disqualifyReason = `Minimum $${(plan.minimumOrder / 100).toFixed(2)} required`;
      }

      // Check available credit (only for platforms with fixed limits)
      if (eligible && hasFixedLimit && orderAmount > availableCredit) {
        eligible = false;
        disqualifyReason = `Only $${(availableCredit / 100).toFixed(2)} available`;
      }

      const utilizationAfter = hasFixedLimit
        ? ((usedCredit + orderAmount) / platform.creditLimit) * 100
        : 0;

      // Determine progression value
      const progressionValue =
        platform.progressionType === 'per-order'
          ? orderAmount >= platform.progressionMinimum
          : orderAmount >= platform.progressionMinimum;

      if (!eligible) {
        results.push({
          platformId: platform.id,
          platform,
          plan,
          eligible: false,
          disqualifyReason,
          score: 0,
          scoreReasons: [],
          progressionValue: false,
          availableCredit,
          utilizationAfter,
        });
        continue;
      }

      // ── Scoring (0-100 points) ────────────────────────────────────
      let score = 0;
      const scoreReasons: string[] = [];

      // +30 if shopAnywhere (maximum flexibility)
      if (platform.shopAnywhere) {
        score += 30;
        scoreReasons.push('Shop anywhere');
      } else {
        scoreReasons.push('Approved vendors only');
      }

      // +20 if this order counts toward progression
      if (progressionValue) {
        score += 20;
        scoreReasons.push(
          platform.progressionType === 'per-order'
            ? 'Builds limit per order'
            : 'Builds limit per payment'
        );
      }

      // Utilization-based scoring
      if (utilizationAfter < 30) {
        score += 25; // +15 for <50 and +10 for <30 (stacked)
        scoreReasons.push('Low utilization');
      } else if (utilizationAfter < 50) {
        score += 15;
        scoreReasons.push('Moderate utilization');
      } else if (utilizationAfter > 80) {
        score -= 15;
        scoreReasons.push('High utilization');
      }

      // -10 if plan has interest
      if (plan.hasInterest) {
        score -= 10;
        scoreReasons.push('Has interest');
      }

      // +5 if it's the platform's default plan
      if (plan.isDefault) {
        score += 5;
      }

      results.push({
        platformId: platform.id,
        platform,
        plan,
        eligible: true,
        score,
        scoreReasons,
        progressionValue,
        availableCredit,
        utilizationAfter,
      });
    }
  }

  // Sort: eligible first (score desc), then ineligible
  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.score - a.score;
  });
}
