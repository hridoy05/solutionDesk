import { Navigate, Outlet } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

export default function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
