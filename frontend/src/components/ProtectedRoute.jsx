import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-label="Loading" />
    </div>
  );
}

// Wrap private routes in this. Not logged in -> redirected to /login (and sent back afterwards).
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

// For /login and /register: if you're already logged in, skip straight to the dashboard.
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
