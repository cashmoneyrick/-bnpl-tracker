import { useMemo } from 'react';
import { useBNPLStore } from '../store';
import {
  useAllPlatformUtilizations,
  useOverallCreditUtilization,
  useOrdersByType,
  useArbitrageStats,
  useOnTimeStreak,
  useWeeklyDeployment,
  useTotalLimitGrowth,
  useMonthlySpending,
  getExposureStatus,
  getExposureColor,
} from '../store/selectors';
import { formatCurrency } from '../utils/currency';

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="px-3 py-2.5 border border-dark-border bg-dark-card">
      <div className="terminal-label mb-1">{label}</div>
      <div className={`text-lg font-bold metric-value ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-2xs text-terminal-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function AnalyticsView() {
  const orders = useBNPLStore((s) => s.orders);
  const payments = useBNPLStore((s) => s.payments);
  const platforms = useBNPLStore((s) => s.platforms);

  const utilizations = useAllPlatformUtilizations();
  const creditUtil = useOverallCreditUtilization();
  const ordersByType = useOrdersByType();
  const arbitrageStats = useArbitrageStats();
  const onTimeStreak = useOnTimeStreak();
  const weeklyDeployment = useWeeklyDeployment();
  const limitGrowth = useTotalLimitGrowth();
  const monthlySpending = useMonthlySpending();

  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === 'active').length;
  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderSize = totalOrders > 0 ? totalSpent / totalOrders : 0;

  const totalPaid = payments.filter((p) => p.status === 'paid').length;
  const onTimePaid = payments.filter((p) => p.paidOnTime === true).length;
  const onTimeRate = totalPaid > 0 ? Math.round((onTimePaid / totalPaid) * 100) : 100;

  const platformSpending = useMemo(() => {
    return platforms
      .map((p) => {
        const total = orders
          .filter((o) => o.platformId === p.id)
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return { label: p.name.toUpperCase(), value: total, color: p.color };
      })
      .sort((a, b) => b.value - a.value);
  }, [orders, platforms]);

  const maxPlatformSpend = Math.max(...platformSpending.map((p) => p.value), 1);
  const maxMonthlySpend = Math.max(...monthlySpending.map((m) => m.total), 1);

  return (
    <div className="space-y-1">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        <MetricCard label="TOTAL ORDERS" value={String(totalOrders)} sub={`${activeOrders} active`} />
        <MetricCard label="TOTAL FINANCED" value={formatCurrency(totalSpent)} />
        <MetricCard label="AVG ORDER" value={formatCurrency(avgOrderSize)} />
        <MetricCard
          label="ON-TIME RATE"
          value={`${onTimeRate}%`}
          color={onTimeRate >= 90 ? 'text-terminal-green' : onTimeRate >= 70 ? 'text-terminal-amber' : 'text-terminal-red'}
          sub={`${onTimeStreak} streak`}
        />
      </div>

      {/* Credit Utilization + Spending by Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
        {/* Credit Utilization */}
        <div className="hud-section">
          <div className="hud-section-inner relative">
            <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
              <span className="terminal-label">CREDIT UTILIZATION</span>
              <span className={`text-2xs font-bold ${getExposureColor(getExposureStatus(creditUtil.percentage))}`}>
                {Math.round(creditUtil.percentage)}%
              </span>
            </div>
            <div className="p-3 space-y-2">
              {utilizations
                .filter((u) => u.limit > 0)
                .map((u) => {
                  const platform = platforms.find((p) => p.id === u.platformId);
                  if (!platform) return null;
                  const pct = Math.round(u.percentage);
                  const barColor = pct >= 80 ? 'bg-terminal-red' : pct >= 60 ? 'bg-terminal-amber' : 'bg-terminal-green';
                  return (
                    <div key={u.platformId} className="text-2xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2" style={{ backgroundColor: platform.color }} />
                          <span className="text-terminal-muted uppercase">{platform.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-terminal-muted hidden sm:inline">
                            {formatCurrency(u.used)} / {formatCurrency(u.limit)}
                          </span>
                          <span className={`font-semibold w-8 text-right ${pct >= 80 ? 'text-terminal-red' : pct >= 60 ? 'text-terminal-amber' : 'text-terminal-green'}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-dark-hover overflow-hidden">
                        <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Spending by Platform */}
        <div className="hud-section">
          <div className="hud-section-inner relative">
            <div className="px-3 py-2 border-b border-dark-border">
              <span className="terminal-label">SPENDING BY PLATFORM</span>
            </div>
            <div className="p-3 space-y-1.5">
              {platformSpending.map((d) => (
                <div key={d.label} className="text-2xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-terminal-muted">{d.label}</span>
                    <span className="text-white font-semibold">{formatCurrency(d.value)}</span>
                  </div>
                  <div className="h-1.5 bg-dark-hover overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${maxPlatformSpend > 0 ? (d.value / maxPlatformSpend) * 100 : 0}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Payment Flow */}
      <div className="hud-section">
        <div className="hud-section-inner relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
            <span className="terminal-label">MONTHLY PAYMENT FLOW</span>
            <span className="text-2xs text-terminal-muted">LAST 6 MONTHS</span>
          </div>
          <div className="p-3">
            <div className="flex items-end gap-1 h-24">
              {monthlySpending.map((m) => {
                const heightPct = maxMonthlySpend > 0 ? (m.total / maxMonthlySpend) * 100 : 0;
                const paidPct = m.total > 0 ? (m.paid / m.total) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative" style={{ height: `${Math.max(heightPct, 2)}%` }}>
                      <div className="absolute inset-0 bg-terminal-amber/20" />
                      <div className="absolute bottom-0 left-0 right-0 bg-terminal-green/60" style={{ height: `${paidPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 mt-1.5">
              {monthlySpending.map((m) => (
                <div key={m.month} className="flex-1 text-center">
                  <div className="text-2xs text-terminal-muted">{m.label}</div>
                  <div className="text-2xs text-white font-semibold">{formatCurrency(m.total)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-2xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-1.5 bg-terminal-amber/20 inline-block" />
                <span className="text-terminal-muted">DUE</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-1.5 bg-terminal-green/60 inline-block" />
                <span className="text-terminal-muted">PAID</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Type + Arbitrage + Credit Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
        {/* By Order Type */}
        <div className="hud-section">
          <div className="hud-section-inner relative">
            <div className="px-3 py-2 border-b border-dark-border">
              <span className="terminal-label">BY ORDER TYPE</span>
            </div>
            <div className="p-3 space-y-2 text-2xs">
              {[
                { key: 'personal' as const, label: 'PERSONAL', color: '#3b82f6' },
                { key: 'necessity' as const, label: 'NECESSITY', color: '#22c55e' },
                { key: 'arbitrage' as const, label: 'ARBITRAGE', color: '#f59e0b' },
              ].map(({ key, label, color }) => {
                const data = ordersByType[key];
                const pct = totalSpent > 0 ? (data.total / totalSpent) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2" style={{ backgroundColor: color }} />
                        <span className="text-terminal-muted">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-terminal-muted">{data.count}x</span>
                        <span className="text-white font-semibold">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-dark-hover overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Arbitrage P&L */}
        <div className="hud-section">
          <div className="hud-section-inner relative">
            <div className="px-3 py-2 border-b border-dark-border">
              <span className="terminal-label">ARBITRAGE P&L</span>
            </div>
            <div className="p-3 text-2xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-terminal-muted">DEPLOYED</span>
                <span className="text-white font-semibold">{formatCurrency(arbitrageStats.totalPurchased)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">REVENUE</span>
                <span className="text-white font-semibold">{formatCurrency(arbitrageStats.totalSaleAmount)}</span>
              </div>
              <div className="border-t border-dark-border pt-1 flex justify-between">
                <span className="text-terminal-muted">NET P&L</span>
                <span className={`font-bold ${arbitrageStats.totalNetCash >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {arbitrageStats.totalNetCash >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(arbitrageStats.totalNetCash))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">COST OF CAPITAL</span>
                <span className="text-white font-semibold">{arbitrageStats.averageCostOfCapital.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Growth */}
        <div className="hud-section">
          <div className="hud-section-inner relative">
            <div className="px-3 py-2 border-b border-dark-border">
              <span className="terminal-label">CREDIT GROWTH</span>
            </div>
            <div className="p-3 text-2xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-terminal-muted">STARTING</span>
                <span className="text-white font-semibold">{formatCurrency(limitGrowth.startingTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">CURRENT</span>
                <span className="text-white font-semibold">{formatCurrency(limitGrowth.currentTotal)}</span>
              </div>
              <div className="border-t border-dark-border pt-1 flex justify-between">
                <span className="text-terminal-muted">GROWTH</span>
                <span className={`font-bold ${limitGrowth.growthAmount >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {limitGrowth.growthAmount >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(limitGrowth.growthAmount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">WEEKLY DEPLOY</span>
                <span className={`font-semibold ${weeklyDeployment.isOverExtended ? 'text-terminal-red' : 'text-white'}`}>
                  {formatCurrency(weeklyDeployment.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
