import { useMemo } from 'react';
import {
  parseISO,
  format,
  isWithinInterval,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  subDays,
  subMonths,
  differenceInDays,
  differenceInMonths,
} from 'date-fns';
import { useBNPLStore } from './index';
import type {
  Order,
  Payment,
  Platform,
  PlatformId,
  PlatformUtilization,
  PlatformStats,
  DateRangeOption,
  LimitChange,
} from '../types';
import type { PlatformTier } from '../constants/platforms';
import { getEnrichedPlatform } from '../constants/platforms';
import { getRecommendations, type PlatformRecommendation } from '../services/platformRecommender';
import { formatCurrency } from '../utils/currency';

/**
 * Get total amount owed across all platforms
 */
export function useTotalOwed(): number {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    return payments
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);
}

/**
 * Get total available credit across all platforms
 */
export function useTotalAvailableCredit(): number {
  const platforms = useBNPLStore((state) => state.platforms);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const totalLimit = platforms.reduce((sum, p) => sum + p.creditLimit, 0);
    const totalOwed = payments
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    return totalLimit - totalOwed;
  }, [platforms, payments]);
}

/**
 * Get utilization for a specific platform
 */
export function usePlatformUtilization(platformId: PlatformId): PlatformUtilization {
  const platforms = useBNPLStore((state) => state.platforms);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const platform = platforms.find((p) => p.id === platformId);
    const limit = platform?.creditLimit ?? 0;

    const used = payments
      .filter((p) => p.platformId === platformId && p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      platformId,
      used,
      limit,
      available: limit - used,
      percentage: limit > 0 ? (used / limit) * 100 : 0,
    };
  }, [platforms, payments, platformId]);
}

/**
 * Get utilization for all platforms
 */
export function useAllPlatformUtilizations(): PlatformUtilization[] {
  const platforms = useBNPLStore((state) => state.platforms);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    return platforms.map((platform) => {
      const used = payments
        .filter((p) => p.platformId === platform.id && p.status !== 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        platformId: platform.id,
        used,
        limit: platform.creditLimit,
        available: platform.creditLimit - used,
        percentage:
          platform.creditLimit > 0 ? (used / platform.creditLimit) * 100 : 0,
      };
    });
  }, [platforms, payments]);
}

/**
 * Get upcoming payments within N days
 */
export function useUpcomingPayments(days: number = 7): Payment[] {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const today = startOfDay(new Date());
    const futureDate = endOfDay(addDays(today, days));

    return payments
      .filter((p) => {
        if (p.status === 'paid') return false;
        const dueDate = parseISO(p.dueDate);
        return isWithinInterval(dueDate, { start: today, end: futureDate });
      })
      .sort(
        (a, b) =>
          parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
      );
  }, [payments, days]);
}

/**
 * Get overdue payments
 */
export function useOverduePayments(): Payment[] {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    return payments
      .filter((p) => p.status === 'overdue')
      .sort(
        (a, b) =>
          parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
      );
  }, [payments]);
}

/**
 * Get monthly outgoing for current month
 */
export function useMonthlyOutgoing(): number {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return payments
      .filter((p) => {
        const dueDate = parseISO(p.dueDate);
        return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);
}

/**
 * Get monthly payment stats (total, paid, percentage)
 */
export function useMonthlyPaymentStats(): { total: number; paid: number; pending: number; percentage: number } {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthPayments = payments.filter((p) => {
      const dueDate = parseISO(p.dueDate);
      return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
    });

    const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const paid = monthPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = total - paid;
    const percentage = total > 0 ? (paid / total) * 100 : 0;

    return { total, paid, pending, percentage };
  }, [payments]);
}

/**
 * Get overall credit utilization
 */
export function useOverallCreditUtilization(): { used: number; limit: number; percentage: number } {
  const platforms = useBNPLStore((state) => state.platforms);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const limit = platforms.reduce((sum, p) => sum + p.creditLimit, 0);
    const used = payments
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const percentage = limit > 0 ? (used / limit) * 100 : 0;

    return { used, limit, percentage };
  }, [platforms, payments]);
}

/**
 * Get payments for a specific date
 */
export function usePaymentsForDate(date: Date): Payment[] {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return payments.filter((p) => {
      const dueDate = parseISO(p.dueDate);
      return isWithinInterval(dueDate, { start: dayStart, end: dayEnd });
    });
  }, [payments, date]);
}

/**
 * Get platform statistics
 */
export function usePlatformStats(
  platformId: PlatformId,
  dateRange?: DateRangeOption
): PlatformStats {
  const orders = useBNPLStore((state) => state.orders);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    // Filter by date range
    let filteredOrders = orders.filter((o) => o.platformId === platformId);
    let filteredPayments = payments.filter((p) => p.platformId === platformId);

    if (dateRange && dateRange !== 'all-time') {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'this-month':
          startDate = startOfMonth(now);
          break;
        case 'last-3-months':
          startDate = startOfMonth(subMonths(now, 2));
          break;
        case 'last-6-months':
          startDate = startOfMonth(subMonths(now, 5));
          break;
        default:
          startDate = new Date(0); // Fallback to epoch (no filtering)
      }

      filteredOrders = filteredOrders.filter((o) => {
        const createdAt = parseISO(o.createdAt);
        return createdAt >= startDate;
      });

      filteredPayments = filteredPayments.filter((p) => {
        const dueDate = parseISO(p.dueDate);
        return dueDate >= startDate;
      });
    }

    const totalOrders = filteredOrders.length;
    const totalSpent = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrderSize = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Calculate orders per month
    let ordersPerMonth = 0;
    if (totalOrders > 0) {
      const firstOrderDate = Math.min(
        ...filteredOrders.map((o) => parseISO(o.createdAt).getTime())
      );
      const monthsSpan =
        differenceInMonths(new Date(), new Date(firstOrderDate)) || 1;
      ordersPerMonth = totalOrders / monthsSpan;
    }

    // Calculate on-time payment rate
    const paidPayments = filteredPayments.filter((p) => p.status === 'paid');
    const onTimePayments = paidPayments.filter((p) => p.paidOnTime === true);
    const onTimePaymentRate =
      paidPayments.length > 0
        ? (onTimePayments.length / paidPayments.length) * 100
        : 0;

    return {
      platformId,
      totalOrders,
      totalSpent,
      averageOrderSize: Math.round(averageOrderSize),
      ordersPerMonth: Math.round(ordersPerMonth * 10) / 10,
      onTimePaymentRate: Math.round(onTimePaymentRate),
      totalPayments: paidPayments.length,
      onTimePayments: onTimePayments.length,
    };
  }, [orders, payments, platformId, dateRange]);
}

