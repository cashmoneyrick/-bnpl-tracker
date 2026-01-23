import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { QuickAddFAB } from './QuickAddFAB';
import { useBNPLStore } from '../../store';
import { useTotalOwed } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const totalOwed = useTotalOwed();
  const initialize = useBNPLStore((state) => state.initialize);
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Update document title
  useEffect(() => {
    document.title = `BNPL Tracker — ${formatCurrency(totalOwed)} owed`;
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
