import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import OrderManagement from './pages/OrderManagement';
import KitchenDisplay from './pages/KitchenDisplay';
import TableManagement from './pages/TableManagement';
import MenuManagement from './pages/MenuManagement';
import Billing from './pages/Billing';
import InventoryManagement from './pages/InventoryManagement';
import StaffManagement from './pages/StaffManagement';
import CustomerCRM from './pages/CustomerCRM';
import Reports from './pages/Reports';
import AIHub from './pages/AIHub';
import Settings from './pages/Settings';
import DigitalTwin from './pages/DigitalTwin';

import QRLogin from './pages/QRLogin';
import CustomerMenu from './pages/CustomerMenu';
import QRManagement from './pages/QRManagement';

// Auth Guard Component
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f5f6fa]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin"/>
        <p className="text-sm font-bold text-slate-400">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/welcome" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="light"
            toastStyle={{ fontSize: '13px', fontWeight: '600' }}
          />
          <Routes>
          {/* Public Routes */}
          <Route path="/welcome" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/qr-login" element={<QRLogin />} />
          {/* Customer-facing QR ordering — public, no auth */}
          <Route path="/qr-order/:tableId" element={<CustomerMenu />} />

          {/* Protected Main App Layout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="tables" element={<TableManagement />} />
            <Route path="qr-management" element={<QRManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="kitchen" element={<KitchenDisplay />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="billing" element={<Billing />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="customers" element={<CustomerCRM />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai-hub" element={<AIHub />} />
            <Route path="settings" element={<Settings />} />
            <Route path="digital-twin" element={<DigitalTwin />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </AuthProvider>
  );
}

export default App;