/**
 * Get stats for all platforms
 */
export function useAllPlatformStats(dateRange?: DateRangeOption): PlatformStats[] {
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    return platforms.map((platform) => {
      // Filter by date range
      let filteredOrders = orders.filter((o) => o.platformId === platform.id);
      let filteredPayments = payments.filter(
        (p) => p.platformId === platform.id
      );

      if (dateRange && dateRange !== 'all-time') {
        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
          case 'this-month':
            startDate = startOfMonth(now);
            break;
          case 'last-3-months':
            startDate = startOfMonth(subMonths(now, 2));
            break;
          case 'last-6-months':
            startDate = startOfMonth(subMonths(now, 5));
            break;
        }

        filteredOrders = filteredOrders.filter((o) => {
          const createdAt = parseISO(o.createdAt);
          return createdAt >= startDate;
        });

        filteredPayments = filteredPayments.filter((p) => {
          const dueDate = parseISO(p.dueDate);
          return dueDate >= startDate;
        });
      }

      const totalOrders = filteredOrders.length;
      const totalSpent = filteredOrders.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );
      const averageOrderSize = totalOrders > 0 ? totalSpent / totalOrders : 0;

      let ordersPerMonth = 0;
      if (totalOrders > 0) {
        const firstOrderDate = Math.min(
          ...filteredOrders.map((o) => parseISO(o.createdAt).getTime())
        );
        const monthsSpan =
          differenceInMonths(new Date(), new Date(firstOrderDate)) || 1;
        ordersPerMonth = totalOrders / monthsSpan;
      }

      const paidPayments = filteredPayments.filter((p) => p.status === 'paid');
      const onTimePayments = paidPayments.filter((p) => p.paidOnTime === true);
      const onTimePaymentRate =
        paidPayments.length > 0
          ? (onTimePayments.length / paidPayments.length) * 100
          : 0;

      return {
        platformId: platform.id,
        totalOrders,
        totalSpent,
        averageOrderSize: Math.round(averageOrderSize),
        ordersPerMonth: Math.round(ordersPerMonth * 10) / 10,
        onTimePaymentRate: Math.round(onTimePaymentRate),
        totalPayments: paidPayments.length,
        onTimePayments: onTimePayments.length,
      };
    });
  }, [platforms, orders, payments, dateRange]);
}

/**
 * Get the most used platform
 */
export function useMostUsedPlatform(): PlatformId | null {
  const orders = useBNPLStore((state) => state.orders);
  const platforms = useBNPLStore((state) => state.platforms);

  return useMemo(() => {
    if (orders.length === 0) return null;

    const orderCounts: Record<string, number> = {};
    for (const order of orders) {
      orderCounts[order.platformId] = (orderCounts[order.platformId] || 0) + 1;
    }

    let maxPlatform: PlatformId | null = null;
    let maxCount = 0;

    for (const platform of platforms) {
      const count = orderCounts[platform.id] || 0;
      if (count > maxCount) {
        maxCount = count;
        maxPlatform = platform.id;
      }
    }

    return maxPlatform;
  }, [orders, platforms]);
}

/**
 * Get order by ID
 */
export function useOrder(orderId: string): Order | undefined {
  const orders = useBNPLStore((state) => state.orders);
  return useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);
}

/**
 * Get payments for an order
 */
export function useOrderPayments(orderId: string): Payment[] {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    return payments
      .filter((p) => p.orderId === orderId)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [payments, orderId]);
}

/**
 * Order payment progress
 */
export interface OrderProgress {
  total: number;
  paid: number;
  percentage: number;
}

/**
 * Get payment progress for an order
 */
export function useOrderProgress(orderId: string): OrderProgress {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const orderPayments = payments.filter((p) => p.orderId === orderId);
    const total = orderPayments.length;
    const paid = orderPayments.filter((p) => p.status === 'paid').length;
    const percentage = total > 0 ? (paid / total) * 100 : 0;

    return { total, paid, percentage };
  }, [payments, orderId]);
}

/**
 * Get platform by ID
 */
export function usePlatform(platformId: PlatformId): Platform | undefined {
  const platforms = useBNPLStore((state) => state.platforms);
  return useMemo(
    () => platforms.find((p) => p.id === platformId),
    [platforms, platformId]
  );
}

/**
 * Month-over-month comparison data
 */
export interface MonthComparison {
  thisMonth: {
    spending: number;
    orders: number;
    avgOrder: number;
  };
  lastMonth: {
    spending: number;
    orders: number;
    avgOrder: number;
  };
  changes: {
    spending: number | null;  // percentage, null if no data last month
    orders: number | null;
    avgOrder: number | null;
  };
}

/**
 * Get month-over-month comparison
 */
export function useMonthComparison(): MonthComparison {
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // This month orders
    const thisMonthOrders = orders.filter((o) => {
      const createdAt = parseISO(o.createdAt);
      return isWithinInterval(createdAt, { start: thisMonthStart, end: thisMonthEnd });
    });

    // Last month orders
    const lastMonthOrders = orders.filter((o) => {
      const createdAt = parseISO(o.createdAt);
      return isWithinInterval(createdAt, { start: lastMonthStart, end: lastMonthEnd });
    });

    // Calculate stats
    const thisMonthSpending = thisMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const lastMonthSpending = lastMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const thisMonthCount = thisMonthOrders.length;
    const lastMonthCount = lastMonthOrders.length;

    const thisMonthAvg = thisMonthCount > 0 ? thisMonthSpending / thisMonthCount : 0;
    const lastMonthAvg = lastMonthCount > 0 ? lastMonthSpending / lastMonthCount : 0;

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? null : null; // Can't calculate % from 0
      return ((current - previous) / previous) * 100;
    };

    return {
      thisMonth: {
        spending: thisMonthSpending,
        orders: thisMonthCount,
        avgOrder: Math.round(thisMonthAvg),
      },
      lastMonth: {
        spending: lastMonthSpending,
        orders: lastMonthCount,
        avgOrder: Math.round(lastMonthAvg),
      },
      changes: {
        spending: calcChange(thisMonthSpending, lastMonthSpending),
        orders: calcChange(thisMonthCount, lastMonthCount),
        avgOrder: calcChange(thisMonthAvg, lastMonthAvg),
      },
    };
  }, [orders]);
}

