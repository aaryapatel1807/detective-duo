'use client';

/**
 * Leave a case: pick one from the bank, add an optional short note, send
 * it. It appears on the other account's home "Left for you" slot.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailOpen } from 'lucide-react';
import { useMe } from '@/components/together/useMe';
import { leaveCase } from '@/lib/together/leftCases';
import { ALL_CASES } from '@/lib/cases/bank';

export default function LeaveCasePage() {
  const me = useMe();
  const [caseId, setCaseId] = useState(ALL_CASES[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const picked = useMemo(() => ALL_CASES.find((c) => c.id === caseId), [caseId]);

  const send = async () => {
    if (!me || !caseId) return;
    setBusy(true);
    await leaveCase(me.uid, caseId, note.trim());
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <section className="card mt-6 p-6 text-center">
          <p className="font-display text-2xl font-bold">Left for your partner.</p>
          <p className="mt-1 text-[var(--ink-dim)]">
            {picked?.title} is waiting on their home screen
            {note.trim() ? ', with your note attached.' : '.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/" className="btn btn-primary">Home</Link>
            <button type="button" className="btn" onClick={() => { setSent(false); setNote(''); }}>
              Leave another
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
      </div>
      <h1 className="mt-4 flex items-center gap-2 text-3xl font-bold">
        <MailOpen size={28} aria-hidden /> Leave a case
      </h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Pick a mystery, add a short note if you like, and it waits on your partner's
        home screen until they open it.
      </p>

      <section className="card mt-4 space-y-4 p-5">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Case
          <select
            className="input"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            aria-label="Case to leave"
          >
            {(['Easy', 'Medium', 'Hard', 'Expert'] as const).map((tier) => (
              <optgroup key={tier} label={tier}>
                {ALL_CASES.filter((c) => c.difficulty === tier).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.setting}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {picked && (
          <p className="text-sm text-[var(--ink-dim)]">
            {picked.suspects.length} suspects · {picked.clues.length} clues ·{' '}
            {picked.redHerrings.length} suspicious details.
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          A short note (optional)
          <textarea
            className="input min-h-20 w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thought this one was your kind of puzzle…"
            maxLength={280}
            aria-label="Note to attach"
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={send}
          disabled={busy || !me || !caseId}
        >
          {busy ? 'Sending…' : 'Send it'}
        </button>
      </section>
    </main>
  );
}
