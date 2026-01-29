import { useState, useEffect, useMemo } from 'react';
import { parseISO, differenceInMinutes, differenceInHours, differenceInDays, isToday, isTomorrow, isPast, format } from 'date-fns';

interface RelativeTimeResult {
  text: string;
  isUrgent: boolean;
  isPast: boolean;
}

/**
 * Hook that returns a live-updating relative time string
 * Updates automatically at appropriate intervals based on how far away the date is
 */
export function useRelativeTime(dateString: string): RelativeTimeResult {
  const [now, setNow] = useState(() => new Date());

  const result = useMemo(() => {
    const date = parseISO(dateString);
    const diffMinutes = differenceInMinutes(date, now);
    const diffHours = differenceInHours(date, now);
    const diffDays = differenceInDays(date, now);
    const dateIsPast = isPast(date);

    let text: string;
    let isUrgent = false;

    if (dateIsPast) {
      // Past dates
      const absDiffMinutes = Math.abs(diffMinutes);
      const absDiffHours = Math.abs(diffHours);
      const absDiffDays = Math.abs(diffDays);

      if (absDiffMinutes < 60) {
        text = absDiffMinutes <= 1 ? 'just now' : `${absDiffMinutes}m ago`;
        isUrgent = true;
      } else if (absDiffHours < 24) {
        text = absDiffHours === 1 ? '1 hour ago' : `${absDiffHours} hours ago`;
        isUrgent = true;
      } else if (absDiffDays === 1) {
        text = 'yesterday';
        isUrgent = true;
      } else if (absDiffDays < 7) {
        text = `${absDiffDays} days ago`;
        isUrgent = true;
      } else {
        text = format(date, 'MMM d');
      }
    } else {
      // Future dates
      if (isToday(date)) {
        if (diffMinutes < 60) {
          text = diffMinutes <= 1 ? 'in a moment' : `in ${diffMinutes}m`;
          isUrgent = true;
        } else {
          text = diffHours === 1 ? 'in 1 hour' : `in ${diffHours} hours`;
          isUrgent = diffHours <= 3;
        }
      } else if (isTomorrow(date)) {
        text = 'tomorrow';
      } else if (diffDays < 7) {
        text = diffDays === 1 ? 'in 1 day' : `in ${diffDays} days`;
      } else {
        text = format(date, 'MMM d');
      }
    }

    return { text, isUrgent, isPast: dateIsPast };
  }, [dateString, now]);

  useEffect(() => {
    // Determine update interval based on how close the date is
    const date = parseISO(dateString);
    const diffMinutes = Math.abs(differenceInMinutes(date, now));

    let interval: number;
    if (diffMinutes < 60) {
      // Update every minute when within an hour
      interval = 60 * 1000;
    } else if (diffMinutes < 24 * 60) {
      // Update every 5 minutes when within a day
      interval = 5 * 60 * 1000;
    } else {
      // Update every hour otherwise
      interval = 60 * 60 * 1000;
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, interval);

    return () => clearInterval(timer);
  }, [dateString, now]);

  return result;
}

/**
 * Simpler hook that just triggers a re-render at regular intervals
 * Use when you have multiple dates and want them all to update together
 */
export function useLiveTime(intervalMs: number = 60000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

/**
 * Format a relative time string based on a date and current time
 * Use with useLiveTime() for live updates
 */
export function formatRelativeTime(dateString: string, now: Date = new Date()): RelativeTimeResult {
  const date = parseISO(dateString);
  const diffMinutes = differenceInMinutes(date, now);
  const diffHours = differenceInHours(date, now);
  const diffDays = differenceInDays(date, now);
  const dateIsPast = isPast(date);

  let text: string;
  let isUrgent = false;

  if (dateIsPast) {
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffMinutes < 60) {
      text = absDiffMinutes <= 1 ? 'just now' : `${absDiffMinutes}m ago`;
      isUrgent = true;
    } else if (absDiffHours < 24) {
      text = absDiffHours === 1 ? '1 hour ago' : `${absDiffHours}h ago`;
      isUrgent = true;
    } else if (absDiffDays === 1) {
      text = 'yesterday';
      isUrgent = true;
    } else if (absDiffDays < 7) {
      text = `${absDiffDays}d ago`;
      isUrgent = true;
    } else {
      text = format(date, 'MMM d');
    }
  } else {
    if (isToday(date)) {
      if (diffMinutes < 60) {
        text = diffMinutes <= 1 ? 'now' : `in ${diffMinutes}m`;
        isUrgent = true;
      } else {
        text = diffHours === 1 ? 'in 1h' : `in ${diffHours}h`;
        isUrgent = diffHours <= 3;
      }
    } else if (isTomorrow(date)) {
      text = 'tomorrow';
    } else if (diffDays < 7) {
      text = diffDays === 1 ? 'in 1 day' : `in ${diffDays} days`;
    } else {
      text = format(date, 'MMM d');
    }
  }

  return { text, isUrgent, isPast: dateIsPast };
}
