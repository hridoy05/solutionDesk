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
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1.5rem',
      borderBottom: '1px solid #e5e7eb',
      background: '#fff',
    }}>
      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>SolutionDesk</span>
      {session && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#374151' }}>
            {session.user.name}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.35rem 0.85rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
