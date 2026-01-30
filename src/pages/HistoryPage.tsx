import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { PlatformIcon } from '../components/shared/PlatformIcon';
import { useBNPLStore } from '../store';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import type { Order, PlatformId } from '../types';

function OrderCard({ order }: { order: Order }) {
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

  return (
    <Card className={isCompleted ? 'opacity-80' : ''}>
      <div className="flex items-center gap-4">
        {/* Platform Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${platform?.color}20` }}
        >
          <PlatformIcon
            platformId={order.platformId}
            size="sm"
            style={{ color: platform?.color }}
          />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">
              {order.storeName || platform?.name || 'Unknown'}
            </span>
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Paid
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-medium text-gray-300">{formatCurrency(order.totalAmount)}</span>
            <span>·</span>
            <span>{platform?.name}</span>
            <span>·</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showDeleteConfirm ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openOrderDetailModal(order.id)}
              >
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-gray-400 hover:text-red-400"
              >
                Delete
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
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
    return 'completed'; // Default to completed for "History"
  });
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Sync status filter to URL
  useEffect(() => {
    if (statusFilter !== 'completed') {
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
  }, [orders, platformFilter, statusFilter, searchQuery, platforms, sortBy]);

  // Count orders by status
  const statusCounts = useMemo(() => ({
    all: orders.length,
    active: orders.filter((o) => o.status === 'active').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  }), [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payment History</h1>
        <p className="text-gray-400 mt-1">View your completed and past orders</p>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search, Platform, Sort Row */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Input
                placeholder="Search by store or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as PlatformId | 'all')}
              className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Platforms</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>

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

          {/* Status Chips */}
          <div className="flex items-center gap-2">
            {(['completed', 'active', 'all'] as const).map((status) => (
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
                <span className="ml-1.5 text-xs opacity-60">
                  ({statusCounts[status]})
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Results */}
      {filteredOrders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-600 mx-auto mb-3"
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
            <p className="text-gray-400">
              {orders.length === 0
                ? 'No orders yet'
                : statusFilter === 'completed'
                  ? 'No completed orders yet'
                  : 'No orders match your filters'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </p>
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
