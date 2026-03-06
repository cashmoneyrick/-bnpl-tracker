import { useState, useMemo, useEffect } from 'react';
import { parseISO, isToday, isTomorrow, format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useBNPLStore } from '../store';
import {
  useTotalAvailableCredit,
  useOnTimeStreak,
  useUpcomingPayments,

  useWeeklyDeployment,
  useAllPlatformGoals,
  useTotalLimitGrowth,
  useArbitrageStats,
  useArbitrageOrders,
  useOrdersByType,
} from '../store/selectors';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { PlatformIcon } from '../components/shared/PlatformIcon';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { OverdueAlerts } from '../components/dashboard/OverdueAlerts';
import { InsightStrip } from '../components/dashboard/InsightStrip';
import { OrdersSection } from '../components/dashboard/OrdersSection';
import { DEFAULT_PLATFORMS, PLATFORM_COLORS } from '../constants/platforms';
import type { Order, PlatformId } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const ORDER_TYPE_COLORS: Record<string, string> = {
  personal: '#3b82f6',
  necessity: '#22c55e',
  arbitrage: '#f59e0b',
};

// ─── History sub-components ──────────────────────────────────────────────────

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
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showDeleteConfirm ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => openOrderDetailModal(order.id)}>
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
              <Button variant="danger" size="sm" onClick={handleDelete}>Yes</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>No</Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function HomePage() {
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const limitHistory = useBNPLStore((state) => state.limitHistory);
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  // Credit overview
  const totalAvailable = useTotalAvailableCredit();
  const onTimeStreak = useOnTimeStreak();
  const upcomingPayments = useUpcomingPayments(7);
  const totalLimit = platforms.reduce((sum, p) => sum + p.creditLimit, 0);
  const usedCredit = totalLimit - totalAvailable;
  const utilizationPercent = totalLimit > 0 ? (usedCredit / totalLimit) * 100 : 0;
  const activeOrders = orders.filter((o) => o.status === 'active').length;
  const dueThisWeek = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  const getPaymentStoreName = (payment: (typeof upcomingPayments)[0]) => {
    const order = orders.find((o) => o.id === payment.orderId);
    if (order?.storeName) return order.storeName;
    const platform = DEFAULT_PLATFORMS.find((p) => p.id === payment.platformId);
    return platform?.name || 'Unknown';
  };

  // Analytics

  const weeklyDeployment = useWeeklyDeployment();
  const platformGoals = useAllPlatformGoals();
  const limitGrowth = useTotalLimitGrowth();
  const arbitrageStats = useArbitrageStats();
  const arbitrageOrders = useArbitrageOrders();
  const hasArbitrageOrders = arbitrageOrders.length > 0;
  const ordersByType = useOrdersByType();


  const orderTypePieData = useMemo(() => {
    const data = [];
    if (ordersByType.personal.count > 0)
      data.push({ name: 'Personal', value: ordersByType.personal.total, color: ORDER_TYPE_COLORS.personal });
    if (ordersByType.necessity.count > 0)
      data.push({ name: 'Necessity', value: ordersByType.necessity.total, color: ORDER_TYPE_COLORS.necessity });
    if (ordersByType.arbitrage.count > 0)
      data.push({ name: 'Arbitrage', value: ordersByType.arbitrage.total, color: ORDER_TYPE_COLORS.arbitrage });
    return data;
  }, [ordersByType]);

  const recentLimitChanges = useMemo(() => {
    return [...limitHistory]
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
      .slice(0, 5)
      .map((change) => ({ ...change, platform: platforms.find((p) => p.id === change.platformId) }));
  }, [limitHistory, platforms]);

  // History
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('completed');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (platformFilter !== 'all' && order.platformId !== platformFilter) return false;
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const platform = platforms.find((p) => p.id === order.platformId);
          if (!order.storeName?.toLowerCase().includes(query) && !platform?.name.toLowerCase().includes(query))
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-asc': return parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime();
          case 'amount-desc': return b.totalAmount - a.totalAmount;
          case 'amount-asc': return a.totalAmount - b.totalAmount;
          default: return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
        }
      });
  }, [orders, platformFilter, statusFilter, searchQuery, platforms, sortBy]);

  const statusCounts = useMemo(() => ({
    all: orders.length,
    active: orders.filter((o) => o.status === 'active').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  }), [orders]);

  return (
    <div className="space-y-6">

      {/* ── Credit Overview Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-card to-dark-bg border border-dark-border p-6">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        {onTimeStreak > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{onTimeStreak}</span>
          </div>
        )}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-gray-400 text-sm">Available Credit</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalAvailable)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Used Credit</p>
            <p className={`text-2xl font-bold ${getUtilizationColor(utilizationPercent)}`}>{formatCurrency(usedCredit)}</p>
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

      {/* ── Dashboard Sections ───────────────────────────────────────── */}
      <OverdueAlerts />
      <SummaryCards />
      <InsightStrip />

      {/* ── Next Up ──────────────────────────────────────────────────── */}
      {upcomingPayments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Next Up</h2>
          <div className="space-y-2">
            {upcomingPayments.slice(0, 3).map((payment) => {
              const platformColor = PLATFORM_COLORS[payment.platformId] || '#6b7280';
              return (
                <Card key={payment.id} padding="sm" className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: platformColor }} />
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

      {/* ── Orders ───────────────────────────────────────────────────── */}
      <OrdersSection />

      {/* ── Add Order Button ─────────────────────────────────────────── */}
      <div>
        <button
          onClick={openQuickAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Order
        </button>
      </div>

      {/* ── Capital Strategy (Analytics) ─────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Capital Strategy</h2>
        <p className="text-gray-400 mb-6">Track your credit-building progress and deployment</p>

        {/* Available Capital */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Available Capital</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalAvailable)}</p>
              <p className="text-sm text-gray-400 mt-1">Total Available Credit</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Weekly Deployment</p>
                <p className="text-white font-medium">{formatCurrency(weeklyDeployment.amount)}</p>
              </div>
              <div className="h-3 bg-dark-card rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    weeklyDeployment.isOverExtended ? 'bg-red-500' : weeklyDeployment.warningThreshold ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((weeklyDeployment.amount / 60000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">$0</p>
                <p className="text-xs text-gray-500">$600</p>
              </div>
              {weeklyDeployment.isOverExtended && (
                <p className="text-sm text-red-400 mt-2">Warning: Over $600 deployed this week</p>
              )}
              {!weeklyDeployment.isOverExtended && weeklyDeployment.warningThreshold && (
                <p className="text-sm text-amber-400 mt-2">Approaching weekly limit threshold</p>
              )}
            </div>
          </div>
        </Card>

        {/* Platform Goals */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Platform Goals</h3>
          </div>
          {platformGoals.flexible.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-blue-400 mb-3">Flexible (Virtual Visa)</p>
              <div className="space-y-3">
                {platformGoals.flexible.map(({ platform, currentLimit, goalLimit, progress }) => (
                  <div key={platform.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: platform.color }} />
                        <span className="text-white text-sm">{platform.name}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{formatCurrency(currentLimit)} / {formatCurrency(goalLimit)}</span>
                    </div>
                    <div className="h-2 bg-dark-card rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: platform.color }} />
                    </div>
                    {progress >= 100 && <p className="text-xs text-green-400 mt-1">Goal reached!</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {platformGoals.limited.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-400 mb-3">Limited (Merchant-specific)</p>
              <div className="space-y-3">
                {platformGoals.limited.map(({ platform, currentLimit, goalLimit, progress }) => (
                  <div key={platform.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: platform.color }} />
                        <span className="text-white text-sm">{platform.name}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{formatCurrency(currentLimit)} / {formatCurrency(goalLimit)}</span>
                    </div>
                    <div className="h-2 bg-dark-card rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: platform.color }} />
                    </div>
                    {progress >= 100 && <p className="text-xs text-green-400 mt-1">Goal reached!</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {platformGoals.flexible.length === 0 && platformGoals.limited.length === 0 && (
            <p className="text-gray-500 text-sm">No goals set. Set platform goals in Settings to track your progress.</p>
          )}
        </Card>

        {/* Limit Growth */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Limit Growth</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-dark-hover rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Starting Total</p>
              <p className="text-xl font-semibold text-white">{formatCurrency(limitGrowth.startingTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Total</p>
              <p className="text-xl font-semibold text-white">{formatCurrency(limitGrowth.currentTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Growth</p>
              <p className={`text-xl font-semibold ${limitGrowth.growthAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {limitGrowth.growthAmount >= 0 ? '+' : ''}{formatCurrency(limitGrowth.growthAmount)}
                {limitGrowth.growthPercent > 0 && <span className="text-sm ml-1">({limitGrowth.growthPercent.toFixed(0)}%)</span>}
              </p>
            </div>
          </div>
          {recentLimitChanges.length > 0 ? (
            <div>
              <p className="text-sm text-gray-400 mb-3">Recent Limit Increases</p>
              <div className="space-y-2">
                {recentLimitChanges.map((change) => {
                  const increase = change.newLimit - change.previousLimit;
                  return (
                    <div key={change.id} className="flex items-center justify-between py-2 border-b border-dark-border last:border-0">
                      <div className="flex items-center gap-3">
                        {change.platform && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: change.platform.color }} />}
                        <div>
                          <p className="text-white text-sm">{change.platform?.name || change.platformId}</p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(change.changedAt), 'MMM d, yyyy')} · {change.onTimeStreakAtChange} on-time streak
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-medium ${increase >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {increase >= 0 ? '+' : ''}{formatCurrency(increase)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No limit changes recorded yet.</p>
          )}
        </Card>

        {/* Arbitrage Performance */}
        {hasArbitrageOrders && (
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Arbitrage Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-400">Total Deployed</p>
                <p className="text-xl font-semibold text-white">{formatCurrency(arbitrageStats.totalPurchased)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Sales</p>
                <p className="text-xl font-semibold text-white">{formatCurrency(arbitrageStats.totalSaleAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Net Cash</p>
                <p className={`text-xl font-semibold ${arbitrageStats.totalNetCash >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {arbitrageStats.totalNetCash >= 0 ? '+' : ''}{formatCurrency(Math.abs(arbitrageStats.totalNetCash))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Avg Cost of Capital</p>
                <p className="text-xl font-semibold text-white">
                  {arbitrageStats.averageCostOfCapital > 0 ? `${arbitrageStats.averageCostOfCapital.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
            {arbitrageStats.pendingSales > 0 && (
              <p className="text-sm text-amber-400 mb-4">
                {arbitrageStats.pendingSales} order{arbitrageStats.pendingSales > 1 ? 's' : ''} pending sale
              </p>
            )}
            {arbitrageOrders.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-3">Recent Orders</p>
                <div className="space-y-2">
                  {arbitrageOrders.slice(0, 5).map((order) => {
                    const platform = platforms.find((p) => p.id === order.platformId);
                    return (
                      <div key={order.id} className="flex items-center justify-between py-2 border-b border-amber-500/20 last:border-0">
                        <div className="flex items-center gap-3">
                          {platform && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: platform.color }} />}
                          <div>
                            <p className="text-white text-sm">{order.storeName || platform?.name || order.platformId}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(order.totalAmount)} purchase</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {order.saleAmount ? (
                            <>
                              <p className={`text-sm font-medium ${order.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                                {order.netCash >= 0 ? '+' : ''}{formatCurrency(order.netCash)}
                              </p>
                              {!order.isProfitable && <p className="text-xs text-gray-500">{order.costOfCapitalPercent.toFixed(1)}% cost</p>}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Pending sale</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Order Breakdown */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Order Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orderTypePieData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderTypePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                      {orderTypePieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">No orders yet</div>
            )}
            <div className="flex flex-col justify-center space-y-4">
              {[
                { key: 'personal', label: 'Personal' },
                { key: 'necessity', label: 'Necessity' },
                { key: 'arbitrage', label: 'Arbitrage' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: ORDER_TYPE_COLORS[key] }} />
                  <div className="flex-1">
                    <p className="text-white">{label}</p>
                    <p className="text-sm text-gray-400">
                      {ordersByType[key as keyof typeof ordersByType].count} orders · {formatCurrency(ordersByType[key as keyof typeof ordersByType].total)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-dark-border">
                <p className="text-sm text-gray-400">Total Deployed (All Time)</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(ordersByType.personal.total + ordersByType.necessity.total + ordersByType.arbitrage.total)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Payment History ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Payment History</h2>
        <p className="text-gray-400 mb-6">View your completed and past orders</p>

        <Card padding="md" className="mb-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
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
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as PlatformId | 'all')}
                className="px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Platforms</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>{platform.name}</option>
                ))}
              </select>
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
                  <span className="ml-1.5 text-xs opacity-60">({statusCounts[status]})</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-400">
                {orders.length === 0 ? 'No orders yet' : statusFilter === 'completed' ? 'No completed orders yet' : 'No orders match your filters'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</p>
            {filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>

    </div>
  );
}
