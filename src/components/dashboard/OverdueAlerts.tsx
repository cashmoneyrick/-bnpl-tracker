import { useState } from 'react';
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
      className="py-2.5 sm:py-1.5 px-3 sm:px-2 border-b border-terminal-red/20 last:border-0 cursor-pointer hover:bg-terminal-red/5 active:bg-terminal-red/10 transition-colors text-xs sm:text-2xs"
    >
      {/* Mobile: two-line layout */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-terminal-red animate-subtle-pulse" />
            <span className="text-white font-semibold">{formatCurrency(payment.amount)}</span>
            <span style={{ color: platform?.color }} className="uppercase">{platform?.name}</span>
          </div>
          <span className="text-terminal-red font-medium">{relativeTime.text}</span>
        </div>
        <div className="flex items-center justify-between pl-4">
          {order?.storeName && <span className="text-terminal-muted text-2xs">{order.storeName}</span>}
          {!order?.storeName && <span />}
          <button
            onClick={handleMarkPaid}
            disabled={isMarking || showSuccess}
            className="px-3 py-1 text-2xs uppercase tracking-wider bg-terminal-red/10 border border-terminal-red/30 text-terminal-red active:bg-terminal-red/20 transition-colors disabled:opacity-50"
          >
            {showSuccess ? 'PAID' : isMarking ? '...' : 'MARK PAID'}
          </button>
        </div>
      </div>

      {/* Desktop: single-line layout */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-terminal-red animate-subtle-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{formatCurrency(payment.amount)}</span>
            <span className="text-dark-border">│</span>
            <span style={{ color: platform?.color }} className="uppercase">{platform?.name}</span>
            {order?.storeName && (
              <>
                <span className="text-dark-border">│</span>
                <span className="text-terminal-muted">{order.storeName}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-terminal-red font-medium">{relativeTime.text}</span>
          <button
            onClick={handleMarkPaid}
            disabled={isMarking || showSuccess}
            className="px-2 py-0.5 text-2xs uppercase tracking-wider bg-terminal-red/10 border border-terminal-red/30 text-terminal-red hover:bg-terminal-red/20 transition-colors disabled:opacity-50"
          >
            {showSuccess ? 'PAID' : isMarking ? '...' : 'MARK PAID'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OverdueAlerts() {
  const overduePayments = useOverduePayments();
  const now = useLiveTime(60000);

  if (overduePayments.length === 0) {
    return null;
  }

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="border border-terminal-red/30 bg-terminal-red/5">
      <div className="flex items-center justify-between px-2 py-1 border-b border-terminal-red/20">
        <div className="flex items-center gap-2 text-2xs">
          <span className="text-terminal-red font-bold">▲ OVERDUE</span>
          <span className="text-dark-border">│</span>
          <span className="text-terminal-red">
            {overduePayments.length} payment{overduePayments.length !== 1 ? 's' : ''}
          </span>
          <span className="text-dark-border">│</span>
          <span className="text-terminal-red font-semibold">{formatCurrency(totalOverdue)}</span>
        </div>
      </div>
      <div>
        {overduePayments.map((payment) => (
          <OverdueItem key={payment.id} payment={payment} now={now} />
        ))}
      </div>
    </div>
  );
}
