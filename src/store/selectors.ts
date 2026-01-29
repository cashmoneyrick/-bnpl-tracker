import { useMemo } from 'react';
import {
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
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
} from '../types';

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
