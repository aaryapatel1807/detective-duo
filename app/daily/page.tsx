'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Flame,
  KeyRound,
  LayoutGrid,
  BookOpenText,
} from 'lucide-react';
import {
  computeStreak,
  getDailySet,
  getISTDateString,
  loadDailyState,
  recordDailyCompletion,
  touchDailyProgress,
  type DailyState,
} from '@/lib/daily';
import EmptyState from '@/components/EmptyState';
import { dailyAllDone, emptyDaily } from '@/lib/emptyStates';

type Mark = 0 | 1 | 2; // blank, filled, crossed

export default function DailyPage() {
  const today = useMemo(() => getISTDateString(), []);
  const set = useMemo(() => getDailySet(today), [today]);
  const [state, setState] = useState<DailyState>({ completions: {} });
  const [cipherInput, setCipherInput] = useState('');
  const [cipherMsg, setCipherMsg] = useState<string | null>(null);
  const [cipherHint, setCipherHint] = useState(false);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [nonoMsg, setNonoMsg] = useState<string | null>(null);

  useEffect(() => {
    setState(loadDailyState());
  }, []);

  const day = state.completions[today] ?? {};
  const streak = computeStreak(state, today);

  const complete = (part: 'cipher' | 'nonogram' | 'case') => {
    setState((s) => {
      const next = recordDailyCompletion(s, today, part);
      return next;
    });
    touchDailyProgress();
  };

  const checkCipher = () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (norm(cipherInput) === norm(set.cipher.plain)) {
      setCipherMsg('Decoded. Lovely work.');
      complete('cipher');
    } else {
      setCipherMsg('Not quite. Read it back slowly — every letter shifted the same way.');
    }
  };

  const cycleMark = (r: number, c: number) => {
    const k = `${r}:${c}`;
    setMarks((m) => ({ ...m, [k]: (((m[k] ?? 0) + 1) % 3) as Mark }));
  };

  const checkNonogram = () => {
    let wrong = false;
    for (let r = 0; r < set.nonogram.size; r++) {
      for (let c = 0; c < set.nonogram.size; c++) {
        const filled = marks[`${r}:${c}`] === 1;
        if (filled !== set.nonogram.solution[r][c]) wrong = true;
      }
    }
    if (wrong) {
      setNonoMsg('Some squares do not match yet. The row and column numbers are the whole clue.');
    } else {
      setNonoMsg('That picture is exactly right.');
      complete('nonogram');
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Daily Desk</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[var(--ink-dim)]">
        <CalendarDays size={18} aria-hidden /> {today}
        <span className="chip">
          <Flame size={14} aria-hidden />
          {streak === 0
            ? 'No streak yet — today is a fine day to start'
            : `${streak} day${streak === 1 ? '' : 's'} in a row`}
        </span>
      </p>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Three small things, fresh each morning (IST). Missing a day never takes anything away.
      </p>

      {/* Empty / complete states: never a blank desk. */}
      <div className="mt-4">
        {!day.cipher && !day.nonogram && !day.case ? (
          <EmptyState state={emptyDaily()} />
        ) : day.cipher && day.nonogram && day.case ? (
          <EmptyState state={dailyAllDone()} />
        ) : null}
      </div>

      {/* Daily Case */}
      <section className="card mt-5 p-4 sm:p-5" id="case">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <BookOpenText size={20} aria-hidden /> Daily Case
        </h2>
        {set.dailyCase ? (
          <>
            <p className="mt-1 font-semibold">{set.dailyCase.title}</p>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">{set.dailyCase.blurb}</p>
            <Link href={`/play/case-files`} className="btn btn-primary mt-3">
              Open the case
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            No case in today&apos;s set — try the cipher and nonogram below, and a fresh
            case comes tomorrow.
          </p>
        )}
      </section>

      {/* Daily Cipher */}
      <section className="card mt-5 p-4 sm:p-5" id="cipher">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <KeyRound size={20} aria-hidden /> {set.cipher.title}
          {day.cipher && <span className="chip">Done today</span>}
        </h2>
        <p className="paper mt-3 p-3 font-hand text-xl leading-relaxed">{set.cipher.encoded}</p>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          A Caesar cipher: every letter shifted by the same amount. Work out the shift, then type what it says.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="input min-w-0 flex-1"
            value={cipherInput}
            onChange={(e) => setCipherInput(e.target.value)}
            placeholder="Type the decoded message"
            aria-label="Decoded message"
            disabled={day.cipher}
          />
          <button type="button" className="btn btn-primary shrink-0" onClick={checkCipher} disabled={day.cipher}>
            Check
          </button>
        </div>
        <button type="button" className="btn mt-2" onClick={() => setCipherHint(true)}>
          Hint (free)
        </button>
        {cipherHint && <p className="mt-2 text-sm font-semibold">{set.cipher.hint}</p>}
        {cipherMsg && <p className="mt-2 text-sm font-semibold">{cipherMsg}</p>}
      </section>

      {/* Daily Nonogram */}
      <section className="card mt-5 p-4 sm:p-5" id="nonogram">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <LayoutGrid size={20} aria-hidden /> {set.nonogram.title}
          {day.nonogram && <span className="chip">Done today</span>}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Tap a square to fill it, again to cross it out, again to clear. Numbers count filled runs in each row and column.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="border-separate" style={{ borderSpacing: 3 }}>
            <thead>
              <tr>
                <th />
                {set.nonogram.colClues.map((clue, c) => (
                  <th key={c} className="align-bottom text-xs font-semibold text-[var(--ink-dim)]">
                    {clue.length ? clue.join(' ') : '0'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {set.nonogram.solution.map((row, r) => (
                <tr key={r}>
                  <th className="pr-1 text-right text-xs font-semibold text-[var(--ink-dim)]">
                    {set.nonogram.rowClues[r].length ? set.nonogram.rowClues[r].join(' ') : '0'}
                  </th>
                  {row.map((_, c) => {
                    const m = marks[`${r}:${c}`] ?? 0;
                    return (
                      <td key={c}>
                        <button
                          type="button"
                          className="lg-cell"
                          data-mark={m === 1 ? 'yes' : m === 2 ? 'no' : 'blank'}
                          aria-label={`Row ${r + 1}, column ${c + 1}: ${m === 1 ? 'filled' : m === 2 ? 'crossed' : 'blank'}`}
                          onClick={() => cycleMark(r, c)}
                        >
                          {m === 1 ? '■' : m === 2 ? '✕' : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn btn-accent2 mt-3" onClick={checkNonogram} disabled={day.nonogram}>
          Check my picture
        </button>
        {nonoMsg && <p className="mt-2 text-sm font-semibold">{nonoMsg}</p>}
      </section>
    </main>
  );
}
