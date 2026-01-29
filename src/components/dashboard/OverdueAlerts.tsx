import { useState } from 'react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { PlatformIcon } from '../shared/PlatformIcon';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { useOverduePayments, useOrder } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { useLiveTime, formatRelativeTime } from '../../hooks/useRelativeTime';

function OverdueItem({
  payment,
  now,
}: {
  payment: ReturnType<typeof useOverduePayments>[0];
  now: Date;
}) {
  const { showToast } = useToast();
  const order = useOrder(payment.orderId);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const platforms = useBNPLStore((state) => state.platforms);

  const [isMarking, setIsMarking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const platform = platforms.find((p) => p.id === payment.platformId);
  const relativeTime = formatRelativeTime(payment.dueDate, now);

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarking(true);
    try {
      await markPaymentPaid(payment.id);
      setShowSuccess(true);
      showToast('Payment marked as paid', 'success');
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
      className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors animate-subtle-pulse"
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
          <div className="text-sm">
            {order?.storeName && (
              <span className="text-gray-400">{order.storeName} · </span>
            )}
            <span className="text-red-400 font-medium">
              {relativeTime.text}
            </span>
          </div>
        </div>
      </div>
      <Button variant="danger" size="sm" onClick={handleMarkPaid} disabled={isMarking || showSuccess}>
        {showSuccess ? (
          <span className="animate-success-bounce">Paid!</span>
        ) : isMarking ? (
          'Marking...'
        ) : (
          'Mark Paid'
        )}
      </Button>
    </div>
  );
}

export function OverdueAlerts() {
  const overduePayments = useOverduePayments();
  // Update every minute to keep times fresh
  const now = useLiveTime(60000);

  if (overduePayments.length === 0) {
    return null;
  }

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className="border-red-500/50 bg-red-500/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Overdue Payments
          </h2>
          <p className="text-sm text-red-400">
            {overduePayments.length} payment{overduePayments.length !== 1 ? 's' : ''} totaling{' '}
            {formatCurrency(totalOverdue)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {overduePayments.map((payment) => (
          <OverdueItem key={payment.id} payment={payment} now={now} />
        ))}
      </div>
    </Card>
  );
}
