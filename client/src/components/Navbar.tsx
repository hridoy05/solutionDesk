import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Role } from '../lib/constants';

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
      <Link to="/" className="text-lg font-bold hover:opacity-80 transition-opacity">SolutionDesk</Link>
      {session && (
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm hover:underline">Dashboard</Link>
          <Link to="/tickets" className="text-sm hover:underline">Tickets</Link>
          {session.user.role === Role.admin && (
            <Link to="/users" className="text-sm hover:underline">Users</Link>
          )}
          <span className="text-sm text-muted-foreground">{session.user.name}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      )}
    </nav>
  );
}
