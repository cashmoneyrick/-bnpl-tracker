import { parseISO, startOfDay, differenceInDays } from 'date-fns';
import type { Payment, NotificationSettings } from '../types';
import { formatCurrency } from '../utils/currency';

// Track which notifications have been shown (to avoid duplicates within a session)
const shownNotifications = new Set<string>();

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a browser notification
 */
export function showNotification(title: string, body: string, tag?: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  // Use tag to prevent duplicate notifications
  const notificationId = tag || `${title}-${body}`;
  if (shownNotifications.has(notificationId)) {
    return;
  }
  shownNotifications.add(notificationId);

  new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: notificationId,
  });
}

/**
 * Check payments and show notifications based on settings
 */
export function checkPaymentsAndNotify(
  payments: Payment[],
  settings: NotificationSettings,
  platformNames: Record<string, string>
): void {
  if (!settings.enabled || Notification.permission !== 'granted') {
    return;
  }

  const today = startOfDay(new Date());
  const unpaidPayments = payments.filter((p) => p.status !== 'paid');

  for (const payment of unpaidPayments) {
    const dueDate = startOfDay(parseISO(payment.dueDate));
    const daysUntilDue = differenceInDays(dueDate, today);
    const platformName = platformNames[payment.platformId] || payment.platformId;
    const amount = formatCurrency(payment.amount);

    // Overdue notifications
    if (settings.notifyOverdue && daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      showNotification(
        'Overdue Payment',
        `${platformName} payment of ${amount} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        `overdue-${payment.id}`
      );
      continue;
    }

    // Due today notifications
    if (settings.notifyOnDueDate && daysUntilDue === 0) {
      showNotification(
        'Payment Due Today',
        `${platformName} payment of ${amount} is due today`,
        `due-today-${payment.id}`
      );
      continue;
    }

    // Upcoming notifications (daysBefore)
    if (daysUntilDue > 0 && daysUntilDue <= settings.daysBefore) {
      const dayText = daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;
      showNotification(
        'Upcoming Payment',
        `${platformName} payment of ${amount} is due ${dayText}`,
        `upcoming-${payment.id}-${daysUntilDue}`
      );
    }
  }
}

/**
 * Clear shown notifications tracking (e.g., on settings change)
 */
export function clearNotificationHistory(): void {
  shownNotifications.clear();
}

/**
 * Get default notification settings
 */
export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: false,
    daysBefore: 1,
    notifyOnDueDate: true,
    notifyOverdue: true,
  };
}
