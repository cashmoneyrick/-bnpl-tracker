import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useBNPLStore } from '../../store';
import { useOrder, useOrderPayments, usePlatform } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { format, parseISO } from 'date-fns';

export function OrderDetailModal() {
  const isOpen = useBNPLStore((state) => state.orderDetailModalOpen);
  const selectedOrderId = useBNPLStore((state) => state.selectedOrderId);
  const closeModal = useBNPLStore((state) => state.closeOrderDetailModal);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const markPaymentUnpaid = useBNPLStore((state) => state.markPaymentUnpaid);
  const deleteOrder = useBNPLStore((state) => state.deleteOrder);

  const [isDeleting, setIsDeleting] = useState(false);

  const order = useOrder(selectedOrderId || '');
  const payments = useOrderPayments(selectedOrderId || '');
  const platform = usePlatform(order?.platformId || 'afterpay');

  if (!isOpen || !order || !platform) {
    return null;
  }

  const handleMarkPaid = async (paymentId: string) => {
    await markPaymentPaid(paymentId);
  };

  const handleMarkUnpaid = async (paymentId: string) => {
    await markPaymentUnpaid(paymentId);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this order? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      closeModal();
    } catch (error) {
      console.error('Failed to delete order:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy');
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Order Details" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: platform.color }}
          />
          <div>
            <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
            {order.storeName && (
              <p className="text-sm text-gray-400">{order.storeName}</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-dark-hover rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-lg font-semibold text-white mt-1">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Created</p>
            <p className="text-lg font-semibold text-white mt-1">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
            <p className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  order.status === 'completed'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}
              >
                {order.status === 'completed' ? 'Completed' : 'Active'}
              </span>
            </p>
          </div>
        </div>

        {/* Payment Schedule */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Payment Schedule</h4>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  payment.status === 'paid'
                    ? 'bg-green-500/5 border-green-500/30'
                    : payment.status === 'overdue'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-dark-hover border-dark-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {payment.status === 'paid' ? (
                      <svg
                        className="w-5 h-5 text-green-400"
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
                    ) : payment.status === 'overdue' ? (
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
                    ) : (
                      <span className="w-5 h-5 flex items-center justify-center text-gray-500 text-sm font-medium">
                        #{payment.installmentNumber}
                      </span>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-gray-400">
                        {payment.status === 'paid' ? 'paid' : `due ${formatDate(payment.dueDate)}`}
                      </span>
                    </div>
                    {payment.paidDate && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Paid on {formatDate(payment.paidDate)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {payment.status === 'paid' ? (
                    <button
                      onClick={() => handleMarkUnpaid(payment.id)}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Undo
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant={payment.status === 'overdue' ? 'danger' : 'secondary'}
                      onClick={() => handleMarkPaid(payment.id)}
                    >
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Order */}
        <div className="pt-4 border-t border-dark-border">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {isDeleting ? 'Deleting...' : 'Delete Order'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
