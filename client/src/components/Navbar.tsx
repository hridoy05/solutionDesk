import { useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
      <span className="text-lg font-bold">SolutionDesk</span>
      {session && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{session.user.name}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      )}
    </nav>
  );
}
