import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { useBNPLStore } from './store';
import { applyTheme, resolvePreset } from './hooks/useTheme';

function App() {
  const activeThemePresetId = useBNPLStore((s) => s.activeThemePresetId);
  const customThemePresets = useBNPLStore((s) => s.customThemePresets);

  useEffect(() => {
    const preset = resolvePreset(activeThemePresetId, customThemePresets);
    applyTheme(preset.colors);
  }, [activeThemePresetId, customThemePresets]);

  return (
    <ToastProvider>
      <div className="dark bg-dark-bg min-h-screen text-white">
        <ErrorBoundary>
          <Layout />
        </ErrorBoundary>
        <ErrorBoundary>
          <QuickAddModal />
        </ErrorBoundary>
        <ErrorBoundary>
          <OrderDetailModal />
        </ErrorBoundary>
      </div>
    </ToastProvider>
  );
}

export default App;
