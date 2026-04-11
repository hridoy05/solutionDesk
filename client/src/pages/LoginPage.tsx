import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '../lib/auth-client';

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!isPending && session) navigate('/', { replace: true });
  }, [session, isPending, navigate]);

  async function onSubmit(data: LoginFormData) {
    const { error: signInError } = await authClient.signIn.email(data);
    if (signInError) {
      setError('root', { message: signInError.message ?? 'Invalid credentials' });
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

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              style={{ padding: '0.5rem 0.75rem', border: `1px solid ${errors.email ? '#dc2626' : '#d1d5db'}`, borderRadius: '6px', fontSize: '0.9rem' }}
            />
            {errors.email && (
              <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.email.message}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              style={{ padding: '0.5rem 0.75rem', border: `1px solid ${errors.password ? '#dc2626' : '#d1d5db'}`, borderRadius: '6px', fontSize: '0.9rem' }}
            />
            {errors.password && (
              <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.password.message}</span>
            )}
          </div>

          {errors.root && (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.85rem' }}>{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '0.6rem',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
