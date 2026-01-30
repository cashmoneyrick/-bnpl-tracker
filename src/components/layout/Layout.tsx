import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { QuickAddFAB } from './QuickAddFAB';
import { useBNPLStore } from '../../store';
import { useTotalOwed } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { checkPaymentsAndNotify } from '../../services/notifications';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const totalOwed = useTotalOwed();
  const initialize = useBNPLStore((state) => state.initialize);
  const isInitialized = useBNPLStore((state) => state.isInitialized);
  const payments = useBNPLStore((state) => state.payments);
  const platforms = useBNPLStore((state) => state.platforms);
  const notificationSettings = useBNPLStore((state) => state.notificationSettings);
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Update document title
  useEffect(() => {
    document.title = `Journal — ${formatCurrency(totalOwed)} owed`;
  }, [totalOwed]);

  // Keyboard shortcut for Quick Add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N to open Quick Add
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openQuickAddModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openQuickAddModal]);

  // Check for overdue payments periodically
  useEffect(() => {
    const updateOverdue = useBNPLStore.getState().updateOverduePayments;

    // Check every hour
    const interval = setInterval(() => {
      updateOverdue();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Check for payment notifications on app load
  useEffect(() => {
    if (!isInitialized) return;

    // Build platform name map
    const platformNames: Record<string, string> = {};
    for (const platform of platforms) {
      platformNames[platform.id] = platform.name;
    }

    // Check and show notifications
    checkPaymentsAndNotify(payments, notificationSettings, platformNames);
  }, [isInitialized]); // Only run once when store initializes

  return (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
      <QuickAddFAB />
    </div>
  );
}
