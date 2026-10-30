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
 *
 * Thrill upgrades (v2, 30 Oct): the Evidence tab is a cork board —
 * pinning a clue visibly rules out the suspects it clears (live
 * elimination from lib/cases/elimination.ts), the Suspects tab shows
 * AI-generated imaginary portraits as polaroids, and a correct
 * accusation plays out as a staged reveal (accusation → suspense →
 * verdict → deduction steps → confession) before the stars panel.
 * Wrong accusations still cost one mistake and never lock her out.
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
  RotateCcw,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { caseForLevel, CASES_BY_TIER, GAME_ID, tierForLevel, tierStartForLevel, ALL_CASES } from '@/lib/cases/bank';
import { eliminationFor } from '@/lib/cases/elimination';
import { portraitForSuspect } from '@/lib/cases/portraits';
import { hashSeed, mulberry32 } from '@/lib/generators/logicGrid';
import {
  computeStars,
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { markLeftCaseSeen } from '@/lib/together/leftCases';
import EmptyState from '@/components/EmptyState';
import { tierCycleNote, unknownCase } from '@/lib/emptyStates';

type Tab = 'story' | 'evidence' | 'suspects' | 'accuse';
type RevealPhase = 'accuse' | 'suspense' | 'verdict' | 'steps' | 'confession' | 'done';

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
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('accuse');
  const [revealCount, setRevealCount] = useState(0);
  const [accusedName, setAccusedName] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState(0);
  const [leftCaseId, setLeftCaseId] = useState<string | null>(null);
  const [badCaseId, setBadCaseId] = useState<string | null>(null);

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const levelStars = myProgress.stars[String(level)] ?? 0;

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
    // A case left by a partner opens by id (?case=...), and is marked seen.
    // An unknown id shows an error state instead of silently opening level 1.
    try {
      const id = new URLSearchParams(window.location.search).get('case');
      if (id && ALL_CASES.some((c) => c.id === id)) {
        setLeftCaseId(id);
        void markLeftCaseSeen(id);
      } else if (id) {
        setBadCaseId(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const leftCase = leftCaseId ? ALL_CASES.find((c) => c.id === leftCaseId) : undefined;
  const c = useMemo(() => leftCase ?? caseForLevel(level), [leftCase, level]);

  // Live elimination: pinned clues rule suspects out as you pin.
  const elim = useMemo(
    () => eliminationFor(c, state.pinned, state.wrongAccused),
    [c, state.pinned, state.wrongAccused],
  );
  const ruledBy = useMemo(
    () => new Map(elim.ruledOut.map((r) => [r.suspectId, r])),
    [elim],
  );

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
    setRevealPhase('accuse');
    setRevealCount(0);
    setAccusedName(null);
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
      const name = c.suspects.find((s) => s.id === suspectId)?.name ?? 'The culprit';
      setAccusedName(name);
      setRevealCount(0);
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setRevealPhase(reduced ? 'done' : 'accuse');
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
    setRevealPhase('accuse');
    setRevealCount(0);
    setAccusedName(null);
    try {
      localStorage.removeItem(storageKey(level));
    } catch {
      /* ignore */
    }
  };

  // Staged reveal: accusation → suspense → verdict, then the player
  // steps through the deduction at her own pace.
  useEffect(() => {
    if (won === null) return;
    const delays: Partial<Record<RevealPhase, number>> = {
      accuse: 900,
      suspense: 1100,
      verdict: 1000,
    };
    const next: Partial<Record<RevealPhase, RevealPhase>> = {
      accuse: 'suspense',
      suspense: 'verdict',
      verdict: 'steps',
    };
    const delay = delays[revealPhase];
    const target = next[revealPhase];
    if (delay === undefined || target === undefined) return;
    const t = setTimeout(() => setRevealPhase(target), delay);
    return () => clearTimeout(t);
  }, [won, revealPhase]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'story', label: 'Story', icon: <BookOpen size={16} aria-hidden /> },
    { id: 'evidence', label: 'Evidence', icon: <Search size={16} aria-hidden /> },
    { id: 'suspects', label: 'Suspects', icon: <Users size={16} aria-hidden /> },
    { id: 'accuse', label: 'Accuse', icon: <Footprints size={16} aria-hidden /> },
  ];

  const cycleNote = !leftCase
    ? tierCycleNote(level, tierStartForLevel(level), CASES_BY_TIER[tierForLevel(level)].length)
    : null;

  if (badCaseId) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-6">
          <EmptyState state={unknownCase(badCaseId)} />
        </div>
      </main>
    );
  }

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
      {cycleNote && (
        <p className="mt-2 text-sm text-[var(--ink-dim)]">{cycleNote}</p>
      )}
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
        <section className="paper relative mt-4 p-4 sm:p-5">
          <span className="cf-stamp-static" aria-hidden>CONFIDENTIAL</span>
          <h2 className="font-display pr-32 text-lg font-bold">{c.title}</h2>
          <p className="mt-1 text-sm opacity-70">{c.setting}</p>
          <p className="mt-3 leading-relaxed">{c.narrative}</p>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            {c.suspects.length} suspects · {c.clues.length} clues · {c.redHerrings.length}{' '}
            suspicious-looking details that may mean nothing.
          </p>
        </section>
      )}

      {tab === 'evidence' && (
        <section className="cf-board mt-4">
          <div className="cf-standing">
            <p className="text-base font-bold">
              Still standing: {elim.standingIds.length} of {c.suspects.length}
              {elim.standingIds.length === 1 && ' — only one name left standing.'}
            </p>
            <svg width="100%" height="22" viewBox="0 0 400 22" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,11 Q 50,4 100,11 T 200,11 T 300,11 T 400,11" stroke="#d00" strokeWidth="2.5" fill="none" />
              <circle cx="100" cy="11" r="4" fill="#d00" />
              <circle cx="200" cy="11" r="4" fill="#d00" />
              <circle cx="300" cy="11" r="4" fill="#d00" />
            </svg>
            <p>
              {c.suspects.map((s) => {
                const ruled = ruledBy.get(s.id);
                return (
                  <span key={s.id} className={`cf-chip ${ruled ? 'out' : 'live'}`}>
                    {s.name}
                  </span>
                );
              })}
            </p>
            <p className="mt-2 text-sm opacity-80">
              Tap a finding to pin it to the board. Every pinned clue crosses off the
              people it clears.
            </p>
          </div>
          {evidence.map((item) => {
            const pinned = state.pinned.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`cf-note ${pinned ? 'is-pinned' : ''}`}
                onClick={() => togglePin(item.id)}
                aria-pressed={pinned}
              >
                {pinned && <span className="cf-pin" aria-hidden />}
                <span className="cf-note-tag">
                  {item.kind}
                  {won !== null && (
                    <span className="ml-2 font-normal normal-case opacity-70">
                      {item.real ? '· a real clue' : '· a red herring'}
                    </span>
                  )}
                </span>
                <span className="mt-1 block">{item.text}</span>
                {pinned && <span className="mt-1 block text-sm font-bold">Pinned</span>}
              </button>
            );
          })}
        </section>
      )}

      {tab === 'suspects' && (
        <section className="mt-4">
          <p className="text-sm text-[var(--ink-dim)]">
            Everyone&apos;s alibi is on show. Tap &ldquo;Ask&rdquo; to hear what they would rather
            keep quiet. Faces are imaginary — every suspect gets a portrait.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {c.suspects.map((s, i) => {
              const asked = state.questioned.includes(s.id);
              const ruled = ruledBy.get(s.id);
              return (
                <article key={s.id} className={`cf-pol ${ruled ? 'out' : ''}`}>
                  <img
                    src={portraitForSuspect(c.id, i)}
                    alt={`Portrait of ${s.name}`}
                    loading="lazy"
                  />
                  {ruled && (
                    <span className="cf-stamp">RULED OUT</span>
                  )}
                  <h3 className="font-hand mt-2 text-2xl leading-none">{s.name}</h3>
                  <p className="text-sm text-[var(--ink-dim)]">{s.role}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Alibi: </span>
                    {s.alibi}
                  </p>
                  {ruled && (
                    <p className="mt-2 text-sm font-semibold">
                      ✕{' '}
                      {ruled.by === 'clue'
                        ? `Ruled out — ${ruled.clueText}`
                        : 'Ruled out by your accusation'}
                    </p>
                  )}
                  {asked ? (
                    <p className="mt-2 text-sm">
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
          </div>
        </section>
      )}

      {tab === 'accuse' && (
        <section className="mt-4 space-y-2">
          <p className="text-sm text-[var(--ink-dim)]">
            Ready? Name the culprit. A wrong name costs one mistake and nothing else —
            you can keep accusing until the clues point to one person.
          </p>
          {c.suspects.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="card flex w-full items-center gap-3 p-4 text-left"
              disabled={won !== null}
              onClick={() => accuse(s.id)}
            >
              <img
                src={portraitForSuspect(c.id, i)}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-full object-cover object-top"
              />
              <span>
                <span className="font-display block text-lg font-bold">{s.name}</span>
                <span className="block text-sm text-[var(--ink-dim)]">{s.role}</span>
                {state.wrongAccused.includes(s.id) && (
                  <span className="block text-sm font-semibold">Ruled out by your accusation</span>
                )}
              </span>
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

      {won !== null && revealPhase !== 'done' && (
        <section className="card mt-4 p-5 text-center">
          {revealPhase === 'accuse' && (
            <>
              <p className="font-display text-2xl font-bold">You accuse {accusedName ?? 'the culprit'}.</p>
              <p className="mt-2 text-[var(--ink-dim)]">The card locks in.</p>
            </>
          )}
          {revealPhase === 'suspense' && (
            <p className="font-display text-2xl font-bold">
              The room goes quiet
              <span className="cf-dots" aria-hidden>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          )}
          {revealPhase === 'verdict' && (
            <>
              <p className="font-display text-3xl font-bold">Correct.</p>
              <p className="mt-2 text-[var(--ink-dim)]">The case breaks open.</p>
            </>
          )}
          {revealPhase === 'steps' && (
            <>
              <h3 className="font-display text-left text-lg font-bold">How the clues prove it</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-left">
                {c.deductionPath.slice(0, revealCount).map((step, i) => (
                  <li key={`${step.clueId}-${i}`}>{step.text}</li>
                ))}
              </ol>
              {revealCount < c.deductionPath.length ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => setRevealCount(revealCount + 1)}>
                    Reveal the next step
                  </button>
                  <button type="button" className="btn" onClick={() => setRevealCount(c.deductionPath.length)}>
                    Show all
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-primary mt-4" onClick={() => setRevealPhase('confession')}>
                  Hear the confession
                </button>
              )}
            </>
          )}
          {revealPhase === 'confession' && (
            <>
              <p className="font-display text-xl font-bold">The confession</p>
              <p className="mt-3 text-left italic leading-relaxed">“{c.solution.explanation}”</p>
              <button type="button" className="btn btn-primary mt-4" onClick={() => setRevealPhase('done')}>
                Case closed
              </button>
            </>
          )}
          <div className="mt-4">
            <button type="button" className="btn" onClick={() => setRevealPhase('done')}>
              Skip
            </button>
          </div>
        </section>
      )}

      {won !== null && revealPhase === 'done' && (
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
