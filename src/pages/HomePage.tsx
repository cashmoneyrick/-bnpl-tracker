import { Link } from 'react-router-dom';
import { parseISO, isToday, isTomorrow, format } from 'date-fns';
import { useBNPLStore } from '../store';
import { useTotalAvailableCredit, useOnTimeStreak, useUpcomingPayments } from '../store/selectors';
import { formatCurrency } from '../utils/currency';
import { Card } from '../components/shared/Card';
import { DEFAULT_PLATFORMS, PLATFORM_COLORS } from '../constants/platforms';

function formatDueDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function getUtilizationColor(percent: number): string {
  if (percent >= 80) return 'text-red-400';
  if (percent >= 60) return 'text-amber-400';
  return 'text-green-400';
}

function getBarColor(percent: number): string {
  if (percent >= 80) return 'bg-red-500';
  if (percent >= 60) return 'bg-amber-500';
  return 'bg-green-500';
}

export function HomePage() {
  // Store data
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  // Selectors
  const totalAvailable = useTotalAvailableCredit();
  const onTimeStreak = useOnTimeStreak();
  const upcomingPayments = useUpcomingPayments(7);

  // Calculations
  const totalLimit = platforms.reduce((sum, p) => sum + p.creditLimit, 0);
  const usedCredit = totalLimit - totalAvailable;
  const utilizationPercent = totalLimit > 0 ? (usedCredit / totalLimit) * 100 : 0;
  const activeOrders = orders.filter((o) => o.status === 'active').length;
  const dueThisWeek = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Get store name for a payment
  const getPaymentStoreName = (payment: (typeof upcomingPayments)[0]) => {
    const order = orders.find((o) => o.id === payment.orderId);
    if (order?.storeName) return order.storeName;
    const platform = DEFAULT_PLATFORMS.find((p) => p.id === payment.platformId);
    return platform?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Hero Card - Credit Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-card to-dark-bg border border-dark-border p-6">
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

        {/* Streak badge */}
        {onTimeStreak > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{onTimeStreak}</span>
          </div>
        )}

        {/* Metrics grid */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-gray-400 text-sm">Available Credit</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalAvailable)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Used Credit</p>
            <p className={`text-2xl font-bold ${getUtilizationColor(utilizationPercent)}`}>
              {formatCurrency(usedCredit)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Due This Week</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(dueThisWeek)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Active Orders</p>
            <p className="text-2xl font-bold text-white">{activeOrders}</p>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Credit Utilization</span>
            <span className={`text-sm font-medium ${getUtilizationColor(utilizationPercent)}`}>
              {utilizationPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-dark-hover overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(utilizationPercent)}`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Budgeting Card */}
        <Card padding="lg">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Budgeting</h2>
              <p className="text-sm text-gray-400">BNPL tracking & analytics</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={openQuickAddModal}
              className="w-full flex items-center gap-3 p-3 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-colors group"
            >
              <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Add Order</p>
                <p className="text-xs text-gray-400">Screenshot or manual entry</p>
              </div>
            </button>

            <Link
              to="/budgeting"
              className="w-full flex items-center gap-3 p-3 bg-dark-hover hover:bg-dark-border rounded-xl transition-colors group"
            >
              <div className="p-2 bg-dark-border rounded-lg group-hover:bg-dark-hover transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Upcoming Payments</p>
                <p className="text-xs text-gray-400">
                  {upcomingPayments.length > 0
                    ? `${upcomingPayments.length} due this week`
                    : 'View calendar'}
                </p>
              </div>
            </Link>
          </div>

          <Link
            to="/budgeting"
            className="inline-block mt-4 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Go to Dashboard &rarr;
          </Link>
        </Card>

        {/* Canvas Card */}
        <Card padding="lg">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Canvas</h2>
              <p className="text-sm text-gray-400">Mindmaps & freeform thinking</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/canvas"
              className="w-full flex items-center gap-3 p-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-colors group"
            >
              <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Open Canvas</p>
                <p className="text-xs text-gray-400">Draw, write, and brainstorm</p>
              </div>
            </Link>

            <div className="w-full flex items-center gap-3 p-3 border border-dashed border-dark-border rounded-xl opacity-50">
              <div className="p-2 bg-dark-hover rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-500">Mindmap Mode</p>
                <p className="text-xs text-gray-600">Coming soon</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Next Up Section */}
      {upcomingPayments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Next Up</h2>
            <Link to="/budgeting" className="text-sm text-gray-400 hover:text-white transition-colors">
              View all &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {upcomingPayments.slice(0, 3).map((payment) => {
              const platformColor = PLATFORM_COLORS[payment.platformId] || '#6b7280';
              return (
                <Card key={payment.id} padding="sm" className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platformColor }}
                    />
                    <div>
                      <p className="font-medium text-white">{getPaymentStoreName(payment)}</p>
                      <p className="text-xs text-gray-400">{formatDueDate(payment.dueDate)}</p>
                    </div>
                  </div>
                  <p className="font-medium text-white">{formatCurrency(payment.amount)}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
