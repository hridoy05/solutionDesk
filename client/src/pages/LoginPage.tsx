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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl border border-gray-200">
        <h1 className="text-2xl font-semibold mb-1">SolutionDesk</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`px-3 py-2 text-sm rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-gray-900`}
            />
            {errors.email && (
              <span className="text-red-600 text-xs">{errors.email.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className={`px-3 py-2 text-sm rounded-md border ${errors.password ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-gray-900`}
            />
            {errors.password && (
              <span className="text-red-600 text-xs">{errors.password.message}</span>
            )}
          </div>

          {errors.root && (
            <p className="text-red-600 text-sm">{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2 bg-gray-900 text-white text-sm rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
