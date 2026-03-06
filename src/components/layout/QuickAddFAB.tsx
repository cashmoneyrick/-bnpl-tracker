import { useBNPLStore } from '../../store';

export function QuickAddFAB() {
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  return (
    <button
      onClick={openQuickAddModal}
      className="fixed bottom-6 right-4 sm:bottom-8 sm:right-3 px-4 py-2 sm:px-3 sm:py-1 bg-terminal-amber text-dark-bg font-mono text-2xs font-bold uppercase tracking-wider hover:brightness-110 active:brightness-90 transition-all z-40 border border-terminal-amber/50"
      aria-label="Quick Add Order"
    >
      + ADD
    </button>
  );
}
