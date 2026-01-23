import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isBefore,
  isAfter,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  subMonths,
  differenceInDays,
  differenceInMonths,
} from 'date-fns';

/**
 * Format a date for display (e.g., "Jan 15, 2025")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date with day of week (e.g., "Mon, Jan 15")
 */
export function formatDateWithDay(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE, MMM d');
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  // Handle invalid dates gracefully
  if (isNaN(d.getTime())) {
    return format(new Date(), 'yyyy-MM-dd');
  }
  return format(d, 'yyyy-MM-dd');
}

/**
 * Check if a date string is valid ISO format
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 10) return false;
  const d = parseISO(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Get relative date description (e.g., "Today", "Tomorrow", "3 days overdue")
 */
export function getRelativeDateDescription(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const today = startOfDay(new Date());

  if (isToday(d)) {
    return 'Today';
  }

  if (isTomorrow(d)) {
    return 'Tomorrow';
  }

  const daysDiff = differenceInDays(startOfDay(d), today);

  if (daysDiff < 0) {
    const daysOverdue = Math.abs(daysDiff);
    return `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
  }

  if (daysDiff <= 7) {
    return `In ${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
  }

  return formatDate(d);
}

/**
 * Check if a date is overdue (past the current day)
 */
export function isOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(startOfDay(d), startOfDay(new Date()));
}

/**
 * Check if a date is within a certain number of days from today
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const today = startOfDay(new Date());
  const futureDate = addDays(today, days);
  return isWithinInterval(startOfDay(d), { start: today, end: futureDate });
}

/**
 * Get start and end dates for a date range option
 */
export function getDateRangeBounds(
  option: 'this-month' | 'last-3-months' | 'last-6-months' | 'all-time'
): { start: Date; end: Date } | null {
  const now = new Date();
  const end = endOfDay(now);

  switch (option) {
    case 'this-month':
      return { start: startOfMonth(now), end };
    case 'last-3-months':
      return { start: startOfMonth(subMonths(now, 2)), end };
    case 'last-6-months':
      return { start: startOfMonth(subMonths(now, 5)), end };
    case 'all-time':
      return null; // No bounds
  }
}

/**
 * Calculate payment due dates based on first payment date and interval
 */
export function calculateDueDates(
  firstPaymentDate: Date,
  installments: number,
  intervalDays: number
): Date[] {
  return Array.from({ length: installments }, (_, i) =>
    addDays(firstPaymentDate, i * intervalDays)
  );
}

/**
 * Get month name and year (e.g., "January 2025")
 */
export function formatMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMMM yyyy');
}

/**
 * Parse ISO date string to Date object
 */
export { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, addMonths, subMonths, differenceInDays, differenceInMonths, isWithinInterval, isBefore, isAfter };
