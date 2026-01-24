import { useState } from 'react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { useUpcomingPayments, useOrder } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { getRelativeDateDescription } from '../../utils/date';

function PaymentItem({ payment }: { payment: ReturnType<typeof useUpcomingPayments>[0] }) {
  const { showToast } = useToast();
  const order = useOrder(payment.orderId);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const platforms = useBNPLStore((state) => state.platforms);

  const [isMarking, setIsMarking] = useState(false);

  const platform = platforms.find((p) => p.id === payment.platformId);
  const relativeDate = getRelativeDateDescription(payment.dueDate);
  const isToday = relativeDate === 'Today';
  const isTomorrow = relativeDate === 'Tomorrow';

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarking(true);
    try {
      await markPaymentPaid(payment.id);
      showToast(`Payment marked as paid`, 'success');
    } catch (error) {
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
        flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
        ${isToday ? 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20' : 'bg-dark-hover hover:bg-dark-hover/70'}
      `}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: platform?.color || '#666' }}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {formatCurrency(payment.amount)}
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400 text-sm">{platform?.name}</span>
          </div>
          <div className="text-sm text-gray-500">
            {order?.storeName && (
              <span className="text-gray-400">{order.storeName} · </span>
            )}
            <span
              className={
                isToday
                  ? 'text-blue-400 font-medium'
                  : isTomorrow
                  ? 'text-amber-400'
                  : ''
              }
            >
              {relativeDate}
            </span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleMarkPaid} disabled={isMarking}>
        {isMarking ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </Button>
    </div>
  );
}

export function UpcomingPayments() {
  const upcomingPayments = useUpcomingPayments(7);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Upcoming Payments
        </h2>
        <span className="text-sm text-gray-400">Next 7 days</span>
      </div>

      {upcomingPayments.length === 0 ? (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">No payments due in the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingPayments.map((payment) => (
            <PaymentItem key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </Card>
  );
}