/**
 * Get orders filtered by platform
 */
export function useOrdersByPlatform(platformId: PlatformId): Order[] {
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(
    () => orders.filter((o) => o.platformId === platformId),
    [orders, platformId]
  );
}

/**
 * Get upcoming payments for a specific platform
 */
export function useUpcomingPaymentsByPlatform(
  platformId: PlatformId,
  days: number = 30
): Payment[] {
  const upcomingPayments = useUpcomingPayments(days);

  return useMemo(
    () => upcomingPayments.filter((p) => p.platformId === platformId),
    [upcomingPayments, platformId]
  );
}

/**
 * Get most common store for a platform
 */
export function useMostCommonStore(platformId: PlatformId): string | null {
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(() => {
    const platformOrders = orders.filter(
      (o) => o.platformId === platformId && o.storeName
    );
    if (platformOrders.length === 0) return null;

    const storeCounts: Record<string, number> = {};
    for (const order of platformOrders) {
      if (order.storeName) {
        storeCounts[order.storeName] = (storeCounts[order.storeName] || 0) + 1;
      }
    }

    const sorted = Object.entries(storeCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [orders, platformId]);
}

/**
 * Get next unpaid payment for an order
 */
export function useNextPayment(orderId: string): Payment | null {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const orderPayments = payments
      .filter((p) => p.orderId === orderId && p.status !== 'paid')
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    return orderPayments[0] || null;
  }, [payments, orderId]);
}

// ============================================================================
// NEW ANALYTICS SELECTORS
// ============================================================================

/**
 * Get overall on-time payment rate (all platforms, all time)
 */
export function useOnTimeRate(): number {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const paidPayments = payments.filter((p) => p.status === 'paid');
    if (paidPayments.length === 0) return 100; // Default to 100% if no payments

    const onTimeCount = paidPayments.filter((p) => p.paidOnTime === true).length;
    return Math.round((onTimeCount / paidPayments.length) * 100);
  }, [payments]);
}

/**
 * Get on-time payment rate for a specific platform
 */
export function usePlatformOnTimeRate(platformId: PlatformId): number {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const paidPayments = payments.filter(
      (p) => p.platformId === platformId && p.status === 'paid'
    );
    if (paidPayments.length === 0) return 100;

    const onTimeCount = paidPayments.filter((p) => p.paidOnTime === true).length;
    return Math.round((onTimeCount / paidPayments.length) * 100);
  }, [payments, platformId]);
}

/**
 * Get current consecutive on-time payment streak (all platforms)
 */
export function useOnTimeStreak(): number {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    // Get all paid payments sorted by paid date (most recent first)
    const paidPayments = payments
      .filter((p) => p.status === 'paid' && p.paidDate)
      .sort((a, b) => {
        const dateA = parseISO(a.paidDate!);
        const dateB = parseISO(b.paidDate!);
        return dateB.getTime() - dateA.getTime();
      });

    let streak = 0;
    for (const payment of paidPayments) {
      if (payment.paidOnTime) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [payments]);
}

/**
 * Get on-time payment streak for a specific platform
 */
export function usePlatformOnTimeStreak(platformId: PlatformId): number {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const paidPayments = payments
      .filter((p) => p.platformId === platformId && p.status === 'paid' && p.paidDate)
      .sort((a, b) => {
        const dateA = parseISO(a.paidDate!);
        const dateB = parseISO(b.paidDate!);
        return dateB.getTime() - dateA.getTime();
      });

    let streak = 0;
    for (const payment of paidPayments) {
      if (payment.paidOnTime) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [payments, platformId]);
}

/**
 * Weekly deployment stats
 */
export interface WeeklyDeployment {
  amount: number;           // Total amount of orders created in last 7 days
  isOverExtended: boolean;  // True if > $600
  isWarning: boolean;       // True if $500-600
  warningThreshold: number; // $500
  limitThreshold: number;   // $600
}

/**
 * Get weekly deployment (orders created in last 7 days)
 */
export function useWeeklyDeployment(): WeeklyDeployment {
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);

    const weeklyOrders = orders.filter((o) => {
      const createdAt = parseISO(o.createdAt);
      return createdAt >= weekAgo;
    });

    const amount = weeklyOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const warningThreshold = 50000; // $500 in cents
    const limitThreshold = 60000;   // $600 in cents

    return {
      amount,
      isOverExtended: amount > limitThreshold,
      isWarning: amount >= warningThreshold && amount <= limitThreshold,
      warningThreshold,
      limitThreshold,
    };
  }, [orders]);
}

/**
 * Extended platform utilization with goal progress
 */
export interface PlatformUtilizationWithGoal extends PlatformUtilization {
  goalLimit?: number;
  goalProgress?: number; // 0-100
  tier?: PlatformTier;
}

/**
 * Get platform utilization with goal progress
 */
export function usePlatformUtilizationWithGoal(platformId: PlatformId): PlatformUtilizationWithGoal {
  const platforms = useBNPLStore((state) => state.platforms);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const platform = platforms.find((p) => p.id === platformId);
    const limit = platform?.creditLimit ?? 0;

    const used = payments
      .filter((p) => p.platformId === platformId && p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const goalProgress = platform?.goalLimit && platform.goalLimit > 0
      ? Math.min(100, Math.round((limit / platform.goalLimit) * 100))
      : undefined;

    return {
      platformId,
      used,
      limit,
      available: limit - used,
      percentage: limit > 0 ? (used / limit) * 100 : 0,
      goalLimit: platform?.goalLimit,
      goalProgress,
      tier: platform?.tier,
    };
  }, [platforms, payments, platformId]);
}

/**
 * Arbitrage order with computed fields
 */
export interface ArbitrageOrderWithMetrics extends Order {
  netCash: number;              // saleAmount - totalAmount (can be negative)
  costOfCapitalPercent: number; // Cost as percentage of purchase
  isProfitable: boolean;
  hasSaleData: boolean;
}

