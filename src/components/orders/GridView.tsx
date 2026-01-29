import { useState, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { OrderGridCard } from './OrderGridCard';
import { useBNPLStore } from '../../store';

type StatusFilter = 'all' | 'active' | 'completed';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export function GridView() {
  const orders = useBNPLStore((state) => state.orders);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
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

    return result;
  }, [orders, statusFilter, sortBy]);

  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((o) => o.status === 'active').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Filter and Sort Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-2">
          {(['all', 'active', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                statusFilter === status
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-dark-card text-gray-400 border border-dark-border hover:border-gray-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1.5 text-xs text-gray-500">
                ({statusCounts[status]})
              </span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      {/* Grid */}
      {filteredAndSortedOrders.length === 0 ? (
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-gray-400">
            {orders.length === 0
              ? 'No orders yet. Add your first order!'
              : 'No orders match your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedOrders.map((order) => (
            <OrderGridCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
