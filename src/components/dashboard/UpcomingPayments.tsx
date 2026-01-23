import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useBNPLStore } from '../../store';
import { useUpcomingPayments, useOrder } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { getRelativeDateDescription } from '../../utils/date';

function PaymentItem({ payment }: { payment: ReturnType<typeof useUpcomingPayments>[0] }) {
  const order = useOrder(payment.orderId);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const platforms = useBNPLStore((state) => state.platforms);

  const platform = platforms.find((p) => p.id === payment.platformId);
  const relativeDate = getRelativeDateDescription(payment.dueDate);
  const isToday = relativeDate === 'Today';
  const isTomorrow = relativeDate === 'Tomorrow';

  const handleMarkPaid = async () => {
    await markPaymentPaid(payment.id);
  };

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg
        ${isToday ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-dark-hover'}
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
      <Button variant="ghost" size="sm" onClick={handleMarkPaid}>
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
