'use client';

/* FLAGSHIP — The Crime Mystery.
 *
 * Co-op asymmetric deduction: both detectives get the same case file, but
 * different clues (split 'a' / 'b' / 'both'). They MUST talk. Evidence board
 * with draggable pins + red strings (synced via room.shared), scripted
 * suspect interrogations, Field Intel hint tokens (fed by Cipher Breaker),
 * and a secret dual vote on the culprit.
 *
 * State lives in room.shared.games['crime-mystery'] (see types.ts).
 * framer-motion v10: animate wrapper divs only, never motion(Component).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { getMysteryCase, ALL_CASES } from './cases';
import { INTERROGATIONS } from './qa';
import {
  assignSides,
  attemptsLeft,
  castVote,
  clampPos,
  defaultPins,
  hintsAvailable,
  linkExists,
  MAX_ATTEMPTS,
  readProgress,
  sideOf,
  spendHint,
  tallyVotes,
  toggleLink,
  visibleClues,
  writeProgress,
} from './logic';
import type {
  HintToken,
  MysteryShared,
  PinPos,
  QA,
  Side,
} from './types';
import type { CaseFile, Clue } from '../../lib/content/cases';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';
import { Corkboard } from '../../components/Corkboard';
import { Pin } from '../../components/Pin';
import { RedStringLayer } from '../../components/RedString';
import { WaxSeal } from '../../components/WaxSeal';
import { Typewriter } from '../../components/Typewriter';

const SLUG = 'crime-mystery';

type BoardTab = 'board' | 'interrogate' | 'intel';

const DIFF_STAMP: Record<CaseFile['difficulty'], { label: string; color: string }> = {
  easy: { label: 'ROUTINE', color: 'var(--brass)' },
  medium: { label: 'TRICKY', color: 'var(--amber-glow)' },
  hard: { label: 'COLD-BLOODED', color: 'var(--blood)' },
};

export default function CrimeMysteryGame({ room }: GameProps) {
  const gs: MysteryShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.caseId ? gs.phase ?? 'board' : 'select';
  const activeCase = gs.caseId ? getMysteryCase(gs.caseId) : undefined;

  const patch = (p: MysteryShared) =>
    room.setShared({ games: { [SLUG]: p } } as Record<string, unknown>);

  const startCase = (c: CaseFile) => {
    const partnerId = room.peer ? room.peer.id : null;
    const sides = assignSides(room.me.id, partnerId);
    const pins = defaultPins(c.clues);
    sounds.paperShuffle();
    patch({
      caseId: c.id,
      phase: 'board',
      sides,
      pins,
      links: [],
      votes: {},
      attempts: 0,
      doubted: false,
      hintsUsed: 0,
      bonusRevealed: false,
      nudgesShown: [],
      awarded: {},
    });
  };

  const backToFiles = () => {
    sounds.paperShuffle();
    patch({
      caseId: null,
      phase: 'select',
      votes: {},
      links: [],
      pins: {},
      attempts: 0,
      doubted: false,
      hintsUsed: 0,
      bonusRevealed: false,
      nudgesShown: [],
      awarded: {},
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      {phase === 'select' && (
        <CaseSelect
          onStart={startCase}
          roomLog={gs.log ?? {}}
          peerName={room.peer?.name ?? null}
        />
      )}
      {phase === 'board' && activeCase && (
        <CaseView
          room={room}
          gs={gs}
          caseFile={activeCase}
          patch={patch}
          onAccuse={() => {
            sounds.paperShuffle();
            patch({ phase: 'accuse', votes: {} });
          }}
        />
      )}
      {phase === 'accuse' && activeCase && (
        <AccuseView room={room} gs={gs} caseFile={activeCase} patch={patch} />
      )}
      {phase === 'solved' && activeCase && (
        <SolvedView
          room={room}
          gs={gs}
          caseFile={activeCase}
          patch={patch}
          onNext={backToFiles}
        />
      )}
      {phase === 'failed' && activeCase && (
        <FailedView caseFile={activeCase} patch={patch} onNext={backToFiles} />
      )}
    </div>
  );
}

/* ============================ CASE SELECT ============================ */