/**
 * Get all arbitrage orders with computed metrics
 */
export function useArbitrageOrders(): ArbitrageOrderWithMetrics[] {
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(() => {
    return orders
      .filter((o) => o.orderType === 'arbitrage')
      .map((order) => {
        const hasSaleData = order.saleAmount !== undefined && order.saleAmount > 0;
        const netCash = hasSaleData ? (order.saleAmount! - order.totalAmount) : 0;
        const costOfCapitalPercent = hasSaleData && order.totalAmount > 0
          ? Math.round(((order.totalAmount - order.saleAmount!) / order.totalAmount) * 1000) / 10
          : 0;
        const isProfitable = netCash >= 0;

        return {
          ...order,
          netCash,
          costOfCapitalPercent: Math.max(0, costOfCapitalPercent), // Don't show negative cost
          isProfitable,
          hasSaleData,
        };
      })
      .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [orders]);
}

/**
 * Aggregate arbitrage statistics
 */
export interface ArbitrageStats {
  totalPurchased: number;       // Sum of all arbitrage order amounts
  totalSaleAmount: number;      // Sum of all sale amounts
  totalNetCash: number;         // Total cash generated (can be negative)
  averageCostOfCapital: number; // Average % cost
  orderCount: number;
  pendingSales: number;         // Orders without sale amount
  completedSales: number;       // Orders with sale amount
}

/**
 * Get aggregate arbitrage stats
 */
export function useArbitrageStats(): ArbitrageStats {
  const arbitrageOrders = useArbitrageOrders();

  return useMemo(() => {
    const totalPurchased = arbitrageOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const ordersWithSales = arbitrageOrders.filter((o) => o.hasSaleData);
    const totalSaleAmount = ordersWithSales.reduce((sum, o) => sum + (o.saleAmount || 0), 0);
    const totalNetCash = ordersWithSales.reduce((sum, o) => sum + o.netCash, 0);

    const averageCostOfCapital = ordersWithSales.length > 0
      ? ordersWithSales.reduce((sum, o) => sum + o.costOfCapitalPercent, 0) / ordersWithSales.length
      : 0;

    return {
      totalPurchased,
      totalSaleAmount,
      totalNetCash,
      averageCostOfCapital: Math.round(averageCostOfCapital * 10) / 10,
      orderCount: arbitrageOrders.length,
      pendingSales: arbitrageOrders.filter((o) => !o.hasSaleData).length,
      completedSales: ordersWithSales.length,
    };
  }, [arbitrageOrders]);
}

/**
 * Get limit history for a platform
 */
export function useLimitHistory(platformId: PlatformId): LimitChange[] {
  const limitHistory = useBNPLStore((state) => state.limitHistory);

  return useMemo(() => {
    return limitHistory
      .filter((lc) => lc.platformId === platformId)
      .sort((a, b) => parseISO(a.changedAt).getTime() - parseISO(b.changedAt).getTime());
  }, [limitHistory, platformId]);
}

/**
 * Total limit growth statistics
 */
export interface TotalLimitGrowth {
  startingTotal: number;   // Sum of first recorded limits (or current if no history)
  currentTotal: number;    // Sum of current limits
  growthAmount: number;    // Absolute growth
  growthPercent: number;   // Growth as percentage
}

/**
 * Get total limit growth across all platforms
 */
export function useTotalLimitGrowth(): TotalLimitGrowth {
  const platforms = useBNPLStore((state) => state.platforms);
  const limitHistory = useBNPLStore((state) => state.limitHistory);

  return useMemo(() => {
    const currentTotal = platforms.reduce((sum, p) => sum + p.creditLimit, 0);

    // Find starting limit for each platform (earliest recorded or current)
    let startingTotal = 0;
    for (const platform of platforms) {
      const platformHistory = limitHistory
        .filter((lc) => lc.platformId === platform.id)
        .sort((a, b) => parseISO(a.changedAt).getTime() - parseISO(b.changedAt).getTime());

      if (platformHistory.length > 0) {
        startingTotal += platformHistory[0].previousLimit;
      } else {
        startingTotal += platform.creditLimit;
      }
    }

    const growthAmount = currentTotal - startingTotal;
    const growthPercent = startingTotal > 0
      ? Math.round((growthAmount / startingTotal) * 100)
      : 0;

    return {
      startingTotal,
      currentTotal,
      growthAmount,
      growthPercent,
    };
  }, [platforms, limitHistory]);
}

/**
 * Platform goal progress
 */
export interface PlatformGoalProgress {
  platform: Platform;
  currentLimit: number;
  goalLimit: number;
  progress: number;    // 0-100
  remaining: number;   // Cents until goal
}

/**
 * Get goal progress for a platform
 */
export function usePlatformGoalProgress(platformId: PlatformId): PlatformGoalProgress | null {
  const platforms = useBNPLStore((state) => state.platforms);

  return useMemo(() => {
    const platform = platforms.find((p) => p.id === platformId);
    if (!platform) return null;

    const goalLimit = platform.goalLimit || 0;
    const progress = goalLimit > 0
      ? Math.min(100, Math.round((platform.creditLimit / goalLimit) * 100))
      : 0;
    const remaining = Math.max(0, goalLimit - platform.creditLimit);

    return {
      platform,
      currentLimit: platform.creditLimit,
      goalLimit,
      progress,
      remaining,
    };
  }, [platforms, platformId]);
}

/**
 * All platforms grouped by tier with goal progress
 */
export interface AllPlatformGoals {
  flexible: PlatformGoalProgress[];
  limited: PlatformGoalProgress[];
}

/**
 * Get all platforms with goal progress, grouped by tier
 */
export function useAllPlatformGoals(): AllPlatformGoals {
  const platforms = useBNPLStore((state) => state.platforms);

  return useMemo(() => {
    const goals: AllPlatformGoals = {
      flexible: [],
      limited: [],
    };

    for (const platform of platforms) {
      const goalLimit = platform.goalLimit || 0;
      const progress = goalLimit > 0
        ? Math.min(100, Math.round((platform.creditLimit / goalLimit) * 100))
        : 0;
      const remaining = Math.max(0, goalLimit - platform.creditLimit);

      const goalProgress: PlatformGoalProgress = {
        platform,
        currentLimit: platform.creditLimit,
        goalLimit,
        progress,
        remaining,
      };

      const tier = platform.tier || 'flexible';
      if (tier === 'flexible') {
        goals.flexible.push(goalProgress);
      } else {
        goals.limited.push(goalProgress);
      }
    }

    return goals;
  }, [platforms]);
}

/**
 * Order breakdown by type
 */
export interface OrderTypeBreakdown {
  necessity: { count: number; total: number };
  arbitrage: { count: number; total: number };
  personal: { count: number; total: number };
}

/**
 * Get orders grouped by type
 */
export function useOrdersByType(): OrderTypeBreakdown {
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(() => {
    const breakdown: OrderTypeBreakdown = {
      necessity: { count: 0, total: 0 },
      arbitrage: { count: 0, total: 0 },
      personal: { count: 0, total: 0 },
    };

    for (const order of orders) {
      const type = order.orderType || 'personal';
      breakdown[type].count++;
      breakdown[type].total += order.totalAmount;
    }

    return breakdown;
  }, [orders]);
}

/**
 * Get platform recommendations for a given order amount.
 * Returns ranked platform+plan combinations sorted by score.
 */
export function usePlatformRecommendations(orderAmount: number): PlatformRecommendation[] {
  const platforms = useBNPLStore((state) => state.platforms);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    if (orderAmount <= 0) return [];

    const enriched = platforms.map(getEnrichedPlatform);
    return getRecommendations(orderAmount, enriched, payments);
  }, [orderAmount, platforms, payments]);
}

