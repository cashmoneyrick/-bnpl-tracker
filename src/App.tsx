import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { SettingsModal } from './components/modals/SettingsModal';

function App() {
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
        <ErrorBoundary>
          <SettingsModal />
        </ErrorBoundary>
      </div>
    </ToastProvider>
  );
}

export default App;
