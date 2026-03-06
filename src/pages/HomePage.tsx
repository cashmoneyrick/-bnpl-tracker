import { useState, useMemo } from 'react';
import { parseISO, isToday, isTomorrow, format } from 'date-fns';
import { useBNPLStore } from '../store';
import {
  useTotalAvailableCredit,
  useUpcomingPayments,
  useAllPlatformUtilizations,
  useOverallCreditUtilization,
  useWeeklyDeployment,
  useAllPlatformGoals,
  useTotalLimitGrowth,
  useArbitrageStats,
  useArbitrageOrders,
  useOrdersByType,
  useTotalOwed,
} from '../store/selectors';
import { formatCurrency } from '../utils/currency';
import { PlatformIcon } from '../components/shared/PlatformIcon';
import { OverdueAlerts } from '../components/dashboard/OverdueAlerts';
import { PLATFORM_COLORS, DEFAULT_PLATFORMS } from '../constants/platforms';
import type { PlatformId } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDueDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'TODAY';
  if (isTomorrow(date)) return 'TOMORROW';
  return format(date, 'EEE, MMM d').toUpperCase();
}

function getUtilColor(pct: number): string {
  if (pct >= 80) return 'text-terminal-red';
  if (pct >= 60) return 'text-terminal-amber';
  return 'text-terminal-green';
}

