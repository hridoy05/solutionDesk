import { Navigate, Outlet } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
