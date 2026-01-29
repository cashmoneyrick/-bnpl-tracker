import { useState, useMemo, useRef } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
} from 'date-fns';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useBNPLStore } from '../../store';
import { formatCurrency } from '../../utils/currency';
import { formatMonthYear } from '../../utils/date';
import type { Payment } from '../../types';

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  payments: Payment[];
  isSelected: boolean;
  onClick: () => void;
}

function CalendarDay({
  date,
  isCurrentMonth,
  payments,
  isSelected,
  onClick,
}: CalendarDayProps) {
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const today = isToday(date);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate daily total (excluding paid)
  const dailyTotal = payments
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Color coding based on amount thresholds (in cents)
  // Green: < $30 ($3000 cents), Yellow: $30-100, Red: > $100
  const getAmountColor = () => {
    if (dailyTotal === 0) return '';
    if (dailyTotal < 3000) return 'bg-green-500/10';
    if (dailyTotal < 10000) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => payments.length > 0 && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-full min-h-[80px] p-2 text-left border border-dark-border rounded-lg transition-colors
          ${!isCurrentMonth ? 'opacity-40' : ''}
          ${isSelected ? 'bg-blue-500/20 border-blue-500' : `hover:bg-dark-hover ${getAmountColor()}`}
          ${today && !isSelected ? 'border-blue-500/50' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span
            className={`
              text-sm font-medium
              ${today ? 'text-blue-400' : isCurrentMonth ? 'text-white' : 'text-gray-600'}
            `}
          >
            {format(date, 'd')}
          </span>
          {dailyTotal > 0 && (
            <span className={`text-xs font-medium ${
              dailyTotal < 3000 ? 'text-green-400' :
              dailyTotal < 10000 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {formatCurrency(dailyTotal)}
            </span>
          )}
        </div>

        {/* Payment list */}
        {payments.length > 0 && (
          <div className="mt-2 space-y-1">
            {/* Show up to 3 payment indicators */}
            {payments.slice(0, 3).map((payment) => {
              const platform = platforms.find((p) => p.id === payment.platformId);
              const isOverdue = payment.status === 'overdue';
              const isPaid = payment.status === 'paid';

              return (
                <div
                  key={payment.id}
                  className={`
                    flex items-center gap-1.5 text-xs truncate
                    ${isPaid ? 'opacity-50' : ''}
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isOverdue
                        ? '#ef4444'
                        : platform?.color || '#666',
                    }}
                  />
                  <span
                    className={`truncate ${
                      isOverdue ? 'text-red-400' : isPaid ? 'text-gray-500 line-through' : 'text-gray-400'
                    }`}
                  >
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              );
            })}
            {payments.length > 3 && (
              <span className="text-xs text-gray-500">
                +{payments.length - 3} more
              </span>
            )}
          </div>
        )}
      </button>

      {/* Hover Tooltip */}
      {showTooltip && payments.length > 0 && (
        <div
          ref={tooltipRef}
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-48 bg-dark-card border border-dark-border rounded-lg shadow-lg p-3 animate-scale-in"
        >
          <div className="text-xs text-gray-400 mb-2">
            {format(date, 'MMM d')} - {payments.length} payment{payments.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1.5">
            {payments.slice(0, 5).map((payment) => {
              const platform = platforms.find((p) => p.id === payment.platformId);
              const order = orders.find((o) => o.id === payment.orderId);
              const isPaid = payment.status === 'paid';
              const isOverdue = payment.status === 'overdue';

              return (
                <div key={payment.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isOverdue ? '#ef4444' : platform?.color || '#666' }}
                    />
                    <span className={`truncate ${isPaid ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {order?.storeName || platform?.name}
                    </span>
                  </div>
                  <span className={`ml-2 font-medium ${
                    isPaid ? 'text-gray-500' : isOverdue ? 'text-red-400' : 'text-white'
                  }`}>
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              );
            })}
            {payments.length > 5 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{payments.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PaymentDetailProps {
  date: Date;
  payments: Payment[];
  onClose: () => void;
}

function PaymentDetail({ date, payments, onClose }: PaymentDetailProps) {
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const markPaymentUnpaid = useBNPLStore((state) => state.markPaymentUnpaid);

  if (payments.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {format(date, 'EEEE, MMMM d')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-gray-500">No payments due on this date</p>
      </Card>
    );
  }

  const totalDue = payments
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {format(date, 'EEEE, MMMM d')}
          </h3>
          {totalDue > 0 && (
            <p className="text-sm text-gray-400">
              {formatCurrency(totalDue)} due
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {payments.map((payment) => {
          const platform = platforms.find((p) => p.id === payment.platformId);
          const order = orders.find((o) => o.id === payment.orderId);
          const isOverdue = payment.status === 'overdue';
          const isPaid = payment.status === 'paid';

          return (
            <div
              key={payment.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-dark-hover'}
                ${isPaid ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: isOverdue
                      ? '#ef4444'
                      : platform?.color || '#666',
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isPaid ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {formatCurrency(payment.amount)}
                    </span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-400 text-sm">
                      {platform?.name}
                    </span>
                  </div>
                  {order?.storeName && (
                    <span className="text-sm text-gray-500">
                      {order.storeName}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={isPaid ? 'secondary' : isOverdue ? 'danger' : 'ghost'}
                size="sm"
                onClick={() =>
                  isPaid
                    ? markPaymentUnpaid(payment.id)
                    : markPaymentPaid(payment.id)
                }
              >
                {isPaid ? 'Undo' : 'Paid'}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const payments = useBNPLStore((state) => state.payments);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Map payments to dates
  const paymentsByDate = useMemo(() => {
    const map = new Map<string, Payment[]>();

    for (const payment of payments) {
      const dateKey = format(parseISO(payment.dueDate), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, payment]);
    }

    return map;
  }, [payments]);

  // Get payments for selected date
  const selectedDatePayments = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return paymentsByDate.get(dateKey) || [];
  }, [selectedDate, paymentsByDate]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-3">
        <Card padding="lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {formatMonthYear(currentMonth)}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const dayPayments = paymentsByDate.get(dateKey) || [];

              return (
                <CalendarDay
                  key={dateKey}
                  date={date}
                  isCurrentMonth={isSameMonth(date, currentMonth)}
                  payments={dayPayments}
                  isSelected={selectedDate ? isSameDay(date, selectedDate) : false}
                  onClick={() => setSelectedDate(date)}
                />
              );
            })}
          </div>
        </Card>
      </div>

      {/* Selected Date Detail */}
      <div>
        {selectedDate ? (
          <PaymentDetail
            date={selectedDate}
            payments={selectedDatePayments}
            onClose={() => setSelectedDate(null)}
          />
        ) : (
          <Card>
            <div className="text-center py-6">
              <svg
                className="w-8 h-8 text-gray-600 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-gray-500">Select a date to view payments</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
