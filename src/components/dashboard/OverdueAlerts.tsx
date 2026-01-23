import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useBNPLStore } from '../../store';
import { useOverduePayments, useOrder } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { getRelativeDateDescription } from '../../utils/date';

function OverdueItem({
  payment,
}: {
  payment: ReturnType<typeof useOverduePayments>[0];
}) {
  const order = useOrder(payment.orderId);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const platforms = useBNPLStore((state) => state.platforms);

  const platform = platforms.find((p) => p.id === payment.platformId);
  const overdueText = getRelativeDateDescription(payment.dueDate);

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markPaymentPaid(payment.id);
  };

  const handleRowClick = () => {
    openOrderDetailModal(payment.orderId);
  };

  return (
    <div
      onClick={handleRowClick}
      className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
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
          <div className="text-sm">
            {order?.storeName && (
              <span className="text-gray-400">{order.storeName} · </span>
            )}
            <span className="text-red-400 font-medium">{overdueText}</span>
          </div>
        </div>
      </div>
      <Button variant="danger" size="sm" onClick={handleMarkPaid}>
        Mark Paid
      </Button>
    </div>
  );
}

export function OverdueAlerts() {
  const overduePayments = useOverduePayments();

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
          <OverdueItem key={payment.id} payment={payment} />
        ))}
      </div>
    </Card>
  );
}
