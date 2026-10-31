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
 *
 * Murder Mystery section (31 Oct): a second board inside this page —
 * same mechanics, same dossier, its own ladder (MM-001…, progress
 * under MURDER_GAME_ID) and its own skin: CASE No. tags, red string
 * and pins, a CLASSIFIED stamp, and a twenty-face portrait pool.
 * Normal case files are untouched by the switch.
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
import { caseForLevel, CASES_BY_TIER, GAME_ID, MURDER_CASES, MURDER_GAME_ID, murderCaseForLevel, tierForLevel, tierStartForLevel, ALL_CASES } from '@/lib/cases/bank';
import { eliminationFor } from '@/lib/cases/elimination';
import { portraitForMurderSuspect, portraitForSuspect } from '@/lib/cases/portraits';
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
type Section = 'cases' | 'murder';
/** Murder board only: the guided Criminal Case-style flow. The normal
 * board keeps its folder tabs; this state is inert there. */
type FlowStep = 'story' | 'suspects' | 'evidence' | 'arrest';
const FLOW_STEPS: { id: FlowStep; label: string; icon: typeof BookOpen }[] = [
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'suspects', label: 'Suspects', icon: Users },
  { id: 'evidence', label: 'Evidence', icon: Search },
  { id: 'arrest', label: 'Arrest', icon: Footprints },
];
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
const murderStorageKey = (level: number) => `dd-v2-cf-mm-${level}`;
const keyFor = (section: Section, level: number) =>
  section === 'murder' ? murderStorageKey(level) : storageKey(level);
const gameIdFor = (section: Section) =>
  section === 'murder' ? MURDER_GAME_ID : GAME_ID;
