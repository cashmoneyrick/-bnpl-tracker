import { useState, useMemo } from 'react';
import { parseISO, isToday, isTomorrow, format, formatDistanceToNow } from 'date-fns';
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

function getUtilGlow(pct: number): string {
  if (pct >= 80) return 'text-terminal-red metric-value';
  if (pct >= 60) return 'text-terminal-amber metric-value';
  return 'text-terminal-green metric-value';
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MetricCell({ label, value, colorClass = 'text-white', large = false }: {
  label: string; value: string; colorClass?: string; large?: boolean;
}) {
  return (
    <div className="px-3 first:pl-1">
      <span className="terminal-label block">{label}</span>
      <span className={`font-semibold ${colorClass} ${large ? 'text-base metric-value' : ''}`}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-terminal-muted text-2xs py-6 text-center flex flex-col items-center gap-1">
      <span className="text-dark-border text-lg">—</span>
      <span>{message}</span>
    </div>
  );
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
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const dueThisWeek = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  const [activePlatformTab, setActivePlatformTab] = useState<PlatformId | 'all'>('all');
  const [orderView, setOrderView] = useState<'active' | 'completed'>('active');

  const platformCredits = utilizations
    .filter((u) => u.limit > 0)
    .map((u) => {
      const platform = platforms.find((p) => p.id === u.platformId);
      return platform ? { ...u, platform } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const filteredActiveOrders = useMemo(() => {
    const base = activePlatformTab === 'all' ? activeOrders : activeOrders.filter((o) => o.platformId === activePlatformTab);
    return base.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [activeOrders, activePlatformTab]);

  const filteredCompletedOrders = useMemo(() => {
    const base = activePlatformTab === 'all' ? completedOrders : completedOrders.filter((o) => o.platformId === activePlatformTab);
    return base.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()).slice(0, 20);
  }, [completedOrders, activePlatformTab]);

  const displayOrders = orderView === 'active' ? filteredActiveOrders : filteredCompletedOrders;

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
      <div className="border border-dark-border bg-dark-card p-2 mb-0 fade-up-1">
        <div className="flex items-center flex-wrap gap-y-2 divide-x divide-dark-border">
          <MetricCell label="AVAILABLE" value={formatCurrency(totalAvailable)} colorClass="text-terminal-green" large />
          <MetricCell label="USED" value={formatCurrency(totalOwed)} colorClass={getUtilColor(creditUtilization.percentage)} large />
          <MetricCell label="DUE 7D" value={formatCurrency(dueThisWeek)} colorClass={dueThisWeek > 0 ? 'text-terminal-amber' : 'text-white'} large />
          <MetricCell label="ACTIVE" value={String(activeOrders.length)} />
          <div className="px-3">
            <span className="terminal-label block">UTIL</span>
            <span className={`font-bold text-base ${getUtilGlow(creditUtilization.percentage)}`}>
              {creditUtilization.percentage.toFixed(0)}%
            </span>
          </div>
          <MetricCell label="LIMIT" value={formatCurrency(totalLimit)} colorClass="text-terminal-muted" />
        </div>
      </div>

      {/* Overdue Alerts */}
      <OverdueAlerts />

      {/* ═══ ZONE 2: MAIN DASHBOARD (Grid) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] border-x border-dark-border fade-up-2">

        {/* ── LEFT: Platform View ── */}
        <div className="border-b lg:border-b-0 lg:border-r border-dark-border">
          {/* Platform Tabs */}
          <div className="flex items-center border-b border-dark-border px-1 py-0 gap-0 overflow-x-auto">
            <button
              onClick={() => setActivePlatformTab('all')}
              className={`px-3 py-1.5 text-2xs uppercase tracking-wider transition-colors whitespace-nowrap ${
                activePlatformTab === 'all'
                  ? 'text-terminal-amber border-b-2 border-terminal-amber bg-terminal-amber/5'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              ALL
            </button>
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatformTab(p.id as PlatformId)}
                className={`px-3 py-1.5 text-2xs uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activePlatformTab === p.id
                    ? 'border-b-2 text-white'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                style={activePlatformTab === p.id ? { borderColor: p.color, color: p.color, background: `${p.color}08` } : undefined}
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
                  <div key={platform.id} className="flex items-center gap-2 text-2xs row-glow py-0.5 -mx-1 px-1">
                    <span className="w-16 text-terminal-muted truncate uppercase">{platform.name}</span>
                    <div className="flex-1 h-1.5 bg-dark-hover overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-500 ${getBarBg(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-terminal-green font-medium">{formatCurrency(available)}</span>
                    <span className="w-14 text-right text-terminal-muted">{formatCurrency(limit)}</span>
                    <span className={`w-8 text-right font-semibold ${getUtilColor(percentage)}`}>{Math.round(percentage)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Section Header with Active/Completed Toggle */}
          <div className="flex items-center justify-between border-b border-dark-border px-2 py-1">
            <div className="flex items-center gap-0">
              <button
                onClick={() => setOrderView('active')}
                className={`px-2 py-0.5 text-2xs uppercase tracking-wider transition-colors ${
                  orderView === 'active'
                    ? 'text-terminal-amber'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                ACTIVE ({activeOrders.length})
              </button>
              <span className="text-dark-border">│</span>
              <button
                onClick={() => setOrderView('completed')}
                className={`px-2 py-0.5 text-2xs uppercase tracking-wider transition-colors ${
                  orderView === 'completed'
                    ? 'text-terminal-green'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                COMPLETED ({completedOrders.length})
              </button>
            </div>
            <span className="text-2xs text-dark-border">{displayOrders.length} shown</span>
          </div>

          {/* Orders Table */}
          <div className="p-2">
            {displayOrders.length > 0 ? (
              <table className="w-full text-2xs">
                <thead>
                  <tr className="text-terminal-muted border-b border-dark-border">
                    <th className="text-left py-1 font-medium">STORE</th>
                    <th className="text-left py-1 font-medium">PLATFORM</th>
                    <th className="text-right py-1 font-medium">AMOUNT</th>
                    <th className="text-right py-1 font-medium">STATUS</th>
                    <th className="text-right py-1 font-medium">{orderView === 'active' ? 'CREATED' : 'COMPLETED'}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.map((order) => {
                    const platform = platforms.find((p) => p.id === order.platformId);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-dark-border/50 row-glow cursor-pointer transition-colors"
                        onClick={() => openOrderDetailModal(order.id)}
                      >
                        <td className="py-1.5 text-white">{order.storeName || '—'}</td>
                        <td className="py-1.5" style={{ color: platform?.color }}>{platform?.name}</td>
                        <td className="py-1.5 text-right text-terminal-amber font-semibold">{formatCurrency(order.totalAmount)}</td>
                        <td className="py-1.5 text-right">
                          {order.status === 'active' ? (
                            <span className="text-terminal-green">ACTIVE</span>
                          ) : (
                            <span className="text-terminal-muted">DONE</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right text-terminal-muted">
                          {format(parseISO(order.status === 'completed' && order.completedAt ? order.completedAt : order.createdAt), 'MM/dd')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState message={orderView === 'active' ? 'NO ACTIVE ORDERS' : 'NO COMPLETED ORDERS'} />
            )}
          </div>
        </div>

        {/* ── RIGHT: Upcoming & Analytics ── */}
        <div className="fade-up-3">
          {/* Upcoming Payments */}
          <div className="border-b border-dark-border p-2">
            <div className="terminal-label mb-2">UPCOMING PAYMENTS</div>
            {upcomingPayments.length > 0 ? (
              <div className="space-y-0">
                {upcomingPayments.slice(0, 8).map((payment) => {
                  const platformColor = PLATFORM_COLORS[payment.platformId] || '#6b7280';
                  const isUrgent = isToday(parseISO(payment.dueDate)) || isTomorrow(parseISO(payment.dueDate));
                  return (
                    <div key={payment.id} className="flex items-center justify-between py-1.5 border-b border-dark-border/50 last:border-0 text-2xs row-glow -mx-1 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: platformColor }} />
                        <span className="text-white truncate">{getPaymentStoreName(payment)}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`${isUrgent ? 'text-terminal-red font-medium' : 'text-terminal-muted'}`}>
                          {formatDueDate(payment.dueDate)}
                        </span>
                        <span className="text-terminal-amber font-semibold w-16 text-right">{formatCurrency(payment.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="NO UPCOMING PAYMENTS" />
            )}
          </div>

          {/* Weekly Deployment */}
          <div className="border-b border-dark-border p-2">
            <div className="terminal-label mb-1">WEEKLY DEPLOYMENT</div>
            <div className="flex items-baseline justify-between text-2xs mb-1.5">
              <span className="text-white font-semibold text-sm metric-value">{formatCurrency(weeklyDeployment.amount)}</span>
              <span className="text-terminal-muted">/ $600</span>
            </div>
            <div className="h-1 bg-dark-hover overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${weeklyDeployment.isOverExtended ? 'bg-terminal-red' : weeklyDeployment.warningThreshold ? 'bg-terminal-amber' : 'bg-terminal-green'}`}
                style={{ width: `${Math.min((weeklyDeployment.amount / 60000) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Platform Goals */}
          {allGoals.length > 0 && (
            <div className="border-b border-dark-border p-2">
              <div className="terminal-label mb-2">PLATFORM GOALS</div>
              <div className="space-y-2">
                {allGoals.map(({ platform, currentLimit, goalLimit, progress }) => (
                  <div key={platform.id} className="text-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium" style={{ color: platform.color }}>{platform.name.toUpperCase()}</span>
                      <span className="text-terminal-muted">{formatCurrency(currentLimit)}/{formatCurrency(goalLimit)}</span>
                    </div>
                    <div className="h-1 bg-dark-hover overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: platform.color }}
                      />
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
      <div className="border border-dark-border bg-dark-card fade-up-4">
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
                  <div key={key} className="flex items-center justify-between row-glow -mx-1 px-1 py-0.5">
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
                  <span className="text-terminal-muted">NET P&L</span>
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
              <div className="text-terminal-muted text-2xs py-2">NO ARBITRAGE DATA</div>
            )}
          </div>

          {/* Available Capital */}
          <div className="p-2">
            <div className="terminal-label mb-2">CAPITAL</div>
            <div className="space-y-1 text-2xs">
              <div className="flex justify-between items-baseline">
                <span className="text-terminal-muted">AVAILABLE</span>
                <span className="text-terminal-green font-bold text-sm metric-value">{formatCurrency(totalAvailable)}</span>
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
                      <div key={change.id} className="flex items-center justify-between row-glow -mx-1 px-1 py-0.5">
                        <span className="text-terminal-muted">{platform?.name?.toUpperCase() || change.platformId}</span>
                        <span className={`font-semibold ${increase >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                          {increase >= 0 ? '+' : ''}{formatCurrency(increase)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-terminal-muted text-2xs py-2">NO CHANGES</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