function getBarBg(pct: number): string {
  if (pct >= 80) return 'bg-terminal-red';
  if (pct >= 60) return 'bg-terminal-amber';
  return 'bg-terminal-green';
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function HomePage() {
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const limitHistory = useBNPLStore((state) => state.limitHistory);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);

  const totalAvailable = useTotalAvailableCredit();
  const totalOwed = useTotalOwed();
  const upcomingPayments = useUpcomingPayments(7);
  const creditUtilization = useOverallCreditUtilization();
  const utilizations = useAllPlatformUtilizations();
  const weeklyDeployment = useWeeklyDeployment();
  const platformGoals = useAllPlatformGoals();
  const limitGrowth = useTotalLimitGrowth();
  const arbitrageStats = useArbitrageStats();
  const arbitrageOrders = useArbitrageOrders();
  const ordersByType = useOrdersByType();

  const totalLimit = platforms.reduce((sum, p) => sum + p.creditLimit, 0);
  const activeOrders = orders.filter((o) => o.status === 'active');
  const dueThisWeek = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  const [activePlatformTab, setActivePlatformTab] = useState<PlatformId | 'all'>('all');

  const platformCredits = utilizations
    .filter((u) => u.limit > 0)
    .map((u) => {
      const platform = platforms.find((p) => p.id === u.platformId);
      return platform ? { ...u, platform } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const filteredOrders = useMemo(() => {
    const base = activePlatformTab === 'all' ? activeOrders : activeOrders.filter((o) => o.platformId === activePlatformTab);
    return base.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [activeOrders, activePlatformTab]);

  const getPaymentStoreName = (payment: (typeof upcomingPayments)[0]) => {
    const order = orders.find((o) => o.id === payment.orderId);
    if (order?.storeName) return order.storeName;
    const platform = DEFAULT_PLATFORMS.find((p) => p.id === payment.platformId);
    return platform?.name || 'Unknown';
  };

  const allGoals = [...platformGoals.flexible, ...platformGoals.limited];

  return (
    <div className="space-y-0">

      {/* ═══ ZONE 1: METRICS STRIP ═══ */}
      <div className="border border-dark-border bg-dark-card p-2 mb-0">
        <div className="flex items-center flex-wrap gap-y-1 divide-x divide-dark-border">
          <div className="px-3 first:pl-0">
            <span className="terminal-label">AVAILABLE</span>
            <span className="ml-2 text-terminal-green font-semibold">{formatCurrency(totalAvailable)}</span>
          </div>
          <div className="px-3">
            <span className="terminal-label">USED</span>
            <span className={`ml-2 font-semibold ${getUtilColor(creditUtilization.percentage)}`}>{formatCurrency(totalOwed)}</span>
          </div>
          <div className="px-3">
            <span className="terminal-label">DUE 7D</span>
            <span className="ml-2 text-white font-semibold">{formatCurrency(dueThisWeek)}</span>
          </div>
          <div className="px-3">
            <span className="terminal-label">ACTIVE</span>
            <span className="ml-2 text-white font-semibold">{activeOrders.length}</span>
          </div>
          <div className="px-3">
            <span className="terminal-label">UTIL</span>
            <span className={`ml-2 font-bold ${getUtilColor(creditUtilization.percentage)}`}>
              {creditUtilization.percentage.toFixed(0)}%
            </span>
          </div>
          <div className="px-3">
            <span className="terminal-label">LIMIT</span>
            <span className="ml-2 text-terminal-muted font-semibold">{formatCurrency(totalLimit)}</span>
          </div>
        </div>
      </div>

      {/* Overdue Alerts */}
      <OverdueAlerts />

      {/* ═══ ZONE 2: MAIN DASHBOARD (Grid) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border-x border-dark-border">

        {/* ── LEFT: Platform View ── */}
        <div className="border-b lg:border-b-0 lg:border-r border-dark-border">
          {/* Platform Tabs */}
          <div className="flex items-center border-b border-dark-border px-2 py-1 gap-0 overflow-x-auto">
            <button
              onClick={() => setActivePlatformTab('all')}
              className={`px-3 py-1 text-2xs uppercase tracking-wider transition-colors whitespace-nowrap ${
                activePlatformTab === 'all'
                  ? 'text-terminal-amber border-b-2 border-terminal-amber'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              ALL
            </button>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatformTab(p.id as PlatformId)}
                className={`px-3 py-1 text-2xs uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activePlatformTab === p.id
                    ? 'border-b-2 text-white'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                style={activePlatformTab === p.id ? { borderColor: p.color, color: p.color } : undefined}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Platform Credit Bars */}
          {activePlatformTab === 'all' && platformCredits.length > 0 && (
            <div className="border-b border-dark-border p-2">
              <div className="terminal-label mb-2">CREDIT BY PLATFORM</div>
              <div className="space-y-1.5">
                {platformCredits.map(({ platform, used, available, limit, percentage }) => (
                  <div key={platform.id} className="flex items-center gap-2 text-2xs">
                    <span className="w-16 text-terminal-muted truncate">{platform.name.toUpperCase()}</span>
                    <div className="flex-1 h-1.5 bg-dark-hover overflow-hidden">
                      <div className={`h-full ${getBarBg(percentage)}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                    <span className="w-14 text-right text-terminal-green">{formatCurrency(available)}</span>
                    <span className="w-12 text-right text-terminal-muted">{formatCurrency(limit)}</span>
                    <span className={`w-8 text-right font-semibold ${getUtilColor(percentage)}`}>{Math.round(percentage)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Orders Table */}
          <div className="p-2">
            <div className="terminal-label mb-2">ACTIVE ORDERS ({filteredOrders.length})</div>
            {filteredOrders.length > 0 ? (
              <table className="w-full text-2xs">
                <thead>
                  <tr className="text-terminal-muted border-b border-dark-border">
                    <th className="text-left py-1 font-medium">STORE</th>
                    <th className="text-left py-1 font-medium">PLATFORM</th>
                    <th className="text-right py-1 font-medium">AMOUNT</th>
                    <th className="text-right py-1 font-medium">STATUS</th>
                    <th className="text-right py-1 font-medium">CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const platform = platforms.find((p) => p.id === order.platformId);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-dark-border/50 hover:bg-dark-hover cursor-pointer transition-colors"
                        onClick={() => openOrderDetailModal(order.id)}
                      >
                        <td className="py-1.5 text-white">{order.storeName || '—'}</td>
                        <td className="py-1.5" style={{ color: platform?.color }}>{platform?.name}</td>
                        <td className="py-1.5 text-right text-terminal-amber font-semibold">{formatCurrency(order.totalAmount)}</td>
                        <td className="py-1.5 text-right">
                          <span className="text-terminal-green">ACTIVE</span>
                        </td>
                        <td className="py-1.5 text-right text-terminal-muted">{format(parseISO(order.createdAt), 'MM/dd')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-terminal-muted text-2xs py-4 text-center">NO ACTIVE ORDERS</div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Upcoming & Analytics ── */}
        <div>
          {/* Upcoming Payments */}
          <div className="border-b border-dark-border p-2">
            <div className="terminal-label mb-2">UPCOMING PAYMENTS</div>
            {upcomingPayments.length > 0 ? (
              <div className="space-y-0">
                {upcomingPayments.slice(0, 8).map((payment) => {
                  const platformColor = PLATFORM_COLORS[payment.platformId] || '#6b7280';
                  return (
                    <div key={payment.id} className="flex items-center justify-between py-1.5 border-b border-dark-border/50 last:border-0 text-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5" style={{ backgroundColor: platformColor }} />
                        <span className="text-white">{getPaymentStoreName(payment)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-terminal-muted">{formatDueDate(payment.dueDate)}</span>
                        <span className="text-terminal-amber font-semibold w-16 text-right">{formatCurrency(payment.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-terminal-muted text-2xs py-4 text-center">NO UPCOMING PAYMENTS</div>
            )}
          </div>

          {/* Weekly Deployment */}
          <div className="border-b border-dark-border p-2">
            <div className="terminal-label mb-1">WEEKLY DEPLOYMENT</div>
            <div className="flex items-center justify-between text-2xs mb-1">
              <span className="text-white font-semibold">{formatCurrency(weeklyDeployment.amount)}</span>
              <span className="text-terminal-muted">/ $600</span>
            </div>
            <div className="h-1.5 bg-dark-hover overflow-hidden">
              <div
                className={`h-full ${weeklyDeployment.isOverExtended ? 'bg-terminal-red' : weeklyDeployment.warningThreshold ? 'bg-terminal-amber' : 'bg-terminal-green'}`}
                style={{ width: `${Math.min((weeklyDeployment.amount / 60000) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Platform Goals */}
          {allGoals.length > 0 && (
            <div className="border-b border-dark-border p-2">
              <div className="terminal-label mb-2">PLATFORM GOALS</div>
              <div className="space-y-1.5">
                {allGoals.map(({ platform, currentLimit, goalLimit, progress }) => (
                  <div key={platform.id} className="text-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span style={{ color: platform.color }}>{platform.name.toUpperCase()}</span>
                      <span className="text-terminal-muted">{formatCurrency(currentLimit)}/{formatCurrency(goalLimit)}</span>
                    </div>
                    <div className="h-1 bg-dark-hover overflow-hidden">
                      <div className="h-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: platform.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limit Growth Summary */}
          <div className="p-2">
            <div className="terminal-label mb-2">LIMIT GROWTH</div>
            <div className="grid grid-cols-3 gap-2 text-2xs">
              <div>
                <span className="text-terminal-muted block">START</span>
                <span className="text-white font-semibold">{formatCurrency(limitGrowth.startingTotal)}</span>
              </div>
              <div>
                <span className="text-terminal-muted block">CURRENT</span>
                <span className="text-white font-semibold">{formatCurrency(limitGrowth.currentTotal)}</span>
              </div>
              <div>
                <span className="text-terminal-muted block">GROWTH</span>
                <span className={`font-semibold ${limitGrowth.growthAmount >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {limitGrowth.growthAmount >= 0 ? '+' : ''}{formatCurrency(limitGrowth.growthAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ZONE 3: ANALYTICS STRIP ═══ */}
      <div className="border border-dark-border bg-dark-card">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-dark-border">

          {/* Order Breakdown */}
          <div className="p-2">
            <div className="terminal-label mb-2">ORDER BREAKDOWN</div>
            <div className="space-y-1 text-2xs">
              {[
                { key: 'personal', label: 'PERSONAL', color: '#3b82f6' },
                { key: 'necessity', label: 'NECESSITY', color: '#22c55e' },
                { key: 'arbitrage', label: 'ARBITRAGE', color: '#f59e0b' },
              ].map(({ key, label, color }) => {
                const data = ordersByType[key as keyof typeof ordersByType];
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2" style={{ backgroundColor: color }} />
                      <span className="text-terminal-muted">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-terminal-muted">{data.count}x</span>
                      <span className="text-white font-semibold w-16 text-right">{formatCurrency(data.total)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-dark-border pt-1 flex items-center justify-between">
                <span className="text-terminal-amber font-semibold">TOTAL</span>
                <span className="text-terminal-amber font-bold">
                  {formatCurrency(ordersByType.personal.total + ordersByType.necessity.total + ordersByType.arbitrage.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Arbitrage Stats */}
          <div className="p-2">
            <div className="terminal-label mb-2">ARBITRAGE</div>
            {arbitrageOrders.length > 0 ? (
              <div className="space-y-1 text-2xs">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">DEPLOYED</span>
                  <span className="text-white font-semibold">{formatCurrency(arbitrageStats.totalPurchased)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">SALES</span>
                  <span className="text-white font-semibold">{formatCurrency(arbitrageStats.totalSaleAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">NET</span>
                  <span className={`font-semibold ${arbitrageStats.totalNetCash >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {arbitrageStats.totalNetCash >= 0 ? '+' : ''}{formatCurrency(Math.abs(arbitrageStats.totalNetCash))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">COST OF CAP</span>
                  <span className="text-white font-semibold">{arbitrageStats.averageCostOfCapital.toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-terminal-muted text-2xs">NO ARBITRAGE DATA</div>
            )}
          </div>

          {/* Available Capital */}
          <div className="p-2">
            <div className="terminal-label mb-2">CAPITAL</div>
            <div className="space-y-1 text-2xs">
              <div className="flex justify-between">
                <span className="text-terminal-muted">AVAILABLE</span>
                <span className="text-terminal-green font-bold text-sm">{formatCurrency(totalAvailable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">WEEKLY</span>
                <span className={`font-semibold ${weeklyDeployment.isOverExtended ? 'text-terminal-red' : 'text-white'}`}>
                  {formatCurrency(weeklyDeployment.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">TOTAL LIMIT</span>
                <span className="text-white font-semibold">{formatCurrency(totalLimit)}</span>
              </div>
            </div>
          </div>

          {/* Recent Limit Changes */}
          <div className="p-2">
            <div className="terminal-label mb-2">RECENT CHANGES</div>
            {limitHistory.length > 0 ? (
              <div className="space-y-1 text-2xs">
                {[...limitHistory]
                  .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                  .slice(0, 4)
                  .map((change) => {
                    const platform = platforms.find((p) => p.id === change.platformId);
                    const increase = change.newLimit - change.previousLimit;
                    return (
                      <div key={change.id} className="flex items-center justify-between">
                        <span className="text-terminal-muted">{platform?.name?.toUpperCase() || change.platformId}</span>
                        <span className={`font-semibold ${increase >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                          {increase >= 0 ? '+' : ''}{formatCurrency(increase)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-terminal-muted text-2xs">NO CHANGES</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
