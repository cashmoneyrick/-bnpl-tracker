import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { ProgressRing } from '../shared/ProgressRing';
import { InstallmentDots } from '../shared/InstallmentDots';
import { PlatformIcon } from '../shared/PlatformIcon';
import { useBNPLStore } from '../../store';
import { useOrderProgress, useNextPayment, usePlatform } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { formatRelativeTime } from '../../hooks/useRelativeTime';
import type { Order } from '../../types';

interface OrderGridCardProps {
  order: Order;
}

export function OrderGridCard({ order }: OrderGridCardProps) {
  const platform = usePlatform(order.platformId);
  const progress = useOrderProgress(order.id);
  const nextPayment = useNextPayment(order.id);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);

  const isCompleted = order.status === 'completed';
  const isOverdue = nextPayment?.status === 'overdue';
  const now = new Date();

  const handleViewDetails = () => {
    openOrderDetailModal(order.id);
  };

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextPayment) {
      await markPaymentPaid(nextPayment.id);
    }
  };

  // Get relative time for next payment
  const getNextPaymentLabel = () => {
    if (isCompleted) return null;
    if (!nextPayment) return null;
    const relative = formatRelativeTime(nextPayment.dueDate, now);
    return relative;
  };

  const nextPaymentInfo = getNextPaymentLabel();

  return (
    <Card
      className={`cursor-pointer hover:border-gray-600 transition-colors overflow-hidden ${
        isOverdue ? 'border-red-500/50' : ''
      }`}
      padding="none"
      onClick={handleViewDetails}
    >
      {/* Platform color accent */}
      <div
        className="h-1"
        style={{ backgroundColor: platform?.color || '#666' }}
      />

      <div className="p-4">
        {/* Header: Store + Amount */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {order.storeName || platform?.name || 'Unknown'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <PlatformIcon
                platformId={order.platformId}
                size="sm"
                style={{ color: platform?.color }}
              />
              <span className="text-sm text-gray-400">{platform?.name}</span>
            </div>
          </div>
          <span className="text-lg font-semibold text-white ml-2">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>

        {/* Progress Section */}
        <div className="flex items-center gap-4 mb-4">
          <ProgressRing
            percentage={progress.percentage}
            size="md"
            color={isCompleted ? '#22c55e' : isOverdue ? '#ef4444' : platform?.color}
          />
          <div className="flex-1">
            <InstallmentDots
              total={progress.total}
              paid={progress.paid}
              overdue={isOverdue ? 1 : 0}
              size="md"
            />
            <p className="text-sm text-gray-400 mt-1">
              {progress.paid}/{progress.total} paid
            </p>
          </div>
        </div>

        {/* Status / Next Payment */}
        <div className="flex items-center justify-between">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </span>
          ) : nextPaymentInfo ? (
            <span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
              {isOverdue ? 'Overdue: ' : 'Next: '}
              <span className="font-medium">
                {formatCurrency(nextPayment!.amount)}
              </span>
              {' '}
              {nextPaymentInfo.text}
            </span>
          ) : (
            <span className="text-sm text-gray-500">No upcoming payments</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dark-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewDetails}
            className="flex-1"
          >
            View
          </Button>
          {!isCompleted && nextPayment && (
            <Button
              variant={isOverdue ? 'danger' : 'secondary'}
              size="sm"
              onClick={handleMarkPaid}
              className="flex-1"
            >
              Mark Paid
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