function CaseSelect({
  onStart,
  roomLog,
  peerName,
}: {
  onStart: (c: CaseFile) => void;
  roomLog: Record<string, 'solved' | 'failed'>;
  peerName: string | null;
}) {
  const [progress, setProgress] = useState<Record<string, 'solved' | 'failed'>>({});
  useEffect(() => setProgress(readProgress()), []);

  return (
    <div>
      <div className="mb-6 text-center">
        <Typewriter text="THE CASE FILES" as="h2" className="text-3xl tracking-[0.2em]" animate />
        <p className="mt-2 font-type text-sm text-[var(--ink-dim)]">
          {peerName
            ? `You and ${peerName} get the same file — but different clues. Talk.`
            : 'No partner in the room — open a file to practice solo.'}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_CASES.map((c, i) => {
          const stamp = DIFF_STAMP[c.difficulty];
          const result = progress[c.id] ?? roomLog[c.id];
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -0.6 : 0.7 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 120, damping: 16 }}
            >
              <button
                onClick={() => onStart(c)}
                className="manila-folder group relative w-full p-5 text-left transition-transform hover:-translate-y-1"
              >
                <Pin className="absolute -top-2 left-1/2 -translate-x-1/2" />
                <div className="mb-1 font-type text-[0.65rem] tracking-[0.25em] text-[var(--ink-dim)]">
                  CASE FILE № {String(i + 1).padStart(2, '0')}
                </div>
                <div className="type-heading text-xl leading-tight">{c.title}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="inline-block rotate-[-4deg] border-2 px-2 py-0.5 font-type text-[0.65rem] font-bold tracking-[0.2em]"
                    style={{ borderColor: stamp.color, color: stamp.color }}
                  >
                    {stamp.label}
                  </span>
                  <span className="font-type text-[0.65rem] text-[var(--ink-dim)]">
                    {c.clues.length} clues · {c.suspects.length} suspects
                  </span>
                </div>
                {result && (
                  <div className="mt-3">
                    {result === 'solved' ? (
                      <span className="font-type text-xs font-bold tracking-[0.2em] text-green-700 dark:text-green-400">
                        ✓ CLOSED
                      </span>
                    ) : (
                      <span className="font-type text-xs font-bold tracking-[0.2em] text-[var(--blood)]">
                        ✗ COLD
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 font-type text-[0.7rem] tracking-[0.2em] text-[var(--ink-dim)] opacity-0 transition-opacity group-hover:opacity-100">
                  → OPEN THE FILE
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ CASE VIEW (tabs) ============================ */

function CaseView({
  room,
  gs,
  caseFile,
  patch,
  onAccuse,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  onAccuse: () => void;
}) {
  const [tab, setTab] = useState<BoardTab>('board');
  // Solo practice: let one player flip sides to see the partner's deal.
  const [practiceSide, setPracticeSide] = useState<Side | null>(null);
  const mySide: Side =
    practiceSide ?? sideOf(gs.sides, room.me.id);

  const switchTab = (t: BoardTab) => {
    sounds.paperShuffle();
    setTab(t);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typewriter text={caseFile.title.toUpperCase()} as="h2" className="text-2xl" />
          <p className="mt-1 max-w-3xl text-sm text-[var(--ink-dim)]">{caseFile.intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {room.peer === null && (
            <div className="flex overflow-hidden rounded border border-[var(--glass-border)] font-type text-xs">
              {(['a', 'b'] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setPracticeSide(practiceSide === s ? null : s)}
                  className={`px-3 py-1.5 ${mySide === s ? 'bg-[var(--amber-glow)] text-black' : 'text-[var(--ink-dim)]'}`}
                  title="Practice: preview a side's deal"
                >
                  {s === 'a' ? 'A-eyes' : 'B-eyes'}
                </button>
              ))}
            </div>
          )}
          <span className="noir-btn-ghost pointer-events-none">
            {room.peer ? `${room.me.name} sees ${mySide === 'a' ? 'A' : 'B'}-clues` : 'Solo practice'}
          </span>
        </div>
      </div>

      {gs.doubted && (
        <div className="mb-4 border-l-4 border-[var(--blood)] bg-[rgba(160,30,30,0.12)] px-4 py-2 font-type text-sm">
          ⚠ The captain doubts you. One wrong accusation on the record — make the next one count.
          ({attemptsLeft(gs.attempts ?? 0)} {attemptsLeft(gs.attempts ?? 0) === 1 ? 'try' : 'tries'} left)
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(
          [
            ['board', '📌 Evidence Board'],
            ['interrogate', '🎙 Interrogate'],
            ['intel', '✉ Field Intel'],
          ] as [BoardTab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={tab === t ? 'noir-btn' : 'noir-btn-ghost'}
          >
            {label}
            {t === 'intel' && (gs.hintTokens?.length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-[var(--blood)] px-2 text-xs text-white">
                {hintsAvailable(gs.hintTokens?.length ?? 0, gs.hintsUsed ?? 0)}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onAccuse} className="noir-btn border-[var(--blood)]">
          ⚖ Make the Accusation
        </button>
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tab === 'board' && (
          <EvidenceBoard room={room} gs={gs} caseFile={caseFile} patch={patch} mySide={mySide} />
        )}
        {tab === 'interrogate' && <InterrogateView caseFile={caseFile} />}
        {tab === 'intel' && (
          <IntelView room={room} gs={gs} caseFile={caseFile} patch={patch} />
        )}
      </motion.div>
    </div>
  );
}

/* ============================ EVIDENCE BOARD ============================ */

function EvidenceBoard({
  room,
  gs,
  caseFile,
  patch,
  mySide,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  mySide: Side;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSel, setLinkSel] = useState<string | null>(null);

  const pins = gs.pins ?? {};
  const links = gs.links ?? [];
  const mine = useMemo(
    () => visibleClues(caseFile, mySide, gs.bonusRevealed ?? false),
    [caseFile, mySide, gs.bonusRevealed],
  );
  const mineIds = useMemo(() => new Set(mine.map((c) => c.id)), [mine]);
  // Every clue in the case gets a pin; partner-only clues render face-down.
  const allClueIds = useMemo(() => {
    const ids = caseFile.clues.map((c) => c.id);
    if (gs.bonusRevealed) {
      const bonus = mine.find((c) => !caseFile.clues.some((k) => k.id === c.id));
      if (bonus && !ids.includes(bonus.id)) ids.push(bonus.id);
    }
    return ids;
  }, [caseFile, gs.bonusRevealed, mine]);

  const clueById = useMemo(() => {
    const m = new Map<string, Clue>();
    for (const c of caseFile.clues) m.set(c.id, c);
    for (const c of mine) m.set(c.id, c);
    return m;
  }, [caseFile, mine]);

  const toBoard = (clientX: number, clientY: number): PinPos | null => {
    const el = boardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return clampPos({
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    });
  };

  const commitPin = (id: string, pos: PinPos) => {
    sounds.pinTap();
    patch({ pins: { ...pins, [id]: pos } });
  };

  const onNoteTap = (id: string) => {
    if (!linkMode) return;
    if (linkSel === null) {
      setLinkSel(id);
      sounds.typewriterClick();
    } else {
      const next = toggleLink(links, linkSel, id);
      if (next.length !== links.length || linkExists(next, linkSel, id)) sounds.pinTap();
      patch({ links: next });
      setLinkSel(null);
    }
  };

  const connections = links
    .filter((l) => pins[l.a] && pins[l.b])
    .map((l) => ({ from: pins[l.a], to: pins[l.b], sag: 2 }));

  const partnerName = room.peer?.name ?? 'partner';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setLinkMode(!linkMode);
            setLinkSel(null);
            sounds.typewriterClick();
          }}
          className={linkMode ? 'noir-btn' : 'noir-btn-ghost'}
        >
          {linkMode ? '🧶 Linking… (tap two notes)' : '🧶 Link with red string'}
        </button>
        {linkMode && linkSel && (
          <span className="font-type text-xs text-[var(--ink-dim)]">
            one end pinned — tap another note to tie the string (tap again to cancel)
          </span>
        )}
        <div className="flex-1" />
        <span className="font-type text-xs text-[var(--ink-dim)]">
          drag notes to arrange · {mine.length} clues in your hands
        </span>
      </div>

      <Corkboard className="relative min-h-[520px] overflow-hidden rounded-lg">
        <div ref={boardRef} className="absolute inset-0">
          <RedStringLayer connections={connections} />
          {allClueIds.map((id, i) => {
            const pos = pins[id] ?? { x: 10 + i * 8, y: 12 + i * 6 };
            const isMine = mineIds.has(id);
            const clue = clueById.get(id);
            return (
              <DraggableNote
                key={id}
                id={id}
                pos={pos}
                sealed={!isMine}
                linkMode={linkMode}
                selected={linkSel === id}
                toBoard={toBoard}
                onCommit={commitPin}
                onTap={onNoteTap}
              >
                {isMine && clue ? (
                  <>
                    <div className="font-type text-[0.6rem] tracking-[0.2em] text-[var(--ink-dim)]">
                      EXHIBIT {String(i + 1).padStart(2, '0')} ·{' '}
                      {clue.split === 'both' ? 'SHARED' : mySide === 'a' ? 'YOUR EYES ONLY' : 'YOUR EYES ONLY'}
                    </div>
                    <p className="mt-1 text-[0.82rem] leading-snug">{clue.text}</p>
                  </>
                ) : (
                  <>
                    <div className="font-type text-[0.6rem] tracking-[0.2em] text-[var(--ink-dim)]">
                      🔒 SEALED
                    </div>
                    <p className="mt-1 font-type text-[0.78rem] leading-snug text-[var(--ink-dim)]">
                      {partnerName}&apos;s evidence.
                      <br />
                      Ask them about it.
                    </p>
                  </>
                )}
              </DraggableNote>
            );
          })}
        </div>
      </Corkboard>

      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((l, i) => (
            <span
              key={`${l.a}-${l.b}-${i}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--blood)] px-3 py-1 font-type text-xs"
            >
              🧶 {shortId(l.a)} ↔ {shortId(l.b)}
              <button
                onClick={() => patch({ links: toggleLink(links, l.a, l.b) })}
                className="text-[var(--blood)] hover:scale-125"
                aria-label="remove string"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function shortId(id: string): string {
  return id.split('-').slice(-1)[0].toUpperCase();
}

function DraggableNote({
  id,
  pos,
  sealed,
  linkMode,
  selected,
  toBoard,
  onCommit,
  onTap,
  children,
}: {
  id: string;
  pos: PinPos;
  sealed: boolean;
  linkMode: boolean;
  selected: boolean;
  toBoard: (x: number, y: number) => PinPos | null;
  onCommit: (id: string, pos: PinPos) => void;
  onTap: (id: string) => void;
  children: React.ReactNode;
}) {
  const [dragPos, setDragPos] = useState<PinPos | null>(null);
  const start = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const at = dragPos ?? pos;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -8 }}
      animate={{ scale: 1, rotate: sealed ? 1.5 : -1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="absolute w-52"
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        touchAction: 'none',
        cursor: linkMode ? 'crosshair' : 'grab',
        zIndex: dragPos ? 30 : selected ? 20 : 10,
      }}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const p = toBoard(e.clientX, e.clientY);
        if (!p) return;
        // move relative to grab point
        const origin = toBoard(s.x, s.y);
        if (!origin) return;
        setDragPos(clampPos({ x: s.px + (p.x - origin.x), y: s.py + (p.y - origin.y) }));
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
        if (moved < 6) {
          setDragPos(null);
          onTap(id);
        } else {
          const p = toBoard(e.clientX, e.clientY);
          const origin = toBoard(s.x, s.y);
          const finalPos =
            p && origin ? clampPos({ x: s.px + (p.x - origin.x), y: s.py + (p.y - origin.y) }) : pos;
          setDragPos(null);
          onCommit(id, finalPos);
        }
      }}
    >
      <div
        className={`paper-strip relative p-3 pt-4 shadow-lg ${
          selected ? 'outline-2 outline-[var(--blood)]' : ''
        } ${sealed ? 'opacity-90' : ''}`}
        style={selected ? { outlineStyle: 'solid' } : undefined}
      >
        <Pin className="absolute -top-2 left-1/2 -translate-x-1/2 scale-75" />
        {children}
      </div>
    </motion.div>
  );
}

/* ============================ INTERROGATE ============================ */

function InterrogateView({ caseFile }: { caseFile: CaseFile }) {
  const [suspect, setSuspect] = useState<string>(caseFile.suspects[0]?.name ?? '');
  const [asked, setAsked] = useState<Record<string, number[]>>({});
  const qa: QA[] = INTERROGATIONS[caseFile.id]?.[suspect] ?? [];
  const s = caseFile.suspects.find((x) => x.name === suspect);

  const ask = (i: number) => {
    sounds.typewriterClick();
    setAsked((prev) => ({
      ...prev,
      [suspect]: [...(prev[suspect] ?? []), i],
    }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {caseFile.suspects.map((sp) => (
          <button
            key={sp.name}
            onClick={() => {
              sounds.paperShuffle();
              setSuspect(sp.name);
            }}
            className={`shrink-0 rounded-lg border p-3 text-left transition-all ${
              suspect === sp.name
                ? 'border-[var(--amber-glow)] bg-[rgba(232,163,61,0.12)]'
                : 'border-[var(--glass-border)] hover:border-[var(--amber-glow)]'
            }`}
          >
            <div className="type-heading text-base">🕵 {sp.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-[var(--ink-dim)]">{sp.motive}</div>
          </button>
        ))}
      </div>

      <div className="glass-card rounded-[26px] p-5">
        {s && (
          <>
            <div className="mb-1 flex items-center justify-between">
              <Typewriter text={`INTERROGATION — ${s.name.toUpperCase()}`} as="h3" className="text-lg" />
              <span className="font-type text-[0.65rem] tracking-[0.2em] text-[var(--ink-dim)]">
                RECORDING ●
              </span>
            </div>
            <div className="mb-4 grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded bg-black/20 p-2">
                <span className="font-type text-[var(--blood)]">MOTIVE: </span>{s.motive}
              </div>
              <div className="rounded bg-black/20 p-2">
                <span className="font-type text-[var(--amber-glow)]">ALIBI: </span>{s.alibi}
              </div>
              <div className="rounded bg-black/20 p-2">
                <span className="font-type text-[var(--brass)]">SECRET: </span>{s.secret}
              </div>
            </div>
            <div className="space-y-3">
              {qa.map((pair, i) => {
                const isAsked = (asked[suspect] ?? []).includes(i);
                return (
                  <div key={i} className="rounded-lg border border-[var(--glass-border)] p-3">
                    <button
                      onClick={() => ask(i)}
                      className="w-full text-left font-type text-sm text-[var(--amber-glow)] hover:underline"
                    >
                      ❝ {pair.q}
                    </button>
                    {isAsked && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 border-l-2 border-[var(--brass)] pl-3 text-sm leading-relaxed"
                      >
                        <Typewriter text={pair.a} as="p" animate speed={14} />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================ FIELD INTEL ============================ */

function IntelView({
  room,
  gs,
  caseFile,
  patch,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
}) {
  const namespaced = gs.hintTokens ?? [];
  const legacy = (room.shared?.hintTokens as HintToken[] | undefined) ?? [];
  const seen = new Set<string>();
  const tokens: HintToken[] = [...namespaced, ...legacy].filter((t) =>
    t && !seen.has(t.text) && (seen.add(t.text), true),
  );
  const used = gs.hintsUsed ?? 0;
  const available = hintsAvailable(tokens.length, used);
  const nudges = gs.nudgesShown ?? [];

  const spend = () => {
    if (available <= 0) return;
    const y = spendHint(caseFile.id, used);
    sounds.stampThud();
    if (y.kind === 'bonus') {
      const pins = gs.pins ?? {};
      patch({
        hintsUsed: used + 1,
        bonusRevealed: true,
        pins: { ...pins, [y.clue.id]: { x: 78, y: 72 } },
      });
    } else if (y.kind === 'nudge') {
      patch({ hintsUsed: used + 1, nudgesShown: [...nudges, y.text] });
    } else {
      patch({ hintsUsed: used + 1 });
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ rotate: -2, y: 16 }}
        animate={{ rotate: 0, y: 0 }}
        className="glass-card relative rounded-[26px] p-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-16 w-24 items-center justify-center rounded-b-xl border-2 border-t-0 border-[var(--brass)] bg-[rgba(232,163,61,0.08)]">
          <span className="font-type text-xs tracking-[0.25em] text-[var(--brass)]">✉ INTEL</span>
        </div>
        <Typewriter text="FIELD INTEL" as="h3" className="text-xl" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Decoded intercepts from your partner&apos;s cipher work. Spend a token to shake
          something loose — the first one cracks open a sealed exhibit.
        </p>
        <div className="mt-4 font-type text-sm">
          Tokens available: <span className="text-lg font-bold text-[var(--amber-glow)]">{available}</span>
          <span className="text-[var(--ink-dim)]"> / {tokens.length} earned</span>
        </div>
        <button onClick={spend} disabled={available <= 0} className="noir-btn mt-4 disabled:opacity-40">
          🕯 Spend a token
        </button>
        {available <= 0 && tokens.length === 0 && (
          <p className="mx-auto mt-4 max-w-md font-type text-xs leading-relaxed text-[var(--ink-dim)]">
            No intel yet. Your partner earns Field Intel tokens by solving ciphers in{' '}
            <span className="text-[var(--amber-glow)]">Cipher Breaker</span> — each cracked
            code drops one here.
          </p>
        )}
      </motion.div>

      {tokens.length > 0 && (
        <div className="mt-4 space-y-2">
          {tokens.map((t, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${
                i < used
                  ? 'border-[var(--glass-border)] opacity-50'
                  : 'border-[var(--amber-glow)] bg-[rgba(232,163,61,0.07)]'
              }`}
            >
              <span className="font-type text-xs text-[var(--ink-dim)]">
                FROM {t.from.toUpperCase()} {i < used ? '· SPENT' : '· SEALED'}
              </span>
              <p className="mt-1">{t.text}</p>
            </div>
          ))}
        </div>
      )}

      {nudges.length > 0 && (
        <div className="mt-4">
          <div className="font-type text-xs tracking-[0.25em] text-[var(--ink-dim)]">STREET NUDGES</div>
          {nudges.map((n, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-2 border-l-4 border-[var(--amber-glow)] bg-black/20 p-3 text-sm"
            >
              {n}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ ACCUSATION ============================ */

function AccuseView({
  room,
  gs,
  caseFile,
  patch,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const votes = gs.votes ?? {};
  const voterIds = room.peer ? [room.me.id, room.peer.id] : [room.me.id];
  const meVoted = !!votes[room.me.id];
  const peerVoted = room.peer ? !!votes[room.peer.id] : true;
  const tally = tallyVotes(votes, voterIds, caseFile.culprit);

  useEffect(() => {
    if (tally === 'waiting') return;
    if (tally === 'solved') {
      sounds.stampThud();
      patch({
        phase: 'solved',
        log: { ...(gs.log ?? {}), [caseFile.id]: 'solved' },
      });
    } else {
      const attempts = (gs.attempts ?? 0) + 1;
      sounds.paperShuffle();
      if (attempts >= MAX_ATTEMPTS) {
        writeProgress(caseFile.id, 'failed');
        patch({
          phase: 'failed',
          attempts,
          votes: {},
          doubted: true,
          log: { ...(gs.log ?? {}), [caseFile.id]: 'failed' },
        });
      } else {
        patch({ phase: 'board', attempts, votes: {}, doubted: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tally]);

  const vote = () => {
    if (!pick || meVoted) return;
    sounds.typewriterClick();
    patch({ votes: castVote(votes, room.me.id, pick) });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <Typewriter text="NAME THE CULPRIT" as="h2" className="text-2xl tracking-[0.15em]" animate />
        <p className="mt-2 font-type text-sm text-[var(--ink-dim)]">
          {room.peer
            ? `Both detectives vote in secret. The file closes only if you BOTH name the same guilty party — and you're right.`
            : `Solo practice: your vote alone decides.`}
        </p>
        {(gs.attempts ?? 0) > 0 && (
          <p className="mt-1 font-type text-xs text-[var(--blood)]">
            ⚠ {attemptsLeft(gs.attempts ?? 0)} {attemptsLeft(gs.attempts ?? 0) === 1 ? 'try' : 'tries'} remaining
            — the captain is watching.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {caseFile.suspects.map((s) => (
          <button
            key={s.name}
            onClick={() => !meVoted && setPick(s.name)}
            disabled={meVoted}
            className={`rounded-xl border p-4 text-left transition-all ${
              pick === s.name
                ? 'border-[var(--blood)] bg-[rgba(160,30,30,0.12)]'
                : 'border-[var(--glass-border)] hover:border-[var(--blood)]'
            } ${meVoted ? 'opacity-60' : ''}`}
          >
            <div className="type-heading text-lg">🕵 {s.name}</div>
            <div className="mt-1 text-xs text-[var(--ink-dim)] line-clamp-2">{s.motive}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {!meVoted ? (
          <button onClick={vote} disabled={!pick} className="noir-btn disabled:opacity-40">
            🗳 Cast secret vote{pick ? `: ${pick}` : ''}
          </button>
        ) : (
          <div className="text-center">
            <div className="font-type text-sm text-[var(--amber-glow)]">
              🗳 Your vote is sealed.
            </div>
            <div className="mt-1 font-type text-xs text-[var(--ink-dim)]">
              {peerVoted ? 'Both votes are in — opening the envelopes…' : `Waiting for ${room.peer?.name ?? 'partner'}…`}
            </div>
          </div>
        )}
        <button
          onClick={() => patch({ phase: 'board', votes: {} })}
          className="noir-btn-ghost"
        >
          ← Back to the board
        </button>
      </div>
    </div>
  );
}

/* ============================ SOLVED / FAILED ============================ */

function SolvedView({
  room,
  gs,
  caseFile,
  patch,
  onNext,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  onNext: () => void;
}) {
  const awarded = gs.awarded ?? {};
  useEffect(() => {
    if (awarded[room.me.id]) return;
    const total = awardXP(XP_AWARDS.mysterySolved);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    recordCoopWin();
    writeProgress(caseFile.id, 'solved');
    sounds.xpTick();
    patch({ awarded: { ...awarded, [room.me.id]: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        className="glass-card rounded-[26px] p-8"
      >
        <div className="mb-4 flex justify-center">
          <WaxSeal size={96}>✓</WaxSeal>
        </div>
        <Typewriter text="CASE CLOSED" as="h2" className="text-3xl tracking-[0.2em]" animate />
        <p className="mt-3 font-type text-sm text-[var(--ink-dim)]">
          Both detectives named <span className="font-bold text-[var(--amber-glow)]">{caseFile.culprit}</span> —
          and the evidence agreed.
        </p>
        <div className="mx-auto mt-5 max-w-xl rounded-lg border border-[var(--glass-border)] bg-black/20 p-4 text-left">
          <div className="mb-2 font-type text-xs tracking-[0.25em] text-[var(--brass)]">
            THE CAPTAIN&apos;S SUMMARY
          </div>
          <Typewriter text={caseFile.solution} as="p" animate speed={12} className="text-sm leading-relaxed" />
        </div>
        <div className="mt-5 font-type text-sm">
          <span className="text-[var(--amber-glow)]">+{XP_AWARDS.mysterySolved} XP</span>
          <span className="text-[var(--ink-dim)]"> · co-op win recorded — check the Love Notes corner 💌</span>
        </div>
        <button onClick={onNext} className="noir-btn mt-6">
          📁 File the next case
        </button>
      </motion.div>
    </div>
  );
}

function FailedView({
  caseFile,
  patch,
  onNext,
}: {
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  onNext: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="glass-card rounded-[26px] p-8">
        <div className="mb-4 text-6xl">🗃</div>
        <Typewriter text="CASE GONE COLD" as="h2" className="text-3xl tracking-[0.2em] text-[var(--blood)]" animate />
        <p className="mt-3 text-sm text-[var(--ink-dim)]">
          Two wrong accusations. The captain shelved the file — the real culprit walked free… this time.
        </p>
        <div className="mx-auto mt-5 max-w-xl rounded-lg border border-[var(--glass-border)] bg-black/20 p-4 text-left">
          <div className="mb-2 font-type text-xs tracking-[0.25em] text-[var(--brass)]">
            WHAT REALLY HAPPENED
          </div>
          <p className="text-sm leading-relaxed">
            The culprit was <span className="font-bold text-[var(--amber-glow)]">{caseFile.culprit}</span>.{' '}
            {caseFile.solution}
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              sounds.paperShuffle();
              patch({ phase: 'board', attempts: 0, votes: {}, doubted: false });
            }}
            className="noir-btn"
          >
            🔁 Reopen the file
          </button>
          <button onClick={onNext} className="noir-btn-ghost">
            📁 Case files
          </button>
        </div>
      </div>
    </div>
  );
}
