import { useState, useMemo } from 'react';
import { parseISO, format, isToday, isTomorrow, startOfDay } from 'date-fns';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { PlatformIcon } from '../shared/PlatformIcon';
import { InstallmentDots } from '../shared/InstallmentDots';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { useUpcomingPayments, useOrder, useOrderProgress } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import type { Payment } from '../../types';

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

function PaymentItem({ payment, isLast }: { payment: Payment; isLast: boolean }) {
  const { showToast } = useToast();
  const order = useOrder(payment.orderId);
  const progress = useOrderProgress(payment.orderId);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const platforms = useBNPLStore((state) => state.platforms);

  const [isMarking, setIsMarking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const platform = platforms.find((p) => p.id === payment.platformId);
  const dateLabel = getDateLabel(payment.dueDate);
  const isTodayPayment = dateLabel === 'Today';

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarking(true);
    try {
      await markPaymentPaid(payment.id);
      setShowSuccess(true);
      showToast(`Payment marked as paid`, 'success');
    } catch {
      showToast('Failed to mark payment', 'error');
    } finally {
      setIsMarking(false);
    }
  };

  const handleRowClick = () => {
    openOrderDetailModal(payment.orderId);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`
        flex items-center justify-between p-3 cursor-pointer transition-colors
        ${isTodayPayment ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-dark-hover/50'}
        ${!isLast ? 'border-b border-dark-border/50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <PlatformIcon
          platformId={payment.platformId}
          size="sm"
          style={{ color: platform?.color || '#666' }}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {formatCurrency(payment.amount)}
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400 text-sm">{platform?.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {order?.storeName && (
              <span className="text-sm text-gray-500">{order.storeName}</span>
            )}
            {progress.total > 1 && (
              <>
                {order?.storeName && <span className="text-gray-600">·</span>}
                <div className="flex items-center gap-1.5">
                  <InstallmentDots total={progress.total} paid={progress.paid} size="sm" />
                  <span className="text-xs text-gray-500">{progress.paid}/{progress.total}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleMarkPaid} disabled={isMarking || showSuccess}>
        {showSuccess ? (
          <div className="animate-success-bounce">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path className="animate-checkmark" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : isMarking ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 transition-transform hover:scale-110 active:scale-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </Button>
    </div>
  );
}

interface PaymentGroup {
  date: string;
  label: string;
  payments: Payment[];
  total: number;
  isToday: boolean;
  isTomorrow: boolean;
}

export function UpcomingPayments() {
  const upcomingPayments = useUpcomingPayments(7);

  // Group payments by day
  const groupedPayments = useMemo(() => {
    const groups: Record<string, PaymentGroup> = {};

    upcomingPayments.forEach((payment) => {
      const dateKey = startOfDay(parseISO(payment.dueDate)).toISOString();

      if (!groups[dateKey]) {
        const date = parseISO(payment.dueDate);
        groups[dateKey] = {
          date: dateKey,
          label: getDateLabel(payment.dueDate),
          payments: [],
          total: 0,
          isToday: isToday(date),
          isTomorrow: isTomorrow(date),
        };
      }

      groups[dateKey].payments.push(payment);
      groups[dateKey].total += payment.amount;
    });

    return Object.values(groups).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [upcomingPayments]);

  const totalAmount = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card padding="none">
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <h2 className="text-lg font-semibold text-white">Upcoming Payments</h2>
        <div className="text-right">
          <span className="text-sm text-gray-400">Next 7 days</span>
          {totalAmount > 0 && (
            <div className="text-sm font-medium text-white">{formatCurrency(totalAmount)}</div>
          )}
        </div>
      </div>

      {upcomingPayments.length === 0 ? (
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
          <p className="text-sm text-gray-500">No payments due in the next 7 days</p>
        </div>
      ) : (
        <div>
          {groupedPayments.map((group, groupIndex) => (
            <div key={group.date}>
              {/* Day Header */}
              <div
                className={`
                  flex items-center justify-between px-4 py-2
                  ${group.isToday ? 'bg-blue-500/10' : 'bg-dark-hover/30'}
                  ${groupIndex > 0 ? 'border-t border-dark-border' : ''}
                `}
              >
                <span
                  className={`text-sm font-medium ${
                    group.isToday
                      ? 'text-blue-400'
                      : group.isTomorrow
                      ? 'text-amber-400'
                      : 'text-gray-400'
                  }`}
                >
                  {group.label}
                </span>
                <span className="text-sm text-gray-500">
                  {group.payments.length} payment{group.payments.length > 1 ? 's' : ''} · {formatCurrency(group.total)}
                </span>
              </div>

              {/* Payments in this day */}
              <div>
                {group.payments.map((payment, index) => (
                  <PaymentItem
                    key={payment.id}
                    payment={payment}
                    isLast={index === group.payments.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
