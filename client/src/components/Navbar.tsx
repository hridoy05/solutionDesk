import { useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <span className="text-lg font-bold">SolutionDesk</span>
      {session && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">{session.user.name}</span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
