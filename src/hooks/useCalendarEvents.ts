import { useMemo } from 'react';
import { useBNPLStore } from '../store';
import { PLATFORM_COLORS, DEFAULT_PLATFORMS } from '../constants/platforms';
import type { UnifiedCalendarEvent } from '../types/calendar';

/**
 * Merges personal calendar events with BNPL payment events
 * into a single unified list for calendar display.
 */
export function useCalendarEvents(): UnifiedCalendarEvent[] {
  const orders = useBNPLStore((s) => s.orders);
  const payments = useBNPLStore((s) => s.payments);
  const calendarEvents = useBNPLStore((s) => s.calendarEvents);

  return useMemo(() => {
    const unified: UnifiedCalendarEvent[] = [];

    // 1. Add personal calendar events
    for (const event of calendarEvents) {
      unified.push({ type: 'personal', event });
    }

    // 2. Add BNPL payment events
    // Pre-compute order lookup and installment counts
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const installmentCounts = new Map<string, number>();
    for (const p of payments) {
      installmentCounts.set(p.orderId, (installmentCounts.get(p.orderId) || 0) + 1);
    }

    for (const payment of payments) {
      const order = orderMap.get(payment.orderId);
      if (!order) continue;

      const platform = DEFAULT_PLATFORMS.find((p) => p.id === payment.platformId);
      const storeName = order.storeName || platform?.name || 'BNPL Order';

      unified.push({
        type: 'payment',
        paymentId: payment.id,
        orderId: payment.orderId,
        platformId: payment.platformId,
        storeName,
        amount: payment.amount,
        dueDate: payment.dueDate,
        installmentNumber: payment.installmentNumber,
        totalInstallments: installmentCounts.get(payment.orderId) || 1,
        status: payment.status,
        platformColor: PLATFORM_COLORS[payment.platformId] || '#6b7280',
      });
    }

    return unified;
  }, [orders, payments, calendarEvents]);
}

/**
 * Get events for a specific date (YYYY-MM-DD comparison)
 */
export function getEventsForDate(events: UnifiedCalendarEvent[], date: Date): UnifiedCalendarEvent[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  return events.filter((e) => {
    if (e.type === 'personal') {
      const start = new Date(e.event.startTime);
      return start.getFullYear() === y && start.getMonth() === m && start.getDate() === d;
    } else {
      const due = new Date(e.dueDate);
      return due.getFullYear() === y && due.getMonth() === m && due.getDate() === d;
    }
  });
}

/**
 * Get events for a specific date and hour
 */
export function getEventsForDateAndHour(events: UnifiedCalendarEvent[], date: Date, hour: number): UnifiedCalendarEvent[] {
  const dayEvents = getEventsForDate(events, date);
  return dayEvents.filter((e) => {
    if (e.type === 'personal') {
      return new Date(e.event.startTime).getHours() === hour;
    }
    // BNPL payments don't have a specific hour; show them at 9am
    return hour === 9;
  });
}
