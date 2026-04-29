import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import KitchenDisplayPage from './pages/KitchenDisplayPage';
import MenuManagePage from './pages/MenuManagePage';
import ReportsPage from './pages/ReportsPage';
import AIPredictPage from './pages/AIPredictPage';
import AdminSetupPage from './pages/AdminSetupPage';
import OrderVerifyPage from './pages/OrderVerifyPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <main>{children}</main>
  </div>
);

const RoleRedirect: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Setup — accessible while logged in (no role restriction) */}
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AdminSetupPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Student routes */}
          <Route
            path="/menu"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppLayout>
                  <MenuPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppLayout>
                  <CartPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppLayout>
                  <OrdersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Staff + Admin routes */}
          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={['canteen_staff', 'canteen_admin']}>
                <AppLayout>
                  <KitchenDisplayPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu-manage"
            element={
              <ProtectedRoute allowedRoles={['canteen_staff', 'canteen_admin']}>
                <AppLayout>
                  <MenuManagePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['canteen_admin']}>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-predict"
            element={
              <ProtectedRoute allowedRoles={['canteen_admin']}>
                <AppLayout>
                  <AIPredictPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* QR code verification page — accessible by everyone logged in */}
          <Route
            path="/verify/:orderId"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <OrderVerifyPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
