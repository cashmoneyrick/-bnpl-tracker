import { useEffect } from 'react';
import { Header } from './Header';
import { useBNPLStore } from '../../store';
import { useTotalOwed } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { checkPaymentsAndNotify } from '../../services/notifications';
import { HomePage } from '../../pages/HomePage';

export function Layout() {
  const totalOwed = useTotalOwed();
  const initialize = useBNPLStore((state) => state.initialize);
  const isInitialized = useBNPLStore((state) => state.isInitialized);
  const payments = useBNPLStore((state) => state.payments);
  const platforms = useBNPLStore((state) => state.platforms);
  const orders = useBNPLStore((state) => state.orders);
  const notificationSettings = useBNPLStore((state) => state.notificationSettings);
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    document.title = `Journal — ${formatCurrency(totalOwed)} owed`;
  }, [totalOwed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openQuickAddModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openQuickAddModal]);

  useEffect(() => {
    const updateOverdue = useBNPLStore.getState().updateOverduePayments;
    const interval = setInterval(() => { updateOverdue(); }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const platformNames: Record<string, string> = {};
    for (const platform of platforms) {
      platformNames[platform.id] = platform.name;
    }
    checkPaymentsAndNotify(payments, notificationSettings, platformNames);
  }, [isInitialized]);

  const activeOrders = orders.filter((o) => o.status === 'active').length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col font-mono">
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="p-2">
          <HomePage />
        </div>
      </main>
      {/* Status Bar */}
      <footer className="px-2 py-1 border-t border-dark-border bg-dark-card flex items-center justify-between text-2xs text-terminal-muted">
        <div className="flex items-center gap-3">
          <span className="text-terminal-amber">JOURNAL v1.0</span>
          <span className="text-dark-border">│</span>
          <span>{activeOrders} ACTIVE</span>
          <span className="text-dark-border">│</span>
          <span>{completedOrders} COMPLETED</span>
          <span className="text-dark-border">│</span>
          <span>{platforms.length} PLATFORMS</span>
        </div>
        <div className="flex items-center gap-3">
          <span>⌘N ADD</span>
          <span className="text-dark-border">│</span>
          <span>GEAR CONFIG</span>
        </div>
      </footer>
    </div>
  );
}