// ─── Sprint 1: Incoming Payments & Risk Clustering ───────────────────────────

export type ExposureStatus = 'NOMINAL' | 'ELEVATED' | 'CRITICAL';

export function getExposureStatus(percentage: number): ExposureStatus {
  if (percentage >= 80) return 'CRITICAL';
  if (percentage >= 60) return 'ELEVATED';
  return 'NOMINAL';
}

export function getExposureColor(status: ExposureStatus): string {
  if (status === 'CRITICAL') return 'text-terminal-red';
  if (status === 'ELEVATED') return 'text-terminal-amber';
  return 'text-terminal-green';
}

/**
 * Incoming payment day — a date with its associated payments
 */
export interface IncomingDay {
  date: string; // ISO date
  label: string; // "MAR 08 (SAT)"
  payments: (Payment & { orderProgress: { total: number; paid: number } })[];
  dayTotal: number;
}

/**
 * Get incoming payments grouped by date for the next N days.
 * Includes overdue payments as a separate group at the top.
 */
export function useIncomingPayments(days: number = 14): {
  days: IncomingDay[];
  overdue: IncomingDay | null;
  grandTotal: number;
  overdueTotal: number;
  paymentCount: number;
} {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const today = startOfDay(new Date());
    const futureDate = endOfDay(addDays(today, days));

    // Get overdue payments
    const overduePayments = payments
      .filter((p) => p.status === 'overdue')
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    // Get upcoming payments (pending within window)
    const upcoming = payments
      .filter((p) => {
        if (p.status === 'paid') return false;
        if (p.status === 'overdue') return false;
        const dueDate = parseISO(p.dueDate);
        return isWithinInterval(dueDate, { start: today, end: futureDate });
      })
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    // Helper: compute order progress for a payment
    const getProgress = (payment: Payment) => {
      const orderPayments = payments.filter((p) => p.orderId === payment.orderId);
      const total = orderPayments.length;
      const paid = orderPayments.filter((p) => p.status === 'paid').length;
      return { total, paid };
    };

    // Group upcoming by date
    const dayMap = new Map<string, IncomingDay>();
    for (const payment of upcoming) {
      const dateKey = payment.dueDate.split('T')[0];
      if (!dayMap.has(dateKey)) {
        const d = parseISO(dateKey);
        dayMap.set(dateKey, {
          date: dateKey,
          label: format(d, 'MMM dd (EEE)').toUpperCase(),
          payments: [],
          dayTotal: 0,
        });
      }
      const day = dayMap.get(dateKey)!;
      day.payments.push({ ...payment, orderProgress: getProgress(payment) });
      day.dayTotal += payment.amount;
    }

    const sortedDays = Array.from(dayMap.values()).sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    // Build overdue group
    let overdueGroup: IncomingDay | null = null;
    if (overduePayments.length > 0) {
      overdueGroup = {
        date: 'overdue',
        label: 'OVERDUE',
        payments: overduePayments.map((p) => ({ ...p, orderProgress: getProgress(p) })),
        dayTotal: overduePayments.reduce((sum, p) => sum + p.amount, 0),
      };
    }

    const overdueTotal = overduePayments.reduce((sum, p) => sum + p.amount, 0);
    const upcomingTotal = upcoming.reduce((sum, p) => sum + p.amount, 0);

    return {
      days: sortedDays,
      overdue: overdueGroup,
      grandTotal: upcomingTotal + overdueTotal,
      overdueTotal,
      paymentCount: upcoming.length + overduePayments.length,
    };
  }, [payments, days]);
}

/**
 * Risk cluster — a group of payments that fall close together
 */
export interface RiskCluster {
  startDate: string;
  endDate: string;
  payments: Payment[];
  totalAmount: number;
  daySpan: number;
}

/**
 * Detect risk clusters: groups of 2+ payments falling within windowDays of each other.
 */
export function useRiskClusters(windowDays: number = 3): RiskCluster[] {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const today = startOfDay(new Date());
    const lookahead = endOfDay(addDays(today, 30));

    // Get upcoming unpaid payments within 30 days
    const upcoming = payments
      .filter((p) => {
        if (p.status === 'paid') return false;
        const d = parseISO(p.dueDate);
        return !isBefore(d, today) && isWithinInterval(d, { start: today, end: lookahead });
      })
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    if (upcoming.length < 2) return [];

    // Sliding window clustering
    const clusters: RiskCluster[] = [];
    let i = 0;

    while (i < upcoming.length) {
      const clusterPayments = [upcoming[i]];
      const clusterStart = parseISO(upcoming[i].dueDate);
      let j = i + 1;

      while (j < upcoming.length) {
        const d = parseISO(upcoming[j].dueDate);
        if (differenceInDays(d, clusterStart) <= windowDays) {
          clusterPayments.push(upcoming[j]);
          j++;
        } else {
          break;
        }
      }

      if (clusterPayments.length >= 2) {
        const startDate = clusterPayments[0].dueDate.split('T')[0];
        const endDate = clusterPayments[clusterPayments.length - 1].dueDate.split('T')[0];
        clusters.push({
          startDate,
          endDate,
          payments: clusterPayments,
          totalAmount: clusterPayments.reduce((sum, p) => sum + p.amount, 0),
          daySpan: differenceInDays(parseISO(endDate), parseISO(startDate)),
        });
      }

      // Move past this cluster
      i = j > i + 1 ? j : i + 1;
    }

    return clusters;
  }, [payments, windowDays]);
}

