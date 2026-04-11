import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

export default function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && session) navigate('/', { replace: true });
  }, [session, isPending, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) {
      setError(signInError.message ?? 'Invalid credentials');
      setLoading(false);
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '2rem',
        background: '#fff',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
      }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem' }}>SolutionDesk</h1>
        <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.6rem',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
