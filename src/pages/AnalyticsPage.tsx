import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { useBNPLStore } from '../store';
import { useAllPlatformStats, useMostUsedPlatform, useMonthComparison } from '../store/selectors';
import { formatCurrency, centsToDollars } from '../utils/currency';
import type { DateRangeOption } from '../types';

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'all-time', label: 'All Time' },
];

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>('all-time');
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const platformStats = useAllPlatformStats(dateRange);
  const mostUsedPlatform = useMostUsedPlatform();

  // Pie chart data
  const pieData = useMemo(() => {
    return platformStats
      .filter((s) => s.totalSpent > 0)
      .map((stat) => {
        const platform = platforms.find((p) => p.id === stat.platformId);
        return {
          name: platform?.name || stat.platformId,
          value: stat.totalSpent,
          color: platform?.color || '#666',
        };
      });
  }, [platformStats, platforms]);

  // Monthly trend data
  const trendData = useMemo(() => {
    const now = new Date();
    const monthsBack = dateRange === 'this-month' ? 0 : dateRange === 'last-3-months' ? 2 : dateRange === 'last-6-months' ? 5 : 11;
    const startDate = startOfMonth(subMonths(now, monthsBack));
    const months = eachMonthOfInterval({ start: startDate, end: now });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthOrders = orders.filter((o) => {
        const createdAt = parseISO(o.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      const total = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        month: format(month, 'MMM'),
        amount: centsToDollars(total),
      };
    });
  }, [orders, dateRange]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalOrders = platformStats.reduce((sum, s) => sum + s.totalOrders, 0);
    const totalSpent = platformStats.reduce((sum, s) => sum + s.totalSpent, 0);
    const avgOrderSize = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const allPaidPayments = platformStats.reduce((sum, s) => sum + s.totalPayments, 0);
    const allOnTimePayments = platformStats.reduce((sum, s) => sum + s.onTimePayments, 0);
    const onTimeRate = allPaidPayments > 0 ? (allOnTimePayments / allPaidPayments) * 100 : 0;

    return {
      totalOrders,
      totalSpent,
      avgOrderSize,
      onTimeRate,
    };
  }, [platformStats]);

  // Best on-time platform
  const bestOnTimePlatform = useMemo(() => {
    const withPayments = platformStats.filter((s) => s.totalPayments > 0);
    if (withPayments.length === 0) return null;

    return withPayments.reduce((best, current) =>
      current.onTimePaymentRate > best.onTimePaymentRate ? current : best
    );
  }, [platformStats]);

  const monthComparison = useMonthComparison();
  const mostUsedPlatformData = platforms.find((p) => p.id === mostUsedPlatform);
  const bestOnTimePlatformData = bestOnTimePlatform
    ? platforms.find((p) => p.id === bestOnTimePlatform.platformId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Understand your spending patterns</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={dateRange === option.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDateRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Month-over-Month Comparison */}
      {(monthComparison.thisMonth.orders > 0 || monthComparison.lastMonth.orders > 0) && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">vs Last Month</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Spending */}
            <div>
              <p className="text-sm text-gray-400 mb-1">Spending</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  {formatCurrency(monthComparison.thisMonth.spending)}
                </span>
                {monthComparison.changes.spending !== null && (
                  <span
                    className={`text-sm font-medium flex items-center gap-0.5 ${
                      monthComparison.changes.spending < 0
                        ? 'text-green-400'
                        : monthComparison.changes.spending > 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {monthComparison.changes.spending < 0 ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    ) : monthComparison.changes.spending > 0 ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : null}
                    {Math.abs(Math.round(monthComparison.changes.spending))}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                from {formatCurrency(monthComparison.lastMonth.spending)}
              </p>
            </div>

            {/* Orders */}
            <div>
              <p className="text-sm text-gray-400 mb-1">Orders</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  {monthComparison.thisMonth.orders}
                </span>
                {monthComparison.changes.orders !== null && (
                  <span
                    className={`text-sm font-medium flex items-center gap-0.5 ${
                      monthComparison.changes.orders < 0
                        ? 'text-green-400'
                        : monthComparison.changes.orders > 0
                        ? 'text-amber-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {monthComparison.changes.orders < 0 ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    ) : monthComparison.changes.orders > 0 ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : null}
                    {Math.abs(Math.round(monthComparison.changes.orders))}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                from {monthComparison.lastMonth.orders}
              </p>
            </div>

            {/* Avg Order */}
            <div>
              <p className="text-sm text-gray-400 mb-1">Avg Order</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  {formatCurrency(monthComparison.thisMonth.avgOrder)}
                </span>
                {monthComparison.changes.avgOrder !== null && (
                  <span
                    className={`text-sm font-medium flex items-center gap-0.5 ${
                      monthComparison.changes.avgOrder < 0
                        ? 'text-green-400'
                        : monthComparison.changes.avgOrder > 0
                        ? 'text-amber-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {monthComparison.changes.avgOrder < 0 ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    ) : monthComparison.changes.avgOrder > 0 ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : null}
                    {Math.abs(Math.round(monthComparison.changes.avgOrder))}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                from {formatCurrency(monthComparison.lastMonth.avgOrder)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Insights */}
      {(mostUsedPlatformData || bestOnTimePlatformData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mostUsedPlatformData && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: mostUsedPlatformData.color + '20' }}
                >
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: mostUsedPlatformData.color }}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Most Used Platform</p>
                  <p className="text-lg font-semibold text-white">
                    {mostUsedPlatformData.name}
                  </p>
                </div>
              </div>
            </Card>
          )}
          {bestOnTimePlatformData && bestOnTimePlatform && (
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: bestOnTimePlatformData.color + '20' }}
                >
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: bestOnTimePlatformData.color }}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Best On-Time Rate</p>
                  <p className="text-lg font-semibold text-white">
                    {bestOnTimePlatformData.name} ({bestOnTimePlatform.onTimePaymentRate}%)
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-white mt-1">
            {overallStats.totalOrders}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(overallStats.totalSpent)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">Avg Order Size</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(Math.round(overallStats.avgOrderSize))}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">On-Time Rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {Math.round(overallStats.onTimeRate)}%
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Platform */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">
            Spend by Platform
          </h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No spending data yet
            </div>
          )}
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">
            Monthly Spending
          </h3>
          {trendData.some((d) => d.amount > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="month"
                    stroke="#666"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No spending data yet
            </div>
          )}
        </Card>
      </div>

      {/* Platform Stats Table */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">
          Platform Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Platform
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Orders
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Total Spent
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Avg Order
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  On-Time %
                </th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform) => {
                const stats = platformStats.find(
                  (s) => s.platformId === platform.id
                );
                if (!stats) return null;

                return (
                  <tr
                    key={platform.id}
                    className="border-b border-dark-border last:border-0"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: platform.color }}
                        />
                        <span className="text-white">{platform.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {stats.totalOrders}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {formatCurrency(stats.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {stats.totalOrders > 0
                        ? formatCurrency(stats.averageOrderSize)
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {stats.totalPayments > 0 ? (
                        <span
                          className={
                            stats.onTimePaymentRate >= 90
                              ? 'text-green-400'
                              : stats.onTimePaymentRate >= 70
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }
                        >
                          {stats.onTimePaymentRate}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
