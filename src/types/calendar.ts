import type { PlatformId } from './index';

// Personal calendar events (user-created)
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  color: CalendarColor;
  category?: CalendarCategory;
  tags?: CalendarTag[];
}

export type CalendarColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'red';
export type CalendarCategory = 'Meeting' | 'Task' | 'Reminder' | 'Personal';
export type CalendarTag = 'Important' | 'Urgent' | 'Work' | 'Personal' | 'Team' | 'Client';

export const CALENDAR_COLORS: { name: string; value: CalendarColor; hex: string }[] = [
  { name: 'Blue', value: 'blue', hex: '#3b82f6' },
  { name: 'Green', value: 'green', hex: '#22c55e' },
  { name: 'Purple', value: 'purple', hex: '#a855f7' },
  { name: 'Orange', value: 'orange', hex: '#f97316' },
  { name: 'Pink', value: 'pink', hex: '#ec4899' },
  { name: 'Red', value: 'red', hex: '#ef4444' },
];

export const CALENDAR_CATEGORIES: CalendarCategory[] = ['Meeting', 'Task', 'Reminder', 'Personal'];
export const CALENDAR_TAGS: CalendarTag[] = ['Important', 'Urgent', 'Work', 'Personal', 'Team', 'Client'];

// Unified event type for calendar display
export type UnifiedCalendarEvent =
  | { type: 'personal'; event: CalendarEvent }
  | {
      type: 'payment';
      paymentId: string;
      orderId: string;
      platformId: PlatformId;
      storeName: string;
      amount: number; // cents
      dueDate: string; // ISO date
      installmentNumber: number;
      totalInstallments: number;
      status: 'pending' | 'paid' | 'overdue';
      platformColor: string; // hex
    };

export type CalendarViewType = 'month' | 'week' | 'day' | 'list';
