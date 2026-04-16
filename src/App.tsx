import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
const Login = React.lazy(() => import('@/pages/Login'));
const Register = React.lazy(() => import('@/pages/Register'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const MeetingDetail = React.lazy(() => import('@/pages/MeetingDetail'));
const MeetingExecution = React.lazy(() => import('@/pages/MeetingExecution'));
const LandingPage = React.lazy(() => import('@/pages/LandingPage'));
import { Toaster } from '@/components/ui/sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  React.useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('fetch') || event.reason?.name === 'TypeError') {
        console.error('Erro de rede detectado:', event.reason);
      }
    };
    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <React.Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/meeting/:id" element={<MeetingDetail />} />
            </Route>

            <Route path="/meeting/:id/execute" element={<ProtectedRoute><MeetingExecution /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
