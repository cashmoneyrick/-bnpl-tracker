import { useBNPLStore } from '../../store';

export function QuickAddFAB() {
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  return (
    <button
      onClick={openQuickAddModal}
      className="fixed bottom-10 right-4 px-3 py-1.5 bg-terminal-amber text-dark-bg font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all z-40 border border-terminal-amber/50"
      aria-label="Quick Add Order"
    >
      + ADD
    </button>
  );
}
