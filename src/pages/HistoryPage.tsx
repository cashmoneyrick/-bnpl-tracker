import { useState, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { useBNPLStore } from '../store';
import { useOrderPayments } from '../store/selectors';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { ORDER_TAG_OPTIONS, type Order, type PlatformId } from '../types';

function OrderPayments({ orderId }: { orderId: string }) {
  const payments = useOrderPayments(orderId);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const markPaymentUnpaid = useBNPLStore((state) => state.markPaymentUnpaid);

  return (
    <div className="mt-3 pt-3 border-t border-dark-border space-y-2">
      {payments.map((payment) => {
        const isPaid = payment.status === 'paid';
        const isOverdue = payment.status === 'overdue';

        return (
          <div
            key={payment.id}
            className={`
              flex items-center justify-between p-2 rounded-lg
              ${isOverdue ? 'bg-red-500/10' : isPaid ? 'bg-green-500/5' : 'bg-dark-hover'}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-6">
                #{payment.installmentNumber}
              </span>
              <span
                className={`text-sm ${
                  isPaid ? 'text-gray-500 line-through' : isOverdue ? 'text-red-400' : 'text-white'
                }`}
              >
                {formatCurrency(payment.amount)}
              </span>
              <span className="text-sm text-gray-500">
                Due {formatDate(payment.dueDate)}
              </span>
              {isPaid && payment.paidDate && (
                <span className="text-sm text-green-400">
                  Paid {formatDate(payment.paidDate)}
                  {payment.paidOnTime === false && (
                    <span className="text-amber-400 ml-1">(late)</span>
                  )}
                </span>
              )}
            </div>
            <Button
              variant={isPaid ? 'ghost' : isOverdue ? 'danger' : 'secondary'}
              size="sm"
              onClick={() =>
                isPaid ? markPaymentUnpaid(payment.id) : markPaymentPaid(payment.id)
              }
            >
              {isPaid ? 'Undo' : 'Mark Paid'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, isExpanded, onToggle }: { order: Order; isExpanded: boolean; onToggle: () => void }) {
  const platforms = useBNPLStore((state) => state.platforms);
  const deleteOrder = useBNPLStore((state) => state.deleteOrder);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const platform = platforms.find((p) => p.id === order.platformId);
  const isCompleted = order.status === 'completed';

  const handleDelete = async () => {
    await deleteOrder(order.id);
    setShowDeleteConfirm(false);
  };

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    openOrderDetailModal(order.id);
  };

  return (
    <Card className={isCompleted ? 'opacity-70' : ''}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: platform?.color || '#666' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {formatCurrency(order.totalAmount)}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">{platform?.name}</span>
              {order.storeName && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-400">{order.storeName}</span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(order.createdAt)}
              {isCompleted && (
                <span className="ml-2 text-green-400">Completed</span>
              )}
            </div>
            {order.tags && order.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {order.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-dark-hover text-gray-400 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!showDeleteConfirm ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenDetail}
                title="View Details"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
              >
                <svg
                  className="w-4 h-4 text-gray-400"
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
              </Button>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </>
          ) : (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-sm text-gray-400">Delete?</span>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Yes
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
              </Button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && <OrderPayments orderId={order.id} />}
    </Card>
  );
}

export function HistoryPage() {
  const orders = useBNPLStore((state) => state.orders);
  const platforms = useBNPLStore((state) => state.platforms);

  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Platform filter
        if (platformFilter !== 'all' && order.platformId !== platformFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && order.status !== statusFilter) {
          return false;
        }

        // Tag filter
        if (tagFilter !== 'all') {
          if (!order.tags || !order.tags.includes(tagFilter)) {
            return false;
          }
        }

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const platform = platforms.find((p) => p.id === order.platformId);
          const matchesStore = order.storeName?.toLowerCase().includes(query);
          const matchesPlatform = platform?.name.toLowerCase().includes(query);
          if (!matchesStore && !matchesPlatform) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
      );
  }, [orders, platformFilter, statusFilter, tagFilter, searchQuery, platforms]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-gray-400 mt-1">View and manage all your orders</p>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search by store or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) =>
              setPlatformFilter(e.target.value as PlatformId | 'all')
            }
            className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Platforms</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'completed')
            }
            className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>

          {/* Tag Filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {ORDER_TAG_OPTIONS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Results */}
      {filteredOrders.length === 0 ? (
        <Card>
          <div className="text-center py-8">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm text-gray-500">
              {orders.length === 0
                ? 'No orders yet. Add your first order!'
                : 'No orders match your filters'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </p>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expandedOrder === order.id}
              onToggle={() =>
                setExpandedOrder(expandedOrder === order.id ? null : order.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
