import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { CanvasPage } from './pages/CanvasPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="dark bg-dark-bg min-h-screen text-white">
          <ErrorBoundary>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/budgeting" element={<DashboardPage />} />
                <Route path="/budgeting/analytics" element={<AnalyticsPage />} />
                <Route path="/budgeting/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/canvas" element={<CanvasPage />} />
              </Routes>
            </Layout>
          </ErrorBoundary>
          <ErrorBoundary>
            <QuickAddModal />
          </ErrorBoundary>
          <ErrorBoundary>
            <OrderDetailModal />
          </ErrorBoundary>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