// ─── Sprint 2: Paycheck Integration ──────────────────────────────────────────

/**
 * Generate paycheck dates within a date range.
 */
function generatePaydates(
  nextPayday: string,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(parseISO(nextPayday));

  // Walk backwards to find first paydate before rangeStart
  const stepBack = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
  while (isAfter(current, rangeStart)) {
    current = addDays(current, -stepBack);
  }
  // Now walk forward
  current = addDays(current, stepBack);

  while (!isAfter(current, rangeEnd)) {
    if (!isBefore(current, rangeStart)) {
      dates.push(new Date(current));
    }
    if (frequency === 'weekly') current = addWeeks(current, 1);
    else if (frequency === 'biweekly') current = addWeeks(current, 2);
    else current = addDays(current, 30); // approx monthly
  }
  return dates;
}

/**
 * Pay period breakdown — for each upcoming pay period, show income vs BNPL due.
 */
export interface PayPeriod {
  payDate: string; // ISO date
  payDateLabel: string; // "MAR 14 (FRI)"
  income: number; // cents
  bnplDue: number; // cents
  remaining: number; // income - bnplDue
  payments: Payment[];
}

export function usePayPeriodBreakdown(periodsAhead: number = 4): PayPeriod[] {
  const paycheckSettings = useBNPLStore((state) => state.paycheckSettings);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    if (!paycheckSettings) return [];

    const today = startOfDay(new Date());
    const lookahead = addDays(today, periodsAhead * 35); // generous lookahead

    const paydates = generatePaydates(
      paycheckSettings.nextPayday,
      paycheckSettings.frequency,
      today,
      lookahead
    ).slice(0, periodsAhead);

    if (paydates.length === 0) return [];

    // Get all unpaid payments
    const unpaid = payments.filter((p) => p.status !== 'paid');

    return paydates.map((payDate, i) => {
      const periodStart = i === 0 ? today : paydates[i - 1];
      const periodEnd = payDate;

      // Payments due in this period (between previous paydate and this one)
      const periodPayments = unpaid.filter((p) => {
        const d = startOfDay(parseISO(p.dueDate));
        return isAfter(d, periodStart) && !isAfter(d, periodEnd);
      });

      const bnplDue = periodPayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        payDate: payDate.toISOString(),
        payDateLabel: format(payDate, 'MMM dd (EEE)').toUpperCase(),
        income: paycheckSettings.amount,
        bnplDue,
        remaining: paycheckSettings.amount - bnplDue,
        payments: periodPayments,
      };
    });
  }, [paycheckSettings, payments, periodsAhead]);
}

/**
 * Safe to spend — paycheck minus BNPL due before next paycheck.
 */
export function useSafeToSpend(): {
  amount: number; // cents remaining
  nextPayday: string | null;
  bnplDueBeforePayday: number;
  income: number;
} {
  const paycheckSettings = useBNPLStore((state) => state.paycheckSettings);
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    if (!paycheckSettings) {
      return { amount: 0, nextPayday: null, bnplDueBeforePayday: 0, income: 0 };
    }

    const today = startOfDay(new Date());
    const lookahead = addDays(today, 60);
    const paydates = generatePaydates(
      paycheckSettings.nextPayday,
      paycheckSettings.frequency,
      today,
      lookahead
    );

    if (paydates.length < 2) {
      return { amount: paycheckSettings.amount, nextPayday: null, bnplDueBeforePayday: 0, income: paycheckSettings.amount };
    }

    const nextPayday = paydates[0];
    const followingPayday = paydates[1];

    // Payments due between now and following paydate (the current pay period)
    const unpaid = payments.filter((p) => {
      if (p.status === 'paid') return false;
      const d = startOfDay(parseISO(p.dueDate));
      return !isBefore(d, today) && isBefore(d, followingPayday);
    });

    const bnplDue = unpaid.reduce((sum, p) => sum + p.amount, 0);

    return {
      amount: paycheckSettings.amount - bnplDue,
      nextPayday: nextPayday.toISOString(),
      bnplDueBeforePayday: bnplDue,
      income: paycheckSettings.amount,
    };
  }, [paycheckSettings, payments]);
}

/**
 * Financial runway — total needed to cover next N days of payments.
 */
export function useFinancialRunway(days: number = 30): {
  totalNeeded: number;
  paymentCount: number;
  daysCount: number;
} {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const today = startOfDay(new Date());
    const end = endOfDay(addDays(today, days));

    const upcoming = payments.filter((p) => {
      if (p.status === 'paid') return false;
      const d = parseISO(p.dueDate);
      return !isBefore(d, today) && !isAfter(d, end);
    });

    return {
      totalNeeded: upcoming.reduce((sum, p) => sum + p.amount, 0),
      paymentCount: upcoming.length,
      daysCount: days,
    };
  }, [payments, days]);
}

/**
 * Savings impact — what % of income goes to BNPL per pay period.
 */
export function useSavingsImpact(): {
  currentPeriodPercent: number;
  averagePercent: number;
} {
  const payPeriods = usePayPeriodBreakdown(4);
  const paycheckSettings = useBNPLStore((state) => state.paycheckSettings);

  return useMemo(() => {
    if (!paycheckSettings || paycheckSettings.amount === 0 || payPeriods.length === 0) {
      return { currentPeriodPercent: 0, averagePercent: 0 };
    }

    const currentPeriodPercent = payPeriods[0]
      ? (payPeriods[0].bnplDue / paycheckSettings.amount) * 100
      : 0;

    const totalBnpl = payPeriods.reduce((sum, p) => sum + p.bnplDue, 0);
    const totalIncome = payPeriods.length * paycheckSettings.amount;
    const averagePercent = totalIncome > 0 ? (totalBnpl / totalIncome) * 100 : 0;

    return { currentPeriodPercent, averagePercent };
  }, [payPeriods, paycheckSettings]);
}

