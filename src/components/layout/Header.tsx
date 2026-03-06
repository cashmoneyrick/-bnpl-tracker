import { useBNPLStore } from '../../store';
import { useTotalOwed } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';

export function Header() {
  const openSettingsModal = useBNPLStore((state) => state.openSettingsModal);
  const orders = useBNPLStore((state) => state.orders);
  const totalOwed = useTotalOwed();

  const activeOrders = orders.filter((o) => o.status === 'active').length;

  return (
    <header className="flex items-center justify-between px-2 py-1 border-b border-dark-border bg-dark-card text-terminal-text">
      <div className="flex items-center gap-4">
        <span className="text-terminal-amber font-bold tracking-wider text-sm">JOURNAL</span>
        <span className="text-dark-border">│</span>
        <span className="terminal-label">OWED</span>
        <span className="text-terminal-amber font-semibold">{formatCurrency(totalOwed)}</span>
        <span className="text-dark-border">│</span>
        <span className="terminal-label">ACTIVE</span>
        <span className="text-white font-semibold">{activeOrders}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-terminal-muted text-2xs">{format(new Date(), 'EEE dd MMM yyyy HH:mm').toUpperCase()}</span>
        <span className="text-dark-border">│</span>
        <button
          onClick={openSettingsModal}
          className="text-terminal-muted hover:text-terminal-amber transition-colors text-2xs uppercase tracking-wider"
          title="Settings"
          aria-label="Settings"
        >
          CONFIG
        </button>
      </div>
    </header>
  );
}