const SECTION_KEY = 'dd-v2-cf-section';

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
  const [section, setSection] = useState<Section>('cases');
  const [flowStep, setFlowStep] = useState<FlowStep>('story');
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<FlowStep[]>(['story']);
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [tab, setTab] = useState<Tab>('story');
  const [won, setWon] = useState<number | null>(null);
  const [accuseMsg, setAccuseMsg] = useState<string | null>(null);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('accuse');
  const [revealCount, setRevealCount] = useState(0);
  const [accusedName, setAccusedName] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState('');
  const [leftCaseId, setLeftCaseId] = useState<string | null>(null);
  const [badCaseId, setBadCaseId] = useState<string | null>(null);

  const activeGameId = gameIdFor(section);
  const myProgress = getGameProgress(progress, activeGameId);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const levelStars = myProgress.stars[String(level)] ?? 0;

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    // Remember which board she was on; a gifted murder case forces it.
    let nextSection: Section = 'cases';
    try {
      if (localStorage.getItem(SECTION_KEY) === 'murder') nextSection = 'murder';
    } catch {
      /* ignore */
    }
    // A case left by a partner opens by id (?case=...), and is marked seen.
    // An unknown id shows an error state instead of silently opening level 1.
    // Murder ids open the murder board; normal ids open the case board.
    try {
      const id = new URLSearchParams(window.location.search).get('case');
      if (id && [...ALL_CASES, ...MURDER_CASES].some((c) => c.id === id)) {
        if (MURDER_CASES.some((c) => c.id === id)) nextSection = 'murder';
        setLeftCaseId(id);
        void markLeftCaseSeen(id);
      } else if (id) {
        setBadCaseId(id);
      }
    } catch {
      /* ignore */
    }
    setSection(nextSection);
    setLevel(getGameProgress(map, gameIdFor(nextSection)).currentLevel);
  }, []);

  const leftCase = leftCaseId
    ? [...ALL_CASES, ...MURDER_CASES].find((c) => c.id === leftCaseId)
    : undefined;
  const c = useMemo(
    () => leftCase ?? (section === 'murder' ? murderCaseForLevel(level) : caseForLevel(level)),
    [leftCase, level, section],
  );

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

  // Load / resume in-progress state for this board + level.
  // Left cases always start fresh and never touch ladder storage.
  useEffect(() => {
    if (leftCaseId) {
      setWon(null);
      setAccuseMsg(null);
      setTab('story');
      setFlowStep('story');
      setSelectedSuspect(null);
      setVisitedSteps(['story']);
      setState(freshState());
      return;
    }
    const key = `${section}-${level}`;
    if (loadedFor === key) return;
    setLoadedFor(key);
    setWon(null);
    setAccuseMsg(null);
    setRevealPhase('accuse');
    setRevealCount(0);
    setAccusedName(null);
    setTab('story');
    setFlowStep('story');
    setSelectedSuspect(null);
    setVisitedSteps(['story']);
    try {
      const raw = localStorage.getItem(keyFor(section, level));
      if (raw) {
        setState(JSON.parse(raw) as PlayState);
        return;
      }
    } catch {
      /* ignore */
    }
    setState(freshState());
  }, [section, level, loadedFor, leftCaseId]);

  // Persist in-progress state.
  useEffect(() => {
    if (leftCaseId || loadedFor !== `${section}-${level}`) return;
    try {
      localStorage.setItem(keyFor(section, level), JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, section, level, loadedFor, leftCaseId]);

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
      const { map, stars } = recordWin(progress, activeGameId, level, state.hints, state.mistakes);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(keyFor(section, level));
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
    setFlowStep('story');
    setSelectedSuspect(null);
    setVisitedSteps(['story']);
    try {
      localStorage.removeItem(keyFor(section, level));
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

  const cycleNote = !leftCase && section === 'cases'
    ? tierCycleNote(level, tierStartForLevel(level), CASES_BY_TIER[tierForLevel(level)].length)
    : null;
  const murderNote = !leftCase && section === 'murder'
    ? `Murder board · case ${((level - 1) % MURDER_CASES.length) + 1} of ${MURDER_CASES.length} — the board cycles back to the start after the last case.`
    : null;

  // The file's number: the level on the ladder, the case id for a gifted case.
  const fileNo = leftCase
    ? c.id.toUpperCase()
    : section === 'murder'
      ? `MM-${String(level).padStart(3, '0')}`
      : `CF-${String(level).padStart(3, '0')}`;

  // One face per suspect: the murder board draws from the twenty-face
  // pool, the case board from the original sixteen.
  const portrait = (i: number) =>
    section === 'murder' ? portraitForMurderSuspect(c.id, i) : portraitForSuspect(c.id, i);

  // Murder interrogation room: the tapped suspect's dossier, if any.
  const selIdx = c.suspects.findIndex((s) => s.id === selectedSuspect);
  const selSuspect = selIdx >= 0 ? c.suspects[selIdx] : null;
  const selAsked = selSuspect ? state.questioned.includes(selSuspect.id) : false;
  const selRuled = selSuspect ? ruledBy.get(selSuspect.id) : undefined;

  const goFlowStep = (next: FlowStep) => {
    setFlowStep(next);
    setSelectedSuspect(null);
    setVisitedSteps((v) => (v.includes(next) ? v : [...v, next]));
  };

  const switchSection = (next: Section) => {
    if (next === section) return;
    setSection(next);
    setLevel(getGameProgress(progress, gameIdFor(next)).currentLevel);
    setFlowStep('story');
    setSelectedSuspect(null);
    setVisitedSteps(['story']);
    try {
      localStorage.setItem(SECTION_KEY, next);
    } catch {
      /* ignore */
    }
  };

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

      <h1 className="mt-4 text-3xl font-bold">
        {section === 'murder' ? 'Murder Mystery' : 'Case Files'}
      </h1>
      {cycleNote && (
        <p className="mt-2 text-sm text-[var(--ink-dim)]">{cycleNote}</p>
      )}
      {murderNote && (
        <p className="mt-2 text-sm text-[var(--ink-dim)]">{murderNote}</p>
      )}
      <p className="mt-1 text-[var(--ink-dim)]">
        {section === 'murder'
          ? 'Follow the investigation, step by step: story, suspects, evidence, then the arrest. Hints are free, and a wrong accusation never locks you out.'
          : 'Open the file, tag the exhibits that matter, question everyone — then sign the final report. Hints are free, and a wrong accusation never locks you out.'}
      </p>
      {levelStars > 0 && !leftCase && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      {!leftCase && (
        <nav className="cf-boardtabs" aria-label="Case boards">
          <button
            type="button"
            className={`cf-boardtab ${section === 'cases' ? 'on' : ''}`}
            onClick={() => switchSection('cases')}
          >
            Case Files
          </button>
          <button
            type="button"
            className={`cf-boardtab ${section === 'murder' ? 'on' : ''}`}
            onClick={() => switchSection('murder')}
          >
            Murder Mystery
          </button>
        </nav>
      )}

      {section === 'cases' && (
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
      )}

      {section === 'murder' && (
        <nav className="cf-rail" aria-label="Investigation steps">
          {FLOW_STEPS.map((s, i) => {
            const Icon = s.icon;
            const state = flowStep === s.id ? 'now' : visitedSteps.includes(s.id) ? 'done' : '';
            return (
              <span key={s.id} className="cf-railitem">
                {i > 0 && <span className="cf-railarrow" aria-hidden>›</span>}
                <button
                  type="button"
                  className={`cf-railstep ${state}`}
                  onClick={() => goFlowStep(s.id)}
                >
                  <Icon size={15} aria-hidden /> {i + 1} · {s.label}
                  {state === 'done' && ' ✓'}
                </button>
              </span>
            );
          })}
        </nav>
      )}

      <div className={`cf-folder ${section === 'murder' ? 'cf-murder' : ''}`}>
        <div className="cf-filehead">
          <span className="cf-stamp-head" aria-hidden>
            STATUS: {won !== null ? 'CLOSED' : 'OPEN'}
          </span>
          {section === 'murder' && (
            <>
              <span className="cf-stamp-classified" aria-hidden>CLASSIFIED</span>
              <svg className="cf-string" aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none">
                <line x1="8" y1="4" x2="52" y2="22" />
                <line x1="52" y1="22" x2="92" y2="6" />
              </svg>
              <span className="cf-pin" style={{ left: '8%' }} aria-hidden />
              <span className="cf-pin" style={{ left: '52%' }} aria-hidden />
              <span className="cf-pin" style={{ left: '92%' }} aria-hidden />
            </>
          )}
          <div className="cf-title">{section === 'murder' ? 'MURDER FILE' : 'CASE FILE'}</div>
          <div className="mt-1 text-sm">File Nº {fileNo} · {c.title}</div>
          <div className="cf-meta">
            <div><b>Location:</b> <span className="val">{c.setting}</span></div>
            <div><b>Investigating officer:</b> <span className="val">Detective (you)</span></div>
            <div><b>Classification:</b> <span className="val">Confidential</span></div>
            <div><b>Contents:</b> <span className="val">{c.clues.length} clues · {c.suspects.length} suspects</span></div>
          </div>
        </div>

      {section === 'cases' && tab === 'story' && (
        <section>
          <h2 className="cf-sec">
            CASE SUMMARY (TYPED REPORT)
          </h2>
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

      {section === 'cases' && tab === 'evidence' && (
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
          <h2 className="cf-sec">
            EXHIBITS (EVIDENCE)
          </h2>
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

      {section === 'cases' && tab === 'suspects' && (
        <section>
          <h2 className="cf-sec">SUSPECT SHEETS (MUGSHOTS)</h2>
          <p className="mb-3 text-sm opacity-70">
Everyone’s statement is on file. Tap “Ask” to hear what they would rather keep quiet. Faces are imaginary — every suspect gets a portrait.
          </p>
          {c.suspects.map((s, i) => {
            const asked = state.questioned.includes(s.id);
            const ruled = ruledBy.get(s.id);
            return (
              <article key={s.id} className={`cf-mug ${ruled ? 'out' : ''}`}>
                <img
                  src={portrait(i)}
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

      {section === 'cases' && tab === 'accuse' && (
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
                    src={portrait(i)}
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

      {section === 'murder' && flowStep === 'story' && (
        <section>
          <h2 className="cf-sec">THE STORY (POLICE REPORT)</h2>
          <div className="cf-report">
            {c.narrative}
            <span className="cf-hand">Note: work the evidence, not the gossip.</span>
            <div className="cf-stain" aria-hidden />
          </div>
          <p className="mt-3 text-sm opacity-70">
            {c.suspects.length} suspects · {c.clues.length} clues · {c.redHerrings.length}{' '}
            suspicious-looking details that may mean nothing.
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => goFlowStep('suspects')}>
            Start investigation <ChevronRight size={16} aria-hidden />
          </button>
        </section>
      )}

      {section === 'murder' && flowStep === 'suspects' && (
        <section>
          <h2 className="cf-sec">THE SUSPECTS</h2>
          {selSuspect ? (
            <div>
              <button type="button" className="btn" onClick={() => setSelectedSuspect(null)}>
                <ChevronLeft size={16} aria-hidden /> Back to the lineup
              </button>
              <div className={`cf-interro ${selRuled ? 'out' : ''}`}>
                <img src={portrait(selIdx)} alt={`Portrait of ${selSuspect.name}`} />
                <div>
                  <h3 className="font-hand text-3xl leading-none">{selSuspect.name}</h3>
                  <div className="field"><b>OCCUPATION:</b> {selSuspect.role}</div>
                  {selRuled && (
                    <div className="field">
                      <span className="cf-stamp-inline">CLEARED</span>{' '}
                      <b>CLEARED BY:</b>{' '}
                      {selRuled.by === 'clue' ? selRuled.clueText : 'your accusation'}
                    </div>
                  )}
                  <div className="cf-bubble">
                    <small>{selSuspect.name.toUpperCase()} — STATEMENT</small>
                    &ldquo;{selSuspect.alibi}&rdquo;
                  </div>
                  {selAsked ? (
                    <div className="cf-bubble secret">
                      <small>PRESSED FURTHER — WHAT THEY HID</small>
                      &ldquo;{selSuspect.secret}&rdquo;
                    </div>
                  ) : (
                    <button type="button" className="btn btn-primary mt-3" onClick={() => question(selSuspect.id)}>
                      Press further
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm opacity-70">
                Tap a suspect to bring them in for questioning. Faces are imaginary — every
                suspect gets a portrait.
              </p>
              <div className="cf-lineup">
                {c.suspects.map((s, i) => {
                  const ruled = ruledBy.get(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`cf-suscard ${ruled ? 'out' : ''}`}
                      onClick={() => setSelectedSuspect(s.id)}
                    >
                      <img src={portrait(i)} alt={`Portrait of ${s.name}`} loading="lazy" />
                      <span className="cf-susname">{s.name}</span>
                      <span className="cf-susrole">{s.role}</span>
                      {ruled ? (
                        <span className="cf-stamp-inline">CLEARED</span>
                      ) : (
                        <span className="cf-chip-interest">OF INTEREST</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn btn-primary mt-4" onClick={() => goFlowStep('evidence')}>
                Continue to evidence <ChevronRight size={16} aria-hidden />
              </button>
            </>
          )}
        </section>
      )}

      {section === 'murder' && flowStep === 'evidence' && (
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
          <h2 className="cf-sec">EVIDENCE FOLDER (EXHIBITS)</h2>
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
          <button type="button" className="btn btn-primary mt-4" onClick={() => goFlowStep('arrest')}>
            Line up the suspects <ChevronRight size={16} aria-hidden />
          </button>
        </section>
      )}

      {section === 'murder' && flowStep === 'arrest' && (
        <section>
          <h2 className="cf-sec">THE ARREST</h2>
          <div className="cf-arrest">
            <p className="cf-arrest-title">WHO DID IT?</p>
            <p className="text-sm opacity-70">Tap a suspect to make the arrest.</p>
            <div className="cf-arrest-lineup">
              {c.suspects.map((s, i) => {
                const ruled = ruledBy.get(s.id);
                const wasWrong = state.wrongAccused.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`cf-arrest-sus ${ruled ? 'out' : ''}`}
                    disabled={won !== null}
                    onClick={() => accuse(s.id)}
                  >
                    <img src={portrait(i)} alt={s.name} loading="lazy" />
                    <span className="cf-arrest-name">{s.name}</span>
                    {wasWrong && (
                      <span className="cf-arrest-ruled">Ruled out by your accusation</span>
                    )}
                  </button>
                );
              })}
            </div>
            {accuseMsg && <p className="mt-3 text-sm font-semibold">{accuseMsg}</p>}
            <p className="cf-arrest-note">
              A wrong name costs one mistake and nothing else — you can keep accusing until
              the clues point to one person.
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