/**
 * Free credit alerts — platforms that recently had orders complete, freeing up credit.
 */
export interface FreeCreditAlert {
  platformId: PlatformId;
  platformName: string;
  platformColor: string;
  available: number; // cents
  percentage: number; // utilization %
}

export function useFreeCreditAlerts(): FreeCreditAlert[] {
  const platforms = useBNPLStore((state) => state.platforms);
  const utilizations = useAllPlatformUtilizations();

  return useMemo(() => {
    return utilizations
      .filter((u) => u.limit > 0 && u.percentage < 50) // Under 50% utilization = has free credit
      .map((u) => {
        const platform = platforms.find((p) => p.id === u.platformId);
        if (!platform) return null;
        return {
          platformId: u.platformId,
          platformName: platform.name,
          platformColor: platform.color,
          available: u.available,
          percentage: u.percentage,
        };
      })
      .filter((a): a is FreeCreditAlert => a !== null)
      .sort((a, b) => b.available - a.available);
  }, [platforms, utilizations]);
}

// ─── Sprint 3: Intelligence Features ──────────────────────────────────────────

/**
 * Post-payoff projection — what happens when each active order completes
 */
export interface PostPayoffProjection {
  orderId: string;
  storeName: string;
  platformId: PlatformId;
  platformName: string;
  platformColor: string;
  completionDate: string; // ISO date of last payment
  amountFreed: number; // cents remaining on order
  currentUtilization: number; // platform % now
  projectedUtilization: number; // platform % after payoff
  projectedAvailable: number; // cents available after payoff
}

