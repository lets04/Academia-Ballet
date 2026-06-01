import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { DashboardPage } from '@/pages/dashboard-page';
import { StudentsPage } from '@/pages/students-page';
import { LoginPage } from '@/pages/login-page';
import { ProtectedRoute } from '@/components/protected-route';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StudentsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold">Gestión de Grupos</h1>
                  <p className="text-slate-500 mt-2">Próximamente...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/enrollments"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold">Gestión de Inscripciones</h1>
                  <p className="text-slate-500 mt-2">Próximamente...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold">Gestión de Pagos</h1>
                  <p className="text-slate-500 mt-2">Próximamente...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold">Gestión de Egresos</h1>
                  <p className="text-slate-500 mt-2">Próximamente...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;