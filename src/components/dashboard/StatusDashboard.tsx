import {
  useOverallCreditUtilization,
  useIncomingPayments,
  useOverduePayments,
  getExposureStatus,
  getExposureColor,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

function StatusCell({
  label,
  value,
  subtext,
  statusWord,
  statusColorClass,
}: {
  label: string;
  value: string;
  subtext?: string;
  statusWord?: string;
  statusColorClass?: string;
}) {
  return (
    <div className="px-3 py-2.5 border border-dark-border bg-dark-card">
      <div className="terminal-label mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-bold metric-value ${statusColorClass || 'text-white'}`}>
        {value}
      </div>
      {statusWord && (
        <div className={`text-2xs font-bold uppercase tracking-wider mt-0.5 ${statusColorClass || 'text-terminal-muted'}`}>
          {statusWord}
        </div>
      )}
      {subtext && !statusWord && (
        <div className="text-2xs text-terminal-muted mt-0.5">{subtext}</div>
      )}
    </div>
  );
}

export function StatusDashboard() {
  const creditUtil = useOverallCreditUtilization();
  const { grandTotal, paymentCount } = useIncomingPayments(14);
  const overduePayments = useOverduePayments();

  const exposureStatus = getExposureStatus(creditUtil.percentage);
  const exposureColor = getExposureColor(exposureStatus);

  const overdueTotal = overduePayments.reduce((sum, p) => sum + p.amount, 0);
  const available = creditUtil.limit - creditUtil.used;

  // Overdue status
  const overdueStatus = overduePayments.length > 0 ? 'CRITICAL' : 'NOMINAL';
  const overdueColor = overduePayments.length > 0 ? 'text-terminal-red' : 'text-terminal-green';

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">STATUS</span>
          <span className="text-2xs text-terminal-muted">SYSTEM CHECK</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          <StatusCell
            label="EXPOSURE"
            value={`${Math.round(creditUtil.percentage)}%`}
            statusWord={exposureStatus}
            statusColorClass={exposureColor}
          />
          <StatusCell
            label="INCOMING"
            value={formatCurrency(grandTotal)}
            subtext={`${paymentCount} payments // 14D`}
          />
          <StatusCell
            label="AVAILABLE"
            value={formatCurrency(available)}
            subtext={`of ${formatCurrency(creditUtil.limit)}`}
          />
          <StatusCell
            label="OVERDUE"
            value={overduePayments.length > 0 ? formatCurrency(overdueTotal) : 'NONE'}
            statusWord={overdueStatus}
            statusColorClass={overdueColor}
          />
        </div>
      </div>
    </div>
  );
}
