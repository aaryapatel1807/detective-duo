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
 * Thrill upgrades (v2, 30 Oct): the Evidence tab was a cork board —
 * pinning a clue visibly ruled out the suspects it cleared (live
 * elimination from lib/cases/elimination.ts), the Suspects tab showed
 * AI-generated imaginary portraits as polaroids, and a correct
 * accusation played out as a staged reveal (accusation → suspense →
 * verdict → deduction steps → confession) before the stars panel.
 * Wrong accusations still cost one mistake and never lock her out.
 *
 * File redesign (v3, 30 Oct): the whole case is now one physical
 * dossier — manila folder with folder tabs, a file header (file
 * number, location, officer, classification, live OPEN/CLOSED stamp),
 * the story as a typed report on ruled paper, evidence as tagged
 * exhibits, elimination as a clearance roster, suspects as mugshot
 * sheets, and accuse as a final report to sign. Mechanics unchanged.
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
      setAccuseMsg(`${name} doesn't fit the clues. Have another look at the exhibits.`);
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

  // The file's number: the level on the ladder, the case id for a gifted case.
  const fileNo = leftCase ? c.id.toUpperCase() : `CF-${String(level).padStart(3, '0')}`;

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
        Open the file, tag the exhibits that matter, question everyone — then sign the
        final report. Hints are free, and a wrong accusation never locks you out.
      </p>
      {levelStars > 0 && !leftCase && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      <nav className="cf-ftabs" aria-label="Case sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`cf-ftab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <div className="cf-folder">
        <div className="cf-filehead">
          <span className="cf-stamp-head" aria-hidden>
            STATUS: {won !== null ? 'CLOSED' : 'OPEN'}
          </span>
          <div className="cf-title">CASE FILE</div>
          <div className="mt-1 text-sm">File Nº {fileNo} · {c.title}</div>
          <div className="cf-meta">
            <div><b>Location:</b> <span className="val">{c.setting}</span></div>
            <div><b>Investigating officer:</b> <span className="val">Detective (you)</span></div>
            <div><b>Classification:</b> <span className="val">Confidential</span></div>
            <div><b>Contents:</b> <span className="val">{c.clues.length} clues · {c.suspects.length} suspects</span></div>
          </div>
        </div>

      {tab === 'story' && (
        <section>
          <h2 className="cf-sec">CASE SUMMARY (TYPED REPORT)</h2>
          <div className="cf-report">
            {c.narrative}
            <span className="cf-hand">Note: work the evidence, not the gossip.</span>
            <div className="cf-stain" aria-hidden />
          </div>
          <p className="mt-3 text-sm opacity-70">
            {c.suspects.length} suspects · {c.clues.length} clues · {c.redHerrings.length}{' '}
            suspicious-looking details that may mean nothing.
          </p>
        </section>
      )}

      {tab === 'evidence' && (
        <section>
          <h2 className="cf-sec">PERSONS OF INTEREST — CLEARANCE ROSTER</h2>
          <div className="cf-roster">
            {c.suspects.map((s) => {
              const ruled = ruledBy.get(s.id);
              return (
                <span key={s.id}>
                  <span className={ruled ? 'out' : 'live'}>{s.name}</span>{' '}
                  {ruled && <span className="cf-stamp-inline">CLEARED</span>}{' '}
                </span>
              );
            })}
            <br />
            <b>
              Still of interest: {elim.standingIds.length} of {c.suspects.length}.
              {elim.standingIds.length === 1 && ' Only one name left standing.'}
            </b>{' '}
            Tag an exhibit and the roster updates.
          </div>
          <h2 className="cf-sec">EXHIBITS (EVIDENCE)</h2>
          {evidence.map((item, i) => {
            const pinned = state.pinned.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className="cf-exhibit"
                onClick={() => togglePin(item.id)}
                aria-pressed={pinned}
              >
                <span className="cf-extag">
                  EXHIBIT {String.fromCharCode(65 + i)}
                </span>{' '}
                {pinned && <span className="cf-stamp-inline">TAGGED</span>}
                <span className="ml-1 text-xs font-bold uppercase opacity-60">
                  {item.kind}
                  {won !== null && (item.real ? ' · a real clue' : ' · a red herring')}
                </span>
                <span className="mt-1 block">{item.text}</span>
              </button>
            );
          })}
        </section>
      )}

      {tab === 'suspects' && (
        <section>
          <h2 className="cf-sec">SUSPECT SHEETS (MUGSHOTS)</h2>
          <p className="mb-3 text-sm opacity-70">
            Everyone&apos;s statement is on file. Tap &ldquo;Ask&rdquo; to hear what they would rather
            keep quiet. Faces are imaginary — every suspect gets a portrait.
          </p>
          {c.suspects.map((s, i) => {
            const asked = state.questioned.includes(s.id);
            const ruled = ruledBy.get(s.id);
            return (
              <article key={s.id} className={`cf-mug ${ruled ? 'out' : ''}`}>
                <img
                  src={portraitForSuspect(c.id, i)}
                  alt={`Portrait of ${s.name}`}
                  loading="lazy"
                />
                <div>
                  <h3 className="font-hand text-3xl leading-none">{s.name}</h3>
                  <div className="field">
                    <b>ID:</b> S-{String(i + 1).padStart(3, '0')} · <b>STATUS:</b>{' '}
                    {ruled ? (
                      <span className="cf-stamp-inline">CLEARED</span>
                    ) : (
                      'OF INTEREST'
                    )}
                  </div>
                  <div className="field"><b>OCCUPATION:</b> {s.role}</div>
                  <div className="field"><b>STATEMENT:</b> {s.alibi}</div>
                  {ruled && (
                    <div className="field">
                      <b>CLEARED BY:</b>{' '}
                      {ruled.by === 'clue' ? ruled.clueText : 'your accusation'}
                    </div>
                  )}
                  {asked ? (
                    <div className="field"><b>NOTES:</b> {s.secret}</div>
                  ) : (
                    <button type="button" className="btn mt-3" onClick={() => question(s.id)}>
                      Ask {s.name.split(' ')[0]}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {tab === 'accuse' && (
        <section>
          <h2 className="cf-sec">FINAL REPORT (ACCUSE)</h2>
          <div className="cf-final">
            <p>
              I, the undersigned, accuse one person named below, on the evidence in
              this file. A wrong name costs one mistake and nothing else — you can
              keep accusing until the clues point to one person.
            </p>
            <div className="mt-3 space-y-2">
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
            </div>
            {accuseMsg && <p className="pt-2 text-sm font-semibold">{accuseMsg}</p>}
            <p className="mt-4">
              Signed: <span className="cf-sigline" /> Date: <span className="cf-sigline" style={{ minWidth: 120 }} />
            </p>
          </div>
        </section>
      )}
      </div>

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
