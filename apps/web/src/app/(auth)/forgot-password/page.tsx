'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-[#5B2A86]">
              PlaceCampus
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligent University Placement Readiness
          </p>
        </div>
      <div className="card p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} className="text-[var(--color-success)]" />
        </div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-[var(--color-muted)]">
          If an account exists with <strong>{email}</strong>, we&apos;ve sent a
          password reset link.
        </p>
        <Link href="/login" className="btn btn-primary inline-flex">
          <ArrowLeft size={16} />
          Back to Sign In
        </Link>
      </div>
      </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-[#5B2A86]">
              PlaceCampus
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligent University Placement Readiness
          </p>
        </div>
    <div className="card p-8">
      <h2 className="text-xl font-semibold mb-2">Reset your password</h2>
      <p className="text-sm text-[var(--color-muted)] mb-6">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

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
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full btn-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Mail size={16} />
              Send Reset Link
            </span>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        <Link
          href="/login"
          className="text-[var(--color-primary)] hover:underline font-medium flex items-center justify-center gap-1"
        >
          <ArrowLeft size={14} />
          Back to Sign In
        </Link>
      </p>
    </div>
    </div>
    </div>
  );
}
