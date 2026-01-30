import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseISO, addDays, isSameDay } from 'date-fns';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { PlatformIcon } from '../shared/PlatformIcon';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { useUpcomingPayments } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import type { Payment } from '../../types';

interface CalendarDay {
  day: number;
  date: Date;
  payments: Payment[];
  total: number;
  isToday: boolean;
}

function getAmountColor(amount: number): string {
  if (amount === 0) return '';
  if (amount < 2500) return 'bg-green-500/20 text-green-400'; // < $25
  if (amount < 5000) return 'bg-yellow-500/20 text-yellow-400'; // $25-50
  return 'bg-red-500/20 text-red-400'; // > $50
}

function PaymentPopup({
  payments,
  onClose,
  onPaymentClick,
}: {
  payments: Payment[];
  onClose: () => void;
  onPaymentClick: (orderId: string) => void;
}) {
  const platforms = useBNPLStore((state) => state.platforms);
  const { showToast } = useToast();
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const handleMarkPaid = async (e: React.MouseEvent, paymentId: string) => {
    e.stopPropagation();
    setMarkingId(paymentId);
    try {
      await markPaymentPaid(paymentId);
      showToast('Payment marked as paid', 'success');
    } catch {
      showToast('Failed to mark payment', 'error');
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-dark-border">
          <h3 className="text-sm font-semibold text-white">
            {payments.length} Payment{payments.length > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {payments.map((payment, index) => {
            const platform = platforms.find((p) => p.id === payment.platformId);
            return (
              <div
                key={payment.id}
                onClick={() => onPaymentClick(payment.orderId)}
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-dark-hover/50 ${
                  index < payments.length - 1 ? 'border-b border-dark-border/50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <PlatformIcon
                    platformId={payment.platformId}
                    size="sm"
                    style={{ color: platform?.color || '#666' }}
                  />
                  <div>
                    <span className="text-white font-medium text-sm">
                      {formatCurrency(payment.amount)}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">{platform?.name}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleMarkPaid(e, payment.id)}
                  disabled={markingId === payment.id}
                >
                  {markingId === payment.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function UpcomingPayments() {
  const navigate = useNavigate();
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  // Get all payments for the remaining month (use 31 days to cover full month)
  const upcomingPayments = useUpcomingPayments(31);

  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Calculate next 30 days
  const calendarDays = useMemo(() => {
    const today = new Date();
    const days: CalendarDay[] = [];

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dayPayments = upcomingPayments.filter((p) =>
        isSameDay(parseISO(p.dueDate), date)
      );
      const total = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      days.push({
        day: date.getDate(),
        date,
        payments: dayPayments,
        total,
        isToday: i === 0,
      });
    }
    return days;
  }, [upcomingPayments]);

  // Total for remaining days
  const remainingTotal = useMemo(
    () => calendarDays.reduce((sum, d) => sum + d.total, 0),
    [calendarDays]
  );

  const handleDayClick = (dayData: CalendarDay) => {
    if (dayData.payments.length === 1) {
      openOrderDetailModal(dayData.payments[0].orderId);
    } else if (dayData.payments.length > 1) {
      setSelectedDay(dayData);
    }
  };

  const handlePaymentClick = (orderId: string) => {
    setSelectedDay(null);
    openOrderDetailModal(orderId);
  };

  return (
    <Card padding="none">
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <h2 className="text-lg font-semibold text-white">Upcoming Payments</h2>
        <div className="text-right">
          <span className="text-sm text-gray-400">Next 30 days</span>
          {remainingTotal > 0 && (
            <div className="text-sm font-medium text-white">{formatCurrency(remainingTotal)}</div>
          )}
        </div>
      </div>

      {calendarDays.length === 0 || remainingTotal === 0 ? (
        <div className="text-center py-8 px-4">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">No payments due in the next 30 days</p>
        </div>
      ) : (
        <div className="p-4">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, index) => (
              <button
                key={index}
                onClick={() => dayData.payments.length > 0 && handleDayClick(dayData)}
                disabled={dayData.payments.length === 0}
                className={`
                  p-2 rounded text-center text-xs min-h-[52px] flex flex-col items-center justify-center
                  ${dayData.isToday ? 'ring-2 ring-blue-500' : ''}
                  ${dayData.payments.length > 0 ? getAmountColor(dayData.total) : 'text-gray-600'}
                  ${dayData.payments.length > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                `}
              >
                <div className="font-medium">{dayData.day}</div>
                {dayData.total > 0 && (
                  <div className="text-[10px] mt-0.5 truncate w-full">
                    {formatCurrency(dayData.total)}
                  </div>
                )}
                {dayData.payments.length > 1 && (
                  <div className="text-[9px] opacity-70 mt-0.5">
                    {dayData.payments.length} due
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* View Full Calendar Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/calendar')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Full Calendar →
            </button>
          </div>
        </div>
      )}

      {/* Payment Popup for days with multiple payments */}
      {selectedDay && (
        <PaymentPopup
          payments={selectedDay.payments}
          onClose={() => setSelectedDay(null)}
          onPaymentClick={handlePaymentClick}
        />
      )}
    </Card>
  );
}
