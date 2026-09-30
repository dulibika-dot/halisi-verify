import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ADMIN_NAV, MANUFACTURER_NAV } from './layouts/navigation';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PublicSmsPage } from './pages/public/PublicSmsPage';
import { SimulatorPage } from './pages/shared/SimulatorPage';
// Manufacturer app
import { ManufacturerDashboard } from './pages/manufacturer/DashboardPage';
import { ProductsPage } from './pages/manufacturer/ProductsPage';
import { BatchesPage } from './pages/manufacturer/BatchesPage';
import { CodesPage } from './pages/manufacturer/CodesPage';
import { ActivityPage } from './pages/manufacturer/ActivityPage';
import { ManufacturerReportsPage } from './pages/manufacturer/ReportsPage';
import { ProfilePage } from './pages/manufacturer/ProfilePage';
// Admin dashboard
import { AdminDashboard } from './pages/admin/DashboardPage';
import { ManufacturersPage } from './pages/admin/ManufacturersPage';
import { AdminProductsPage } from './pages/admin/ProductsPage';
import { VerificationLogsPage } from './pages/admin/VerificationLogsPage';
import { SuspiciousActivityPage } from './pages/admin/SuspiciousActivityPage';
import { CounterfeitReportsPage } from './pages/admin/CounterfeitReportsPage';
import { HotspotsPage } from './pages/admin/HotspotsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* Public SMS verification demo — no login needed */}
            <Route path="/sms" element={<PublicSmsPage />} />

            <Route
              path="/manufacturer"
              element={
                <ProtectedRoute role="manufacturer">
                  <DashboardLayout sections={MANUFACTURER_NAV} portalLabel="Manufacturer Portal" alertsPath="/manufacturer/activity" />
                </ProtectedRoute>
              }
            >
              <Route index element={<ManufacturerDashboard />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="batches" element={<BatchesPage />} />
              <Route path="codes" element={<CodesPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="reports" element={<ManufacturerReportsPage />} />
              <Route path="simulator" element={<SimulatorPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <DashboardLayout sections={ADMIN_NAV} portalLabel="Admin Console" alertsPath="/admin/suspicious" />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="manufacturers" element={<ManufacturersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="logs" element={<VerificationLogsPage />} />
              <Route path="suspicious" element={<SuspiciousActivityPage />} />
              <Route path="reports" element={<CounterfeitReportsPage />} />
              <Route path="hotspots" element={<HotspotsPage />} />
              <Route path="simulator" element={<SimulatorPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
