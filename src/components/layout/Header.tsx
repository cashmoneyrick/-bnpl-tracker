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
    <header className="flex items-center justify-between px-2 py-1 border-b border-dark-border bg-dark-card text-terminal-text min-h-[28px]">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <span className="text-terminal-amber font-bold tracking-wider text-sm shrink-0">JOURNAL</span>
        <span className="text-terminal-amber font-semibold text-xs sm:hidden">{formatCurrency(totalOwed)}</span>
        <span className="text-dark-border hidden sm:inline">│</span>
        <span className="terminal-label hidden sm:inline">OWED</span>
        <span className="text-terminal-amber font-semibold hidden sm:inline">{formatCurrency(totalOwed)}</span>
        <span className="text-dark-border hidden sm:inline">│</span>
        <span className="terminal-label hidden sm:inline">ACTIVE</span>
        <span className="text-white font-semibold hidden sm:inline">{activeOrders}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span className="text-terminal-muted text-2xs hidden md:inline">{format(new Date(), 'EEE dd MMM yyyy HH:mm').toUpperCase()}</span>
        <span className="text-dark-border hidden md:inline">│</span>
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
