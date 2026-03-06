import { useBNPLStore } from '../../store';

export function QuickAddFAB() {
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);

  return (
    <button
      onClick={openQuickAddModal}
      className="fixed bottom-8 right-3 px-3 py-1 bg-terminal-amber text-dark-bg font-mono text-2xs font-bold uppercase tracking-wider hover:brightness-110 transition-all z-40 border border-terminal-amber/50"
      aria-label="Quick Add Order"
    >
      + ADD
    </button>
  );
}
