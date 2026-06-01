import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Loader from './components/Loader';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard'));

// Redirect based on user role
const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'customer' ? '/customer' : '/delivery'} replace />;
};

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <SocketProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader size="lg" text="Loading..." />
              </div>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Customer Route */}
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRole="customer">
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Delivery Route */}
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute allowedRole="delivery">
                    <DeliveryDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
