import { useState, useMemo } from 'react';
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
import { useBNPLStore } from '../../store';
import { formatCurrency } from '../../utils/currency';
import type { Payment } from '../../types';

export function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const payments = useBNPLStore((state) => state.payments);
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const markPaymentUnpaid = useBNPLStore((state) => state.markPaymentUnpaid);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);

  // Generate calendar days for full month
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
  const selectedPayments = useMemo(() => {
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
    <Card>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToday}
            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-dark-hover"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-dark-hover"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[10px] text-gray-500 font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayPayments = paymentsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const today = isToday(date);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(date)}
              className={`
                min-h-[48px] p-1 rounded text-left transition-colors
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${today ? 'bg-blue-500/20' : ''}
                ${isSelected ? 'ring-1 ring-blue-500' : today ? '' : 'hover:bg-dark-hover'}
              `}
            >
              <div
                className={`text-xs font-medium ${
                  today ? 'text-blue-400' : isCurrentMonth ? 'text-white' : 'text-gray-600'
                }`}
              >
                {format(date, 'd')}
              </div>

              {/* Payment indicators */}
              {dayPayments.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayPayments.slice(0, 2).map((payment) => {
                    const platform = platforms.find((p) => p.id === payment.platformId);
                    const isPaid = payment.status === 'paid';
                    const isOverdue = payment.status === 'overdue';

                    return (
                      <div
                        key={payment.id}
                        className={`flex items-center gap-1 ${isPaid ? 'opacity-50' : ''}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: isOverdue ? '#ef4444' : platform?.color || '#666',
                          }}
                        />
                        <span
                          className={`text-[9px] truncate ${
                            isPaid ? 'text-gray-500 line-through' : isOverdue ? 'text-red-400' : 'text-gray-400'
                          }`}
                        >
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    );
                  })}
                  {dayPayments.length > 2 && (
                    <span className="text-[9px] text-gray-500">+{dayPayments.length - 2}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail - INLINE */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">
              {format(selectedDate, 'EEEE, MMMM d')}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-white p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments due on this date</p>
          ) : (
            <div className="space-y-2">
              {selectedPayments.map((payment) => {
                const platform = platforms.find((p) => p.id === payment.platformId);
                const order = orders.find((o) => o.id === payment.orderId);
                const isPaid = payment.status === 'paid';
                const isOverdue = payment.status === 'overdue';

                return (
                  <div
                    key={payment.id}
                    onClick={() => order && openOrderDetailModal(order.id)}
                    className={`
                      flex items-center justify-between p-2 rounded-lg cursor-pointer
                      ${isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-dark-hover'}
                      ${isPaid ? 'opacity-60' : ''}
                      hover:ring-1 hover:ring-gray-600
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isOverdue ? '#ef4444' : platform?.color || '#666',
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isPaid ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {formatCurrency(payment.amount)}
                          </span>
                          <span className="text-xs text-gray-400">{platform?.name}</span>
                        </div>
                        {order?.storeName && (
                          <span className="text-xs text-gray-500 truncate block">{order.storeName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        isPaid ? markPaymentUnpaid(payment.id) : markPaymentPaid(payment.id);
                      }}
                      className={`
                        px-2 py-1 text-xs rounded flex-shrink-0 ml-2
                        ${isPaid
                          ? 'bg-dark-bg text-gray-400 hover:bg-dark-border'
                          : isOverdue
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }
                      `}
                    >
                      {isPaid ? 'Undo' : 'Paid'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
