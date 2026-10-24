'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      router.replace('/');
    } else {
      setNote('Account made. Check your email to confirm it, then sign in.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16">
      <section className="card mt-6 p-6">
        <h1 className="text-2xl font-bold">Make your account</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          One account each. Your levels and stars follow you across devices.
        </p>
        {!isSupabaseConfigured ? (
          <p className="panel mt-4 p-4 text-sm">
            Accounts are not wired up yet — the Supabase keys are still being set up.{' '}
            <Link href="/" className="underline">Back to the games</Link>
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Your name
              <input
                className="input"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
              />
            </label>
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
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-semibold text-[var(--bad)]">
                {error}
              </p>
            )}
            {note && <p className="text-sm font-semibold">{note}</p>}
            <button type="submit" className="btn btn-primary mt-1" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
            <p className="text-sm text-[var(--ink-dim)]">
              Already have one? <Link href="/login" className="underline">Sign in</Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
