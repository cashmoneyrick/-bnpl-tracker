import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { PlatformIcon } from '../components/shared/PlatformIcon';
import { useBNPLStore } from '../store';
import { useOrderPayments, useOrderProgress } from '../store/selectors';
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

function OrderProgress({ orderId }: { orderId: string }) {
  const progress = useOrderProgress(orderId);

  if (progress.total === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-dark-hover rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {progress.paid}/{progress.total} paid
      </span>
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
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${platform?.color}20` }}
          >
            <PlatformIcon
              platformId={order.platformId}
              size="sm"
              className="opacity-90"
              style={{ color: platform?.color }}
            />
          </div>
          <div className="flex-1">
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
            <OrderProgress orderId={order.id} />
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
  const [searchParams, setSearchParams] = useSearchParams();
  const orders = useBNPLStore((state) => state.orders);
  const platforms = useBNPLStore((state) => state.platforms);

  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus === 'active' || urlStatus === 'completed' || urlStatus === 'all') {
      return urlStatus;
    }
    return 'active';
  });
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Sync status filter to URL
  useEffect(() => {
    if (statusFilter !== 'active') {
      searchParams.set('status', statusFilter);
    } else {
      searchParams.delete('status');
    }
    setSearchParams(searchParams, { replace: true });
  }, [statusFilter, searchParams, setSearchParams]);

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
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-asc':
            return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
          case 'amount-desc':
            return b.totalAmount - a.totalAmount;
          case 'amount-asc':
            return a.totalAmount - b.totalAmount;
          case 'date-desc':
          default:
            return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
        }
      });
  }, [orders, platformFilter, statusFilter, tagFilter, searchQuery, platforms, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-gray-400 mt-1">View and manage all your orders</p>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search with clear button */}
            <div className="flex-1 relative">
              <Input
                placeholder="Search by store or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {/* Status Chips */}
            {(['all', 'active', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-dark-hover text-gray-400 border border-dark-border hover:border-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}

            <div className="w-px h-6 bg-dark-border self-center mx-1" />

            {/* Platform Chips */}
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                platformFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-dark-hover text-gray-400 border border-dark-border hover:border-gray-600'
              }`}
            >
              All Platforms
            </button>
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => setPlatformFilter(platform.id)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5 ${
                  platformFilter === platform.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-dark-hover text-gray-400 border border-dark-border hover:border-gray-600'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                {platform.name}
              </button>
            ))}
          </div>

          {/* Tag Chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center mr-1">Category:</span>
            <button
              onClick={() => setTagFilter('all')}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                tagFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-dark-hover text-gray-400 border border-dark-border hover:border-gray-600'
              }`}
            >
              All
            </button>
            {ORDER_TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  tagFilter === tag
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-dark-hover text-gray-400 border border-dark-border hover:border-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
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
