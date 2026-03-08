import { useState, useCallback } from 'react';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { useIncomingPayments, useRiskClusters, type IncomingDay, type RiskCluster } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

// ─── Risk Cluster Alert ──────────────────────────────────────────────────────

function RiskClusterAlert({ cluster }: { cluster: RiskCluster }) {
  const spanLabel = cluster.daySpan === 0
    ? 'SAME DAY'
    : `${cluster.daySpan}D WINDOW`;

  return (
    <div className="cluster-alert px-3 py-2 my-1 mx-1 flex items-center justify-between text-2xs">
      <div className="flex items-center gap-2">
        <span className="text-terminal-amber font-bold">▲ CLUSTER</span>
        <span className="text-dark-border">│</span>
        <span className="text-terminal-amber">
          {cluster.payments.length} payments in {spanLabel}
        </span>
      </div>
      <span className="text-terminal-amber font-semibold">
        {formatCurrency(cluster.totalAmount)}
      </span>
    </div>
  );
}

// ─── Payment Row ─────────────────────────────────────────────────────────────

function PaymentRow({
  payment,
  isOverdue,
  batchMode,
  isSelected,
  onToggleSelect,
}: {
  payment: IncomingDay['payments'][0];
  isOverdue?: boolean;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { showToast } = useToast();
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const openOrderDetailModal = useBNPLStore((state) => state.openOrderDetailModal);
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);

  const [isMarking, setIsMarking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const platform = platforms.find((p) => p.id === payment.platformId);
  const order = orders.find((o) => o.id === payment.orderId);
  const { paid, total } = payment.orderProgress;

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarking(true);
    try {
      await markPaymentPaid(payment.id);
      setShowSuccess(true);
      showToast('Payment marked as paid', 'success');
    } catch {
      showToast('Failed to mark payment', 'error');
    } finally {
      setIsMarking(false);
    }
  };

  const handleRowClick = () => {
    if (batchMode && onToggleSelect) {
      onToggleSelect(payment.id);
    } else {
      openOrderDetailModal(payment.orderId);
    }
  };

  const progressBarColor = (i: number) => {
    if (i < paid) return 'bg-terminal-green/60';
    if (i === paid) return isOverdue ? 'bg-terminal-red' : 'bg-terminal-amber';
    return 'bg-dark-border';
  };

  const btnClass = isOverdue
    ? 'bg-terminal-red/10 border-terminal-red/30 text-terminal-red hover:bg-terminal-red/20 active:bg-terminal-red/20'
    : 'bg-terminal-amber/10 border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/20 active:bg-terminal-amber/20';

  return (
    <div
      onClick={handleRowClick}
      className={`py-2.5 sm:py-1.5 px-3 border-b border-dark-border/50 last:border-0 cursor-pointer row-glow active:bg-dark-hover transition-colors text-xs ${
        batchMode && isSelected ? 'bg-terminal-amber/5' : ''
      }`}
    >
      {/* Mobile: two-line layout */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {batchMode && (
              <span className={`w-3 h-3 border flex-shrink-0 flex items-center justify-center text-2xs ${
                isSelected ? 'border-terminal-amber bg-terminal-amber/20 text-terminal-amber' : 'border-dark-border'
              }`}>
                {isSelected ? '✓' : ''}
              </span>
            )}
            <span className="text-white font-semibold whitespace-nowrap">{formatCurrency(payment.amount)}</span>
            <span style={{ color: platform?.color }} className="uppercase text-2xs font-medium truncate">
              {platform?.name}
            </span>
            {order?.storeName && (
              <span className="text-terminal-muted text-2xs truncate">
                {order.storeName}
              </span>
            )}
          </div>
          <span className="text-terminal-muted text-2xs font-mono flex-shrink-0 ml-2">
            {paid + 1}/{total}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-px">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className={`w-3 h-1 ${progressBarColor(i)}`} />
            ))}
          </div>
          {!batchMode && (
            <button
              onClick={handleMarkPaid}
              disabled={isMarking || showSuccess}
              className={`px-3 py-1 text-2xs uppercase tracking-wider border transition-colors disabled:opacity-50 ${btnClass}`}
            >
              {showSuccess ? '✓ PAID' : isMarking ? '...' : 'MARK PAID'}
            </button>
          )}
        </div>
      </div>

      {/* Desktop: single-line layout */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {batchMode && (
            <span className={`w-3 h-3 border flex-shrink-0 flex items-center justify-center text-2xs ${
              isSelected ? 'border-terminal-amber bg-terminal-amber/20 text-terminal-amber' : 'border-dark-border'
            }`}>
              {isSelected ? '✓' : ''}
            </span>
          )}
          <span className="text-white font-semibold whitespace-nowrap">{formatCurrency(payment.amount)}</span>
          <span className="text-dark-border">│</span>
          <span style={{ color: platform?.color }} className="uppercase text-2xs font-medium">
            {platform?.name}
          </span>
          {order?.storeName && (
            <>
              <span className="text-dark-border">│</span>
              <span className="text-terminal-muted text-2xs truncate">{order.storeName}</span>
            </>
          )}
          <span className="text-dark-border">│</span>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-px">
              {Array.from({ length: total }, (_, i) => (
                <div key={i} className={`w-2.5 h-1 ${progressBarColor(i)}`} />
              ))}
            </div>
            <span className="text-terminal-muted text-2xs font-mono">
              {paid + 1}/{total}
            </span>
          </div>
        </div>
        {!batchMode && (
          <button
            onClick={handleMarkPaid}
            disabled={isMarking || showSuccess}
            className={`px-2 py-0.5 text-2xs uppercase tracking-wider border transition-colors disabled:opacity-50 ${btnClass}`}
          >
            {showSuccess ? '✓ PAID' : isMarking ? '...' : 'MARK PAID'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Day Group ───────────────────────────────────────────────────────────────

function DayGroup({
  day,
  isOverdue,
  clusterForDate,
  batchMode,
  selectedIds,
  onToggleSelect,
}: {
  day: IncomingDay;
  isOverdue?: boolean;
  clusterForDate?: RiskCluster;
  batchMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <div className="mb-1">
      {/* Date header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-dark-bg/50">
        <div className="flex items-center gap-2">
          {isOverdue && <span className="w-2 h-2 bg-terminal-red animate-subtle-pulse" />}
          <span className={`text-2xs font-bold uppercase tracking-wider ${isOverdue ? 'text-terminal-red' : 'text-terminal-amber'}`}>
            {day.label}
          </span>
          <span className="text-terminal-muted text-2xs">
            {day.payments.length} payment{day.payments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className={`text-2xs font-semibold ${isOverdue ? 'text-terminal-red' : 'text-terminal-amber'}`}>
          {formatCurrency(day.dayTotal)}
        </span>
      </div>

      {/* Risk cluster alert for this date range */}
      {clusterForDate && <RiskClusterAlert cluster={clusterForDate} />}

      {/* Payments */}
      {day.payments.map((payment) => (
        <PaymentRow
          key={payment.id}
          payment={payment}
          isOverdue={isOverdue}
          batchMode={batchMode}
          isSelected={selectedIds?.has(payment.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function IncomingPayments() {
  const { days, overdue, grandTotal, paymentCount } = useIncomingPayments(14);
  const riskClusters = useRiskClusters(3);
  const batchMarkPaid = useBNPLStore((state) => state.batchMarkPaid);
  const { showToast } = useToast();

  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatching, setIsBatching] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchPay = async () => {
    if (selectedIds.size === 0) return;
    setIsBatching(true);
    try {
      const count = await batchMarkPaid(Array.from(selectedIds));
      showToast(`${count} payment${count !== 1 ? 's' : ''} marked as paid`, 'success');
      setSelectedIds(new Set());
      setBatchMode(false);
    } catch {
      showToast('Batch operation failed', 'error');
    } finally {
      setIsBatching(false);
    }
  };

  const exitBatch = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
  };

  // Collect all payment IDs for select-all
  const allPaymentIds: string[] = [];
  if (overdue) overdue.payments.forEach((p) => allPaymentIds.push(p.id));
  days.forEach((d) => d.payments.forEach((p) => allPaymentIds.push(p.id)));

  const selectAll = () => setSelectedIds(new Set(allPaymentIds));

  // Match clusters to dates for inline display
  const getClusterForDate = (dateKey: string): RiskCluster | undefined => {
    return riskClusters.find((c) => c.startDate === dateKey);
  };

  if (paymentCount === 0) {
    return (
      <div className="hud-section">
        <div className="hud-section-inner relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
            <span className="terminal-label">INCOMING</span>
            <span className="text-2xs text-terminal-muted">NEXT 14D</span>
          </div>
          <div className="text-center py-8 px-4">
            <p className="text-terminal-green text-xs font-medium">ALL CLEAR</p>
            <p className="text-terminal-muted text-2xs mt-1">No payments due in the next 14 days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <span className="terminal-label">INCOMING</span>
            <span className="text-dark-border">│</span>
            <span className="text-terminal-muted text-2xs">
              {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {batchMode ? (
              <>
                <button
                  onClick={selectAll}
                  className="text-2xs text-terminal-muted hover:text-terminal-amber transition-colors uppercase tracking-wider"
                >
                  ALL
                </button>
                <span className="text-dark-border">│</span>
                <button
                  onClick={handleBatchPay}
                  disabled={selectedIds.size === 0 || isBatching}
                  className="text-2xs text-terminal-green font-bold uppercase tracking-wider hover:text-terminal-green/80 transition-colors disabled:opacity-30"
                >
                  PAY {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
                <span className="text-dark-border">│</span>
                <button
                  onClick={exitBatch}
                  className="text-2xs text-terminal-muted hover:text-terminal-red transition-colors uppercase tracking-wider"
                >
                  CANCEL
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setBatchMode(true)}
                  className="text-2xs text-terminal-muted hover:text-terminal-amber transition-colors uppercase tracking-wider"
                >
                  BATCH
                </button>
                <span className="text-dark-border">│</span>
                <span className="text-2xs text-terminal-muted">NEXT 14D</span>
                <span className="text-dark-border">│</span>
                <span className="text-xs text-white font-semibold metric-value">
                  {formatCurrency(grandTotal)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Overdue section */}
        {overdue && (
          <div className="border-b-2 border-terminal-red/30 bg-terminal-red/5">
            <DayGroup
              day={overdue}
              isOverdue
              batchMode={batchMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>
        )}

        {/* Upcoming days */}
        <div>
          {days.map((day) => (
            <DayGroup
              key={day.date}
              day={day}
              clusterForDate={getClusterForDate(day.date)}
              batchMode={batchMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
