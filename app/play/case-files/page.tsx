'use client';

/**
 * Case Files — solo mystery game.
 *
 * Level N maps to a case via lib/cases/bank.ts (tier ranges + rotation
 * within the tier, so no repeat until the tier's cases are exhausted).
 * Progress goes through lib/progress.ts untouched: a wrong accusation
 * counts as one mistake (each suspect counted once), hints reveal the
 * next deduction step, and both feed the usual star calculation. A wrong
 * accusation never blocks — she can keep accusing.
 *
 * Layout mirrors app/play/logic-grids/page.tsx: level nav, resume from
 * localStorage, win panel with stars + Next Level. Evidence mixes real
 * clues and red herrings in one board (shuffled per case); which were
 * red herrings is only revealed after solving.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Lightbulb,
  Pin,
  RotateCcw,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { caseForLevel, GAME_ID, tierForLevel, ALL_CASES } from '@/lib/cases/bank';
import { hashSeed, mulberry32 } from '@/lib/generators/logicGrid';
import {
  computeStars,
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { markLeftCaseSeen } from '@/lib/together/leftCases';

type Tab = 'story' | 'evidence' | 'suspects' | 'accuse';

interface PlayState {
  pinned: string[];
  questioned: string[];
  revealedSteps: number;
  mistakes: number;
  hints: number;
  wrongAccused: string[];
}

const freshState = (): PlayState => ({
  pinned: [],
  questioned: [],
  revealedSteps: 0,
  mistakes: 0,
  hints: 0,
  wrongAccused: [],
});

const storageKey = (level: number) => `dd-v2-cf-${level}`;

function shuffleFor<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashSeed(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function CaseFilesPage() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [tab, setTab] = useState<Tab>('story');
  const [won, setWon] = useState<number | null>(null);
  const [accuseMsg, setAccuseMsg] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState(0);
  const [leftCaseId, setLeftCaseId] = useState<string | null>(null);

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const levelStars = myProgress.stars[String(level)] ?? 0;

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
    // A case left by a partner opens by id (?case=...), and is marked seen.
    try {
      const id = new URLSearchParams(window.location.search).get('case');
      if (id && ALL_CASES.some((c) => c.id === id)) {
        setLeftCaseId(id);
        void markLeftCaseSeen(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const leftCase = leftCaseId ? ALL_CASES.find((c) => c.id === leftCaseId) : undefined;
  const c = useMemo(() => leftCase ?? caseForLevel(level), [leftCase, level]);

  // Evidence board: clues + red herrings, shuffled per case so the
  // herrings don't sit in a giveaway group at the bottom.
  const evidence = useMemo(
    () =>
      shuffleFor(
        [
          ...c.clues.map((cl) => ({ id: cl.id, text: cl.text, kind: cl.kind, real: true })),
          ...c.redHerrings.map((h) => ({ id: h.id, text: h.text, kind: 'herring', real: false })),
        ],
        c.id,
      ),
    [c],
  );

  // Load / resume in-progress state for this level.
  // Left cases always start fresh and never touch ladder storage.
  useEffect(() => {
    if (leftCaseId) {
      setWon(null);
      setAccuseMsg(null);
      setTab('story');
      setState(freshState());
      return;
    }
    if (loadedFor === level) return;
    setLoadedFor(level);
    setWon(null);
    setAccuseMsg(null);
    setTab('story');
    try {
      const raw = localStorage.getItem(storageKey(level));
      if (raw) {
        setState(JSON.parse(raw) as PlayState);
        return;
      }
    } catch {
      /* ignore */
    }
    setState(freshState());
  }, [level, loadedFor, leftCaseId]);

  // Persist in-progress state.
  useEffect(() => {
    if (leftCaseId || loadedFor !== level) return;
    try {
      localStorage.setItem(storageKey(level), JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, loadedFor, leftCaseId]);

  const togglePin = (id: string) =>
    setState((s) => ({
      ...s,
      pinned: s.pinned.includes(id) ? s.pinned.filter((x) => x !== id) : [...s.pinned, id],
    }));

  const question = (id: string) =>
    setState((s) => ({
      ...s,
      questioned: s.questioned.includes(id) ? s.questioned : [...s.questioned, id],
    }));

  const useHint = () => {
    if (won !== null) return;
    if (state.revealedSteps >= c.deductionPath.length) return;
    setState((s) => ({ ...s, revealedSteps: s.revealedSteps + 1, hints: s.hints + 1 }));
  };

  const accuse = (suspectId: string) => {
    if (won !== null) return;
    if (suspectId === c.solution.culpritId) {
      if (leftCaseId) {
        // Gifted cases don't advance the ladder — just the keepsake stars.
        setWon(computeStars(state.hints, state.mistakes));
        return;
      }
      const { map, stars } = recordWin(progress, GAME_ID, level, state.hints, state.mistakes);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(storageKey(level));
      } catch {
        /* ignore */
      }
      return;
    }
    const name = c.suspects.find((s) => s.id === suspectId)?.name ?? 'That person';
    if (state.wrongAccused.includes(suspectId)) {
      setAccuseMsg(`${name} doesn't fit the clues. Have another look at the evidence board.`);
      return;
    }
    setState((s) => ({
      ...s,
      mistakes: s.mistakes + 1,
      wrongAccused: [...s.wrongAccused, suspectId],
    }));
    setAccuseMsg(
      `${name} doesn't fit the clues — but no harm done. Pin the clues that rule people out and try again whenever you're ready.`,
    );
  };

  const restart = () => {
    setState(freshState());
    setWon(null);
    setAccuseMsg(null);
    try {
      localStorage.removeItem(storageKey(level));
    } catch {
      /* ignore */
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'story', label: 'Story', icon: <BookOpen size={16} aria-hidden /> },
    { id: 'evidence', label: 'Evidence', icon: <Search size={16} aria-hidden /> },
    { id: 'suspects', label: 'Suspects', icon: <Users size={16} aria-hidden /> },
    { id: 'accuse', label: 'Accuse', icon: <Footprints size={16} aria-hidden /> },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        {leftCase ? (
          <span className="chip">Left for you by your partner</span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn !px-2 !py-2"
              disabled={level <= 1}
              onClick={() => setLevel(level - 1)}
              aria-label="Previous level"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <span className="chip">
              Level {level} · {tierForLevel(level)}
            </span>
            <button
              type="button"
              className="btn !px-2 !py-2"
              disabled={level >= unlocked}
              onClick={() => setLevel(level + 1)}
              aria-label="Next level"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-bold">Case Files</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        {c.title} · {c.setting}. Read the story, pin the clues that matter, question
        everyone — then name the culprit. Hints are free, and a wrong accusation never
        locks you out.
      </p>
      {levelStars > 0 && !leftCase && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Case sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? 'btn-primary' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {tab === 'story' && (
        <section className="paper mt-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold">{c.title}</h2>
          <p className="mt-1 text-sm opacity-70">{c.setting}</p>
          <p className="mt-3 leading-relaxed">{c.narrative}</p>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            {c.suspects.length} suspects · {c.clues.length} clues · {c.redHerrings.length}{' '}
            suspicious-looking details that may mean nothing.
          </p>
        </section>
      )}

      {tab === 'evidence' && (
        <section className="mt-4 space-y-2">
          <p className="text-sm text-[var(--ink-dim)]">
            Tap a finding to pin it to your board. Pinned findings stay put while you think.
          </p>
          {evidence.map((item) => {
            const pinned = state.pinned.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`card block w-full p-4 text-left ${pinned ? 'ring-2' : ''}`}
                style={pinned ? { outline: '2px solid var(--accent)' } : undefined}
                onClick={() => togglePin(item.id)}
                aria-pressed={pinned}
              >
                <span className="flex items-start gap-2">
                  <Pin size={18} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <span className="text-sm font-semibold capitalize">
                      {item.kind}
                      {won !== null && (
                        <span className="ml-2 font-normal opacity-70">
                          {item.real ? '· a real clue' : '· a red herring'}
                        </span>
                      )}
                    </span>
                    <span className="block mt-1">{item.text}</span>
                    {pinned && <span className="text-sm font-semibold">Pinned</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {tab === 'suspects' && (
        <section className="mt-4 space-y-2">
          <p className="text-sm text-[var(--ink-dim)]">
            Everyone's alibi is on show. Tap &ldquo;Ask&rdquo; to hear what they would rather
            keep quiet.
          </p>
          {c.suspects.map((s) => {
            const asked = state.questioned.includes(s.id);
            return (
              <article key={s.id} className="card p-4">
                <h3 className="font-display text-lg font-bold">{s.name}</h3>
                <p className="text-sm text-[var(--ink-dim)]">{s.role}</p>
                <p className="mt-2">
                  <span className="font-semibold">Alibi: </span>
                  {s.alibi}
                </p>
                {asked ? (
                  <p className="mt-2">
                    <span className="font-semibold">Something they keep quiet: </span>
                    {s.secret}
                  </p>
                ) : (
                  <button type="button" className="btn mt-3" onClick={() => question(s.id)}>
                    Ask {s.name.split(' ')[0]}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {tab === 'accuse' && (
        <section className="mt-4 space-y-2">
          <p className="text-sm text-[var(--ink-dim)]">
            Ready? Name the culprit. A wrong name costs one mistake and nothing else —
            you can keep accusing until the clues point to one person.
          </p>
          {c.suspects.map((s) => (
            <button
              key={s.id}
              type="button"
              className="card block w-full p-4 text-left"
              disabled={won !== null}
              onClick={() => accuse(s.id)}
            >
              <span className="font-display text-lg font-bold">{s.name}</span>
              <span className="block text-sm text-[var(--ink-dim)]">{s.role}</span>
              {state.wrongAccused.includes(s.id) && (
                <span className="block text-sm font-semibold">Ruled out by your accusation</span>
              )}
            </button>
          ))}
          {accuseMsg && <p className="pt-1 text-sm font-semibold">{accuseMsg}</p>}
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          onClick={useHint}
          disabled={won !== null || state.revealedSteps >= c.deductionPath.length}
        >
          <Lightbulb size={18} aria-hidden /> Hint (free)
        </button>
        <button type="button" className="btn" onClick={restart}>
          <RotateCcw size={18} aria-hidden /> Start over
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · Mistakes: {state.mistakes} · Pinned: {state.pinned.length}
      </p>

      {state.revealedSteps > 0 && (
        <section className="paper mt-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold">Deduction so far</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            {c.deductionPath.slice(0, state.revealedSteps).map((step, i) => (
              <li key={`${step.clueId}-${i}`}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}

      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Case closed.</p>
          <p className="mt-1">
            The culprit was{' '}
            <strong>{c.suspects.find((s) => s.id === c.solution.culpritId)?.name}</strong>.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">{c.solution.explanation}</p>
          <p className="mt-2 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}
            <span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <h3 className="mt-3 text-left font-display text-lg font-bold">How the clues prove it</h3>
          <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-left">
            {c.deductionPath.map((step, i) => (
              <li key={`${step.clueId}-${i}`}>{step.text}</li>
            ))}
          </ol>
          <div className="mt-4 flex justify-center gap-2">
            {!leftCase && (
              <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>
                Next level
              </button>
            )}
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}
    </main>
  );
}
