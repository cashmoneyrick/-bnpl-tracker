import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="dark bg-dark-bg min-h-screen text-white">
          <ErrorBoundary>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
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