export function usePostPayoffProjections(): PostPayoffProjection[] {
  const orders = useBNPLStore((state) => state.orders);
  const payments = useBNPLStore((state) => state.payments);
  const platforms = useBNPLStore((state) => state.platforms);

  return useMemo(() => {
    const activeOrders = orders.filter((o) => o.status === 'active');

    return activeOrders
      .map((order) => {
        const platform = platforms.find((p) => p.id === order.platformId);
        if (!platform || platform.creditLimit === 0) return null;

        const orderPayments = payments.filter((p) => p.orderId === order.id);
        const unpaidAmount = orderPayments
          .filter((p) => p.status !== 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        if (unpaidAmount === 0) return null;

        // Last unpaid payment due date = completion date
        const lastDueDate = orderPayments
          .filter((p) => p.status !== 'paid')
          .sort((a, b) => parseISO(b.dueDate).getTime() - parseISO(a.dueDate).getTime())[0]
          ?.dueDate;

        if (!lastDueDate) return null;

        // Current platform utilization
        const platformUsed = payments
          .filter((p) => p.platformId === order.platformId && p.status !== 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        const currentUtil = (platformUsed / platform.creditLimit) * 100;
        const projectedUsed = platformUsed - unpaidAmount;
        const projectedUtil = (projectedUsed / platform.creditLimit) * 100;

        return {
          orderId: order.id,
          storeName: order.storeName || 'Unknown',
          platformId: order.platformId,
          platformName: platform.name,
          platformColor: platform.color,
          completionDate: lastDueDate.split('T')[0],
          amountFreed: unpaidAmount,
          currentUtilization: Math.round(currentUtil),
          projectedUtilization: Math.round(Math.max(0, projectedUtil)),
          projectedAvailable: platform.creditLimit - projectedUsed,
        };
      })
      .filter((p): p is PostPayoffProjection => p !== null)
      .sort((a, b) => parseISO(a.completionDate).getTime() - parseISO(b.completionDate).getTime());
  }, [orders, payments, platforms]);
}

/**
 * Computed notification — aggregated alerts from all sources
 */
export type NotificationType = 'overdue' | 'risk_cluster' | 'free_credit' | 'streak' | 'due_today' | 'high_utilization';

export interface ComputedNotification {
  id: string;
  type: NotificationType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  platformColor?: string;
  orderId?: string;
}

export function useComputedNotifications(): ComputedNotification[] {
  const overduePayments = useOverduePayments();
  const riskClusters = useRiskClusters(3);
  const freeCreditAlerts = useFreeCreditAlerts();
  const onTimeStreak = useOnTimeStreak();
  const incoming = useIncomingPayments(1);
  const creditUtil = useOverallCreditUtilization();
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);

  return useMemo(() => {
    const notifications: ComputedNotification[] = [];

    // 1. Overdue payments (critical)
    for (const payment of overduePayments) {
      const platform = platforms.find((p) => p.id === payment.platformId);
      const order = orders.find((o) => o.id === payment.orderId);
      notifications.push({
        id: `overdue-${payment.id}`,
        type: 'overdue',
        severity: 'critical',
        title: 'OVERDUE PAYMENT',
        message: `${formatCurrency(payment.amount)} on ${platform?.name || 'Unknown'}${order?.storeName ? ` — ${order.storeName}` : ''}`,
        platformColor: platform?.color,
        orderId: payment.orderId,
      });
    }

    // 2. Payments due today (warning)
    if (incoming.days.length > 0) {
      const todayKey = new Date().toISOString().split('T')[0];
      const todayGroup = incoming.days.find((d) => d.date === todayKey);
      if (todayGroup) {
        for (const p of todayGroup.payments) {
          const platform = platforms.find((pl) => pl.id === p.platformId);
          notifications.push({
            id: `today-${p.id}`,
            type: 'due_today',
            severity: 'warning',
            title: 'DUE TODAY',
            message: `${formatCurrency(p.amount)} on ${platform?.name || 'Unknown'}`,
            platformColor: platform?.color,
            orderId: p.orderId,
          });
        }
      }
    }

    // 3. Risk clusters (warning)
    for (const cluster of riskClusters) {
      notifications.push({
        id: `cluster-${cluster.startDate}`,
        type: 'risk_cluster',
        severity: 'warning',
        title: 'RISK CLUSTER',
        message: `${cluster.payments.length} payments totaling ${formatCurrency(cluster.totalAmount)} in ${cluster.daySpan === 0 ? 'same day' : `${cluster.daySpan}D window`}`,
      });
    }

    // 4. High utilization (warning if >= 80%)
    if (creditUtil.percentage >= 80) {
      notifications.push({
        id: 'high-util',
        type: 'high_utilization',
        severity: 'warning',
        title: 'HIGH UTILIZATION',
        message: `Overall credit utilization at ${Math.round(creditUtil.percentage)}%`,
      });
    }

    // 5. Streak milestones (info)
    if ([5, 10, 25, 50, 100].includes(onTimeStreak)) {
      notifications.push({
        id: `streak-${onTimeStreak}`,
        type: 'streak',
        severity: 'info',
        title: 'STREAK MILESTONE',
        message: `${onTimeStreak} consecutive on-time payments`,
      });
    }

    // 6. Free credit (info) — only very low utilization (<30%)
    for (const alert of freeCreditAlerts) {
      if (alert.percentage < 30) {
        notifications.push({
          id: `free-${alert.platformId}`,
          type: 'free_credit',
          severity: 'info',
          title: 'FREE CREDIT',
          message: `${alert.platformName}: ${formatCurrency(alert.available)} available (${Math.round(100 - alert.percentage)}% free)`,
          platformColor: alert.platformColor,
        });
      }
    }

    return notifications;
  }, [overduePayments, riskClusters, freeCreditAlerts, onTimeStreak, incoming, creditUtil, platforms, orders]);
}

/**
 * Monthly spending trend (last 6 months)
 */
export function useMonthlySpending(): { month: string; label: string; total: number; paid: number }[] {
  const payments = useBNPLStore((state) => state.payments);

  return useMemo(() => {
    const now = new Date();
    const months: { month: string; label: string; total: number; paid: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const monthKey = format(d, 'yyyy-MM');
      const label = format(d, 'MMM').toUpperCase();

      const monthPayments = payments.filter((p) => {
        const due = parseISO(p.dueDate);
        return isWithinInterval(due, { start: mStart, end: mEnd });
      });

      const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const paid = monthPayments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      months.push({ month: monthKey, label, total, paid });
    }

    return months;
  }, [payments]);
}

/**
 * Timeline/Gantt data for active orders
 */
export function useTimelineData() {
  const orders = useBNPLStore((state) => state.orders);
  const payments = useBNPLStore((state) => state.payments);
  const platforms = useBNPLStore((state) => state.platforms);

  return useMemo(() => {
    const activeOrders = orders.filter((o) => o.status === 'active');

    if (activeOrders.length === 0) return null;

    const rows = activeOrders
      .map((order) => {
        const orderPayments = payments
          .filter((p) => p.orderId === order.id)
          .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
        const platform = platforms.find((p) => p.id === order.platformId);

        return {
          orderId: order.id,
          storeName: order.storeName || '—',
          platformName: platform?.name || '',
          platformColor: platform?.color || '#888',
          totalAmount: order.totalAmount,
          payments: orderPayments,
        };
      })
      .filter((r) => r.payments.length > 0);

    if (rows.length === 0) return null;

    const allTimes = rows.flatMap((r) => r.payments.map((p) => parseISO(p.dueDate).getTime()));
    const today = startOfDay(new Date());
    allTimes.push(today.getTime());

    const rangeStart = addDays(new Date(Math.min(...allTimes)), -7);
    const rangeEnd = addDays(new Date(Math.max(...allTimes)), 14);
    const totalDays = Math.max(differenceInDays(rangeEnd, rangeStart), 1);

    const todayOffset = (differenceInDays(today, rangeStart) / totalDays) * 100;

    return { rows, rangeStart, totalDays, todayOffset };
  }, [orders, payments, platforms]);
}

/**
 * Payoff strategy — snowball (smallest balance first) vs avalanche (highest utilization first)
 */
export interface PayoffStep {
  orderId: string;
  storeName: string;
  platformName: string;
  platformColor: string;
  remainingBalance: number;
  platformUtilAfter: number;
  creditFreed: number;
}

export function usePayoffStrategies(): { snowball: PayoffStep[]; avalanche: PayoffStep[] } {
  const orders = useBNPLStore((state) => state.orders);
  const payments = useBNPLStore((state) => state.payments);
  const platforms = useBNPLStore((state) => state.platforms);

  return useMemo(() => {
    const activeOrders = orders.filter((o) => o.status === 'active');

    const orderBalances = activeOrders.map((order) => {
      const remaining = payments
        .filter((p) => p.orderId === order.id && p.status !== 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      const platform = platforms.find((p) => p.id === order.platformId);
      const platformUsed = payments
        .filter((p) => p.platformId === order.platformId && p.status !== 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      const platformLimit = platform?.creditLimit || 0;
      const utilization = platformLimit > 0 ? (platformUsed / platformLimit) * 100 : 0;

      return {
        orderId: order.id,
        storeName: order.storeName || '—',
        platformName: platform?.name || '',
        platformColor: platform?.color || '#888',
        platformId: order.platformId,
        remainingBalance: remaining,
        platformLimit,
        platformUsed,
        utilization,
      };
    }).filter((o) => o.remainingBalance > 0);

    const buildSteps = (sorted: typeof orderBalances): PayoffStep[] => {
      let usedByPlatform: Record<string, number> = {};
      for (const o of orderBalances) {
        usedByPlatform[o.platformId] = o.platformUsed;
      }

      return sorted.map((o) => {
        const freed = o.remainingBalance;
        usedByPlatform[o.platformId] = (usedByPlatform[o.platformId] || 0) - freed;
        const newUsed = Math.max(0, usedByPlatform[o.platformId]);
        const utilAfter = o.platformLimit > 0 ? (newUsed / o.platformLimit) * 100 : 0;

        return {
          orderId: o.orderId,
          storeName: o.storeName,
          platformName: o.platformName,
          platformColor: o.platformColor,
          remainingBalance: o.remainingBalance,
          platformUtilAfter: Math.round(utilAfter),
          creditFreed: freed,
        };
      });
    };

    const snowball = buildSteps([...orderBalances].sort((a, b) => a.remainingBalance - b.remainingBalance));
    const avalanche = buildSteps([...orderBalances].sort((a, b) => b.utilization - a.utilization));

    return { snowball, avalanche };
  }, [orders, payments, platforms]);
}
