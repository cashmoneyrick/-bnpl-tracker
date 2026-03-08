import { useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { useBNPLStore } from '../../store';
import { useToast } from '../shared/Toast';
import {
  useOverallCreditUtilization,
  useAllPlatformUtilizations,
  useIncomingPayments,
  useOverduePayments,
  useOnTimeStreak,
  useArbitrageStats,
  useTotalLimitGrowth,
  getExposureStatus,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

export function ReportSection() {
  const orders = useBNPLStore((s) => s.orders);
  const platforms = useBNPLStore((s) => s.platforms);
  const { showToast } = useToast();
  const reportRef = useRef<HTMLPreElement>(null);

  const creditUtil = useOverallCreditUtilization();
  const utilizations = useAllPlatformUtilizations();
  const incoming = useIncomingPayments(14);
  const overduePayments = useOverduePayments();
  const onTimeStreak = useOnTimeStreak();
  const arbitrageStats = useArbitrageStats();
  const limitGrowth = useTotalLimitGrowth();

  const activeOrders = orders.filter((o) => o.status === 'active');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const overdueTotal = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  const report = useMemo(() => {
    const now = format(new Date(), 'EEE MMM dd yyyy HH:mm').toUpperCase();
    const sep = '═'.repeat(48);
    const line = '─'.repeat(48);

    let r = '';
    r += `${sep}\n`;
    r += `  JOURNAL — RECON REPORT\n`;
    r += `  ${now}\n`;
    r += `${sep}\n\n`;

    r += `▸ SYSTEM STATUS\n${line}\n`;
    r += `  Exposure:     ${Math.round(creditUtil.percentage)}% [${getExposureStatus(creditUtil.percentage)}]\n`;
    r += `  Credit Used:  ${formatCurrency(creditUtil.used)} / ${formatCurrency(creditUtil.limit)}\n`;
    r += `  Available:    ${formatCurrency(creditUtil.limit - creditUtil.used)}\n`;
    r += `  On-Time:      ${onTimeStreak} consecutive\n\n`;

    r += `▸ ORDER STATUS\n${line}\n`;
    r += `  Active:       ${activeOrders.length}\n`;
    r += `  Completed:    ${completedOrders.length}\n`;
    r += `  Total:        ${orders.length}\n\n`;

    if (overduePayments.length > 0) {
      r += `▸ ⚠ OVERDUE PAYMENTS\n${line}\n`;
      r += `  Count:        ${overduePayments.length}\n`;
      r += `  Total:        ${formatCurrency(overdueTotal)}\n`;
      overduePayments.forEach((p) => {
        const platform = platforms.find((pl) => pl.id === p.platformId);
        r += `  · ${formatCurrency(p.amount)} on ${platform?.name || 'Unknown'}\n`;
      });
      r += `\n`;
    }

    r += `▸ INCOMING (14D)\n${line}\n`;
    r += `  Payments:     ${incoming.paymentCount}\n`;
    r += `  Total Due:    ${formatCurrency(incoming.grandTotal)}\n\n`;

    r += `▸ PLATFORM UTILIZATION\n${line}\n`;
    utilizations
      .filter((u) => u.limit > 0)
      .forEach((u) => {
        const platform = platforms.find((p) => p.id === u.platformId);
        const name = (platform?.name || 'Unknown').toUpperCase().padEnd(12);
        const pct = Math.round(u.percentage);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        r += `  ${name} ${bar} ${String(pct).padStart(3)}%\n`;
      });
    r += `\n`;

    r += `▸ CREDIT GROWTH\n${line}\n`;
    r += `  Starting:     ${formatCurrency(limitGrowth.startingTotal)}\n`;
    r += `  Current:      ${formatCurrency(limitGrowth.currentTotal)}\n`;
    r += `  Growth:       ${limitGrowth.growthAmount >= 0 ? '+' : ''}${formatCurrency(limitGrowth.growthAmount)}\n\n`;

    if (arbitrageStats.orderCount > 0) {
      r += `▸ ARBITRAGE\n${line}\n`;
      r += `  Orders:       ${arbitrageStats.orderCount}\n`;
      r += `  Deployed:     ${formatCurrency(arbitrageStats.totalPurchased)}\n`;
      r += `  Revenue:      ${formatCurrency(arbitrageStats.totalSaleAmount)}\n`;
      r += `  Net P&L:      ${arbitrageStats.totalNetCash >= 0 ? '+' : ''}${formatCurrency(Math.abs(arbitrageStats.totalNetCash))}\n\n`;
    }

    r += `${sep}\n  END OF REPORT\n${sep}\n`;
    return r;
  }, [creditUtil, utilizations, incoming, overduePayments, onTimeStreak, arbitrageStats, limitGrowth, orders, activeOrders, completedOrders, overdueTotal, platforms]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      showToast('Report copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">RECON REPORT</span>
          <button
            onClick={handleCopy}
            className="text-2xs uppercase tracking-wider text-terminal-muted hover:text-terminal-amber transition-colors"
          >
            COPY TO CLIPBOARD
          </button>
        </div>
        <div className="overflow-auto max-h-[500px] bg-dark-bg">
          <pre
            ref={reportRef}
            className="text-terminal-green text-2xs p-3 font-mono whitespace-pre leading-relaxed"
          >
            {report}
          </pre>
        </div>
      </div>
    </div>
  );
}
