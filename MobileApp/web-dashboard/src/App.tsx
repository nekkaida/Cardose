import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded page components
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = React.lazy(() => import('./pages/CustomerDetailPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const FinancialPage = React.lazy(() => import('./pages/FinancialPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const ProductionPage = React.lazy(() => import('./pages/ProductionPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

/**
 * Role-based route guard.
 * Redirects to /dashboard if the current user's role is not in allowedRoles.
 */
function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="mt-4 text-lg text-gray-500">Page not found</p>
      <a href="/dashboard" className="mt-4 text-primary-600 underline hover:text-primary-800">
        Go to Dashboard
      </a>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-500">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/production" element={<ProductionPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/users"
                element={
                  <RoleGuard allowedRoles={['owner', 'manager']}>
                    <UsersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleGuard allowedRoles={['owner', 'manager']}>
                    <SettingsPage />
                  </RoleGuard>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <ApiProvider>
            <Router>
              <AppContent />
            </Router>
          </ApiProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
