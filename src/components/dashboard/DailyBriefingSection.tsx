import { useBNPLStore } from '../../store';
import {
  useIncomingPayments,
  useRiskClusters,
  useOverduePayments,
  useAllPlatformUtilizations,
  useOnTimeStreak,
  useOverallCreditUtilization,
  getExposureStatus,
  getExposureColor,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';

function getBarBg(pct: number): string {
  if (pct >= 80) return 'bg-terminal-red';
  if (pct >= 60) return 'bg-terminal-amber';
  return 'bg-terminal-green';
}

export function DailyBriefingSection() {
  const platforms = useBNPLStore((s) => s.platforms);
  const incoming = useIncomingPayments(1);
  const riskClusters = useRiskClusters(3);
  const overduePayments = useOverduePayments();
  const utilizations = useAllPlatformUtilizations();
  const onTimeStreak = useOnTimeStreak();
  const creditUtil = useOverallCreditUtilization();

  const exposureStatus = getExposureStatus(creditUtil.percentage);
  const exposureColor = getExposureColor(exposureStatus);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayGroup = incoming.days.find((d) => d.date === todayKey);
  const overdueTotal = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">DAILY BRIEFING</span>
          <div className="flex items-center gap-2 text-2xs">
            <span className="text-terminal-amber font-bold tracking-wider">
              {format(new Date(), 'EEE MMM dd yyyy').toUpperCase()}
            </span>
            <span className="text-dark-border">│</span>
            <span className={`font-bold ${exposureColor}`}>{exposureStatus}</span>
            <span className="text-terminal-muted">{Math.round(creditUtil.percentage)}%</span>
          </div>
        </div>

        {/* Today's Payments */}
        <div className="px-3 py-2 border-b border-dark-border/50">
          <div className="terminal-label text-2xs mb-1.5">TODAY&apos;S PAYMENTS</div>
          {todayGroup && todayGroup.payments.length > 0 ? (
            <div className="space-y-1">
              {todayGroup.payments.map((p) => {
                const platform = platforms.find((pl) => pl.id === p.platformId);
                return (
                  <div key={p.id} className="flex items-center justify-between text-2xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2" style={{ backgroundColor: platform?.color }} />
                      <span className="text-terminal-muted">{platform?.name}</span>
                    </div>
                    <span className="text-terminal-amber font-semibold">{formatCurrency(p.amount)}</span>
                  </div>
                );
              })}
              <div className="border-t border-dark-border pt-1 flex justify-between text-2xs">
                <span className="text-terminal-muted">TOTAL DUE TODAY</span>
                <span className="text-terminal-amber font-bold">{formatCurrency(todayGroup.dayTotal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-terminal-green text-2xs font-bold">NO PAYMENTS DUE TODAY</p>
          )}
        </div>

        {/* Overdue Alert */}
        {overduePayments.length > 0 && (
          <div className="px-3 py-2 border-b border-dark-border/50 bg-terminal-red/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-terminal-red" />
                <span className="text-terminal-red text-2xs font-bold">
                  {overduePayments.length} OVERDUE
                </span>
              </div>
              <span className="text-terminal-red text-xs font-bold">{formatCurrency(overdueTotal)}</span>
            </div>
          </div>
        )}

        {/* Risk Clusters */}
        {riskClusters.length > 0 && (
          <div className="px-3 py-2 border-b border-dark-border/50">
            <div className="terminal-label text-2xs mb-1.5">RISK CLUSTERS (3D)</div>
            <div className="space-y-1">
              {riskClusters.map((cluster) => (
                <div key={cluster.startDate} className="flex items-center justify-between text-2xs">
                  <span className="text-terminal-amber">
                    {cluster.payments.length} payments in {cluster.daySpan === 0 ? 'same day' : `${cluster.daySpan}D`}
                  </span>
                  <span className="text-white font-semibold">{formatCurrency(cluster.totalAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Status + On-Time Streak */}
        <div className="px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {utilizations
              .filter((u) => u.limit > 0)
              .map((u) => {
                const platform = platforms.find((p) => p.id === u.platformId);
                if (!platform) return null;
                return (
                  <div key={u.platformId} className="text-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-terminal-muted uppercase">{platform.name}</span>
                      <span className="text-white font-semibold">{Math.round(u.percentage)}%</span>
                    </div>
                    <div className="h-1 bg-dark-hover overflow-hidden">
                      <div
                        className={`h-full transition-all ${getBarBg(u.percentage)}`}
                        style={{ width: `${Math.min(u.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-border/50">
            <span className="text-terminal-muted text-2xs uppercase tracking-wider">ON-TIME STREAK</span>
            <span className="text-terminal-green text-sm font-bold">{onTimeStreak}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
