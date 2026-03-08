import { useBNPLStore } from '../../store';
import {
  useSafeToSpend,
  useFinancialRunway,
  useSavingsImpact,
  usePayPeriodBreakdown,
  useFreeCreditAlerts,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

// ─── Safe-to-Spend + Runway + Savings Impact (top strip) ────────────────────

function MoneyMetric({
  label,
  value,
  colorClass,
  subtext,
}: {
  label: string;
  value: string;
  colorClass?: string;
  subtext?: string;
}) {
  return (
    <div className="px-3 py-2.5 border border-dark-border bg-dark-card">
      <div className="terminal-label mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold metric-value ${colorClass || 'text-white'}`}>
        {value}
      </div>
      {subtext && <div className="text-2xs text-terminal-muted mt-0.5">{subtext}</div>}
    </div>
  );
}

export function MoneyStrip() {
  const paycheckSettings = useBNPLStore((state) => state.paycheckSettings);
  const safeToSpend = useSafeToSpend();
  const runway = useFinancialRunway(30);
  const savings = useSavingsImpact();

  if (!paycheckSettings) return null;

  const safeColor = safeToSpend.amount >= 0 ? 'text-terminal-green' : 'text-terminal-red';
  const impactColor = savings.currentPeriodPercent > 40 ? 'text-terminal-red' : savings.currentPeriodPercent > 25 ? 'text-terminal-amber' : 'text-terminal-green';

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">MONEY</span>
          <span className="text-2xs text-terminal-muted">PAYCHECK INTEL</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          <MoneyMetric
            label="SAFE TO SPEND"
            value={formatCurrency(Math.abs(safeToSpend.amount))}
            colorClass={safeColor}
            subtext={safeToSpend.amount < 0 ? 'OVER BUDGET' : 'after BNPL'}
          />
          <MoneyMetric
            label="30D RUNWAY"
            value={formatCurrency(runway.totalNeeded)}
            subtext={`${runway.paymentCount} payments`}
          />
          <MoneyMetric
            label="BNPL IMPACT"
            value={`${savings.currentPeriodPercent.toFixed(0)}%`}
            colorClass={impactColor}
            subtext="of paycheck"
          />
          <MoneyMetric
            label="AVG IMPACT"
            value={`${savings.averagePercent.toFixed(0)}%`}
            subtext="across 4 periods"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Pay Period Breakdown ────────────────────────────────────────────────────

export function PayPeriodBreakdown() {
  const paycheckSettings = useBNPLStore((state) => state.paycheckSettings);
  const periods = usePayPeriodBreakdown(4);
  const scrollToSettings = () => {
    document.getElementById('settings-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!paycheckSettings) {
    return (
      <div className="hud-section">
        <div className="hud-section-inner relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
            <span className="terminal-label">PAY PERIODS</span>
          </div>
          <div className="text-center py-6 px-4">
            <p className="text-terminal-muted text-2xs mb-2">Set up your paycheck to see period breakdowns</p>
            <button
              onClick={scrollToSettings}
              className="px-3 py-1 text-2xs uppercase tracking-wider border border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/10 transition-colors"
            >
              CONFIGURE PAYCHECK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (periods.length === 0) return null;

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">PAY PERIODS</span>
          <span className="text-2xs text-terminal-muted">NEXT {periods.length} PERIODS</span>
        </div>

        {/* Desktop: table layout */}
        <table className="hidden sm:table w-full text-2xs">
          <thead>
            <tr className="text-terminal-muted border-b border-dark-border">
              <th className="text-left py-1.5 px-3 font-medium">PAYDAY</th>
              <th className="text-right py-1.5 px-3 font-medium">INCOME</th>
              <th className="text-right py-1.5 px-3 font-medium">BNPL DUE</th>
              <th className="text-right py-1.5 px-3 font-medium">REMAINING</th>
              <th className="text-right py-1.5 px-3 font-medium">PAYMENTS</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              const remainingColor = period.remaining >= 0 ? 'text-terminal-green' : 'text-terminal-red';
              return (
                <tr key={period.payDate} className="border-b border-dark-border/50 row-glow">
                  <td className="py-1.5 px-3 text-terminal-amber font-medium">{period.payDateLabel}</td>
                  <td className="py-1.5 px-3 text-right text-white">{formatCurrency(period.income)}</td>
                  <td className="py-1.5 px-3 text-right text-terminal-amber font-semibold">{formatCurrency(period.bnplDue)}</td>
                  <td className={`py-1.5 px-3 text-right font-bold ${remainingColor}`}>{formatCurrency(Math.abs(period.remaining))}</td>
                  <td className="py-1.5 px-3 text-right text-terminal-muted">{period.payments.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile: card layout */}
        <div className="sm:hidden divide-y divide-dark-border/50">
          {periods.map((period) => {
            const remainingColor = period.remaining >= 0 ? 'text-terminal-green' : 'text-terminal-red';
            const percentUsed = period.income > 0 ? (period.bnplDue / period.income) * 100 : 0;
            return (
              <div key={period.payDate} className="px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-terminal-amber text-xs font-medium">{period.payDateLabel}</span>
                  <span className={`text-xs font-bold ${remainingColor}`}>
                    {period.remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(period.remaining))} left
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs mb-1">
                  <span className="text-terminal-muted">{formatCurrency(period.income)} income</span>
                  <span className="text-terminal-amber">{formatCurrency(period.bnplDue)} BNPL ({period.payments.length})</span>
                </div>
                {/* Usage bar */}
                <div className="h-1.5 bg-dark-hover overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${percentUsed > 50 ? 'bg-terminal-red' : percentUsed > 30 ? 'bg-terminal-amber' : 'bg-terminal-green'}`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Free Credit Alerts ──────────────────────────────────────────────────────

export function FreeCreditStrip() {
  const alerts = useFreeCreditAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">FREE CREDIT</span>
          <span className="text-2xs text-terminal-green">AVAILABLE</span>
        </div>
        <div className="flex flex-wrap gap-0 divide-x divide-dark-border">
          {alerts.map((alert) => (
            <div key={alert.platformId} className="px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: alert.platformColor }} />
              <span className="text-2xs text-terminal-muted uppercase">{alert.platformName}</span>
              <span className="text-xs text-terminal-green font-semibold">{formatCurrency(alert.available)}</span>
              <span className="text-2xs text-terminal-muted">{Math.round(100 - alert.percentage)}% free</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
