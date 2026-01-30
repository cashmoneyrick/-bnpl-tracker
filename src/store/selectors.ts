import { useMemo } from 'react';
import {
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  subMonths,
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
