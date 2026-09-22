'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { LogIn, AlertCircle } from 'lucide-react';

const roleHomePaths: Record<string, string> = {
  STUDENT: '/student/dashboard',
  FACULTY: '/faculty/dashboard',
  PLACEMENT_OFFICER: '/placement/dashboard',
  PLACEMENT_HEAD: '/placement/dashboard',
  RECRUITER: '/recruiter/dashboard',
  ADMIN: '/admin/dashboard',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Get user from localStorage after login sets it
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser) as { role: string };
        const redirectPath = roleHomePaths[user.role] ?? '/student/dashboard';
        router.push(redirectPath);
      } else {
        router.push('/student/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-8">
      <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded border-[var(--color-border)]" />
            <span className="text-[var(--color-muted)]">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full btn-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn size={16} />
              Sign In
            </span>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
