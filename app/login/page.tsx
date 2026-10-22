'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError('That email and password do not match. Try again.');
    } else {
      router.replace('/');
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16">
      <section className="card mt-6 p-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Sign in to pick up your puzzles where you left them.
        </p>
        {!isSupabaseConfigured ? (
          <p className="panel mt-4 p-4 text-sm">
            Sign-in is not wired up yet — the Supabase keys are still being set up.
            The app works in local mode until then.{' '}
            <Link href="/" className="underline">Back to the games</Link>
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Email
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Password
              <input
                className="input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-semibold text-[var(--bad)]">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-1" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-sm text-[var(--ink-dim)]">
              New here? <Link href="/signup" className="underline">Create an account</Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
