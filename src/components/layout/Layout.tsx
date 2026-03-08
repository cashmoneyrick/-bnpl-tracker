import { useEffect } from 'react';
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
  const notificationSettings = useBNPLStore((state) => state.notificationSettings);
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);
  const liveModeEnabled = useBNPLStore((state) => state.liveModeEnabled);

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
    const ms = liveModeEnabled ? 30 * 1000 : 60 * 60 * 1000;
    const interval = setInterval(() => { updateOverdue(); }, ms);
    return () => clearInterval(interval);
  }, [liveModeEnabled]);

  useEffect(() => {
    if (!isInitialized) return;
    const platformNames: Record<string, string> = {};
    for (const platform of platforms) {
      platformNames[platform.id] = platform.name;
    }
    checkPaymentsAndNotify(payments, notificationSettings, platformNames);
  }, [isInitialized]);

  return (
    <div className="min-h-screen bg-dark-bg font-mono">
      <main className="overflow-auto">
        <div className="p-3 sm:p-2">
          <HomePage />
        </div>
      </main>
    </div>
  );
}
