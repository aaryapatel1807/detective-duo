'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Diamond,
  DoorOpen,
  Heart,
  KeyRound,
  Leaf,
  Lightbulb,
  Lock,
  Moon,
  RotateCcw,
  Star,
  Sun,
  Waves,
} from 'lucide-react';
import {
  generateLevelRoom,
  type EscapeRoom,
  type RoomLock,
  type RoomObject,
} from '@/lib/generators/escapeRoom';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';

const GAME_ID = 'escape-rooms';

function tierName(level: number): string {
  if (level <= 10) return 'Easy';
  if (level <= 30) return 'Medium';
  if (level <= 60) return 'Hard';
  return 'Expert';
}

const SYMBOL_ICONS: Record<string, typeof Star> = {
  Star,
  Moon,
  Leaf,
  Wave: Waves,
  Sun,
  Key: KeyRound,
  Heart,
  Diamond,
};

/** SVG placement for each room object (x, y, w, h). */
const POS: Record<string, [number, number, number, number]> = {
  note: [16, 16, 64, 44],
  painting: [110, 12, 96, 64],
  clock: [240, 16, 56, 56],
  symbols: [16, 84, 120, 44],
  chest: [16, 168, 76, 52],
  safe: [116, 168, 76, 52],
  panel: [216, 168, 76, 52],
  cabinet: [216, 84, 76, 52],
  door: [316, 84, 68, 136],
  vase: [316, 16, 52, 52],
  bookshelf: [110, 84, 96, 44],
  rug: [16, 228, 120, 20],
  drawer: [160, 228, 76, 20],
};

interface PlayState {
  inspected: string[];
  inventory: string[];
  unlocked: string[];
  hints: number;
  mistakes: number;
}

const freshState = (): PlayState => ({
  inspected: [],
  inventory: [],
  unlocked: [],
  hints: 0,
  mistakes: 0,
});

export default function EscapeRoomsPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [won, setWon] = useState<number | null>(null);
  const [selected, setSelected] = useState<RoomObject | null>(null);
  const [lockDialog, setLockDialog] = useState<RoomLock | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [patternInput, setPatternInput] = useState<string[]>([]);
  const [hintShown, setHintShown] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlockedLevel = Math.max(myProgress.currentLevel, 1);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const room: EscapeRoom = useMemo(
    () => generateLevelRoom(level, salt),
    [level, salt],
  );

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setSelected(null);
    setLockDialog(null);
    setMsg(null);
    try {
      const raw = localStorage.getItem(`dd-v2-er-${tag}`);
      if (raw) {
        setState(JSON.parse(raw) as PlayState);
        return;
      }
    } catch {
      /* ignore */
    }
    setState(freshState());
  }, [level, salt]);

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-er-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const isUnlocked = (id: string) => state.unlocked.includes(id);
  const otherLocks = room.locks.filter((l) => l.kind !== 'door');
  const allOthersOpen = otherLocks.every((l) => isUnlocked(l.id));

  const finishIfWon = (unlocked: string[], s: PlayState) => {
    if (won !== null) return;
    if (otherLocks.every((l) => unlocked.includes(l.id))) {
      // Door opens as soon as the chain is complete.
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, s.mistakes);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(`dd-v2-er-${salt}|${level}`);
      } catch {
        /* ignore */
      }
    }
  };

  const inspect = (obj: RoomObject) => {
    setLockDialog(null);
    setSelected(obj);
    setState((s) => {
      const inspected = s.inspected.includes(obj.id) ? s.inspected : [...s.inspected, obj.id];
      const inventory =
        obj.hidesItem && !s.inventory.includes(obj.hidesItem)
          ? [...s.inventory, obj.hidesItem]
          : s.inventory;
      if (obj.hidesItem && !s.inventory.includes(obj.hidesItem)) {
        setMsg(
          obj.hidesItem === 'key'
            ? 'A small brass key. It goes in your pocket.'
            : 'A small silver key. It goes in your pocket.',
        );
      }
      return { ...s, inspected, inventory };
    });
    // If this object carries a lock, offer the lock dialog too.
    const lock = room.locks.find((l) => l.onObjectId === obj.id && !isUnlocked(l.id));
    if (lock) setLockDialog(lock);
  };

  const openLock = (lock: RoomLock) => {
    setSelected(null);
    setCodeInput('');
    setPatternInput([]);
    setHintShown(false);
    if (lock.kind === 'door') {
      if (allOthersOpen) {
        finishIfWon(state.unlocked, state);
      } else {
        const remaining = otherLocks.filter((l) => !isUnlocked(l.id)).length;
        setMsg(`${remaining} lock${remaining === 1 ? '' : 's'} still to open before the door will budge.`);
      }
      return;
    }
    if (lock.kind === 'key' && lock.requiresItem && !state.inventory.includes(lock.requiresItem)) {
      setMsg(`This needs a key you have not found yet. ${lock.derivation}`);
      return;
    }
    setLockDialog(lock);
  };

  const unlock = (lock: RoomLock) => {
    setState((s) => {
      const unlocked = [...s.unlocked, lock.id];
      const ns = { ...s, unlocked };
      setTimeout(() => finishIfWon(unlocked, ns), 0);
      return ns;
    });
    setLockDialog(null);
    setMsg(`${lock.label} opens. Nice.`);
  };

  const submitCode = () => {
    if (!lockDialog || lockDialog.kind !== 'code') return;
    if (codeInput.trim() === lockDialog.solution) {
      unlock(lockDialog);
    } else {
      setState((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      setMsg('That code does not fit. Check the source again — no guessing needed.');
      setCodeInput('');
    }
  };

  const traceSymbol = (sym: string) => {
    if (!lockDialog || lockDialog.kind !== 'pattern') return;
    const next = [...patternInput, sym];
    const solution = lockDialog.solution as string[];
    if (next.length === solution.length) {
      if (next.every((v, i) => v === solution[i])) {
        unlock(lockDialog);
      } else {
        setState((s) => ({ ...s, mistakes: s.mistakes + 1 }));
        setMsg('That pattern does not match the wall. Trace it again, in order.');
      }
      setPatternInput([]);
    } else {
      setPatternInput(next);
    }
  };

  const useHint = () => {
    if (won !== null) return;
    setHintShown(true);
    setState((s) => ({ ...s, hints: s.hints + 1 }));
  };

  const restart = () => {
    setState(freshState());
    setWon(null);
    setSelected(null);
    setLockDialog(null);
    setMsg(null);
    try {
      localStorage.removeItem(`dd-v2-er-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const levelStars = myProgress.stars[String(level)] ?? 0;
  const sourceName = (id: string) => room.objects.find((o) => o.id === id)?.name ?? id;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <div className="flex items-center gap-1">
          <button type="button" className="btn !px-2 !py-2" disabled={level <= 1} onClick={() => setLevel(level - 1)} aria-label="Previous level">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span className="chip">Level {level} · {tierName(level)}</span>
          <button type="button" className="btn !px-2 !py-2" disabled={level >= unlockedLevel} onClick={() => setLevel(level + 1)} aria-label="Next level">
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <h1 className="mt-4 text-3xl font-bold">Escape Rooms</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        {room.title}. Tap things in the room to look closer. Every code comes from
        something you can see — a note, a painting, a clock, the symbols on the wall.
        Nothing here needs guessing.
      </p>
      {levelStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}{'☆'.repeat(3 - levelStars)}
        </p>
      )}

      {/* SVG room — theme tokens only, no hex colours. */}
      <section className="card mt-4 overflow-hidden p-3" aria-label={`${room.title} room diagram`}>
        <svg viewBox="0 0 400 260" className="w-full" role="img" aria-label={`A room: ${room.title}`}>
          <rect x="0" y="0" width="400" height="260" fill="var(--surface-2)" />
          <rect x="0" y="150" width="400" height="110" fill="var(--surface)" />
          {room.objects.map((obj) => {
            const [x, y, w, h] = POS[obj.id] ?? [16, 200, 64, 28];
            return (
              <g key={obj.id} onClick={() => inspect(obj)} style={{ cursor: 'pointer' }}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={8}
                  fill={selected?.id === obj.id ? 'var(--accent)' : 'var(--surface)'}
                  stroke="var(--line)"
                  strokeWidth={selected?.id === obj.id ? 2.5 : 1.5}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={selected?.id === obj.id ? 'var(--accent-ink)' : 'var(--ink)'}
                >
                  {obj.label}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Tap any object to look closer. The lock buttons below show what is still locked.
        </p>
      </section>

      {/* Inventory + locks */}
      <section className="mt-4 flex flex-wrap items-center gap-2">
        <span className="chip">
          <KeyRound size={14} aria-hidden /> Pocket:{' '}
          {state.inventory.length ? state.inventory.map((i) => (i === 'key' ? 'brass key' : 'silver key')).join(', ') : 'empty'}
        </span>
        {otherLocks.map((lock) => (
          <button
            key={lock.id}
            type="button"
            className="chip"
            disabled={isUnlocked(lock.id)}
            onClick={() => openLock(lock)}
          >
            {isUnlocked(lock.id) ? <DoorOpen size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
            {lock.label}: {isUnlocked(lock.id) ? 'open' : 'locked'}
          </button>
        ))}
        <button type="button" className="chip" onClick={() => openLock(room.locks[room.locks.length - 1])}>
          <DoorOpen size={14} aria-hidden /> Final door
        </button>
      </section>

      {/* Detail panel */}
      {selected && (
        <section className="paper mt-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold">{selected.name}</h2>
          <p className="mt-1">{selected.detail}</p>
          {room.locks
            .filter((l) => l.onObjectId === selected.id && !isUnlocked(l.id))
            .map((lock) => (
              <button key={lock.id} type="button" className="btn btn-primary mt-3" onClick={() => openLock(lock)}>
                <Lock size={16} aria-hidden /> Try the {lock.label.toLowerCase()}
              </button>
            ))}
        </section>
      )}

      {/* Lock dialog */}
      {lockDialog && lockDialog.kind !== 'door' && (
        <section className="card mt-4 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Lock size={18} aria-hidden /> {lockDialog.label}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Clue: look at the {sourceName(lockDialog.sourceId).toLowerCase()}
            {lockDialog.sources.length > 1 ? ` and the ${sourceName(lockDialog.sources[1]).toLowerCase()}` : ''}.
          </p>
          {lockDialog.kind === 'key' && (
            <p className="mt-2">You have the key. Open it?</p>
          )}
          {lockDialog.kind === 'code' && (
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                inputMode="numeric"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter the code"
                aria-label="Code"
              />
              <button type="button" className="btn btn-primary" onClick={submitCode}>Try it</button>
            </div>
          )}
          {lockDialog.kind === 'pattern' && (
            <div className="mt-3">
              <p className="text-sm">Traced so far: {patternInput.join(' · ') || 'nothing yet'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {room.wallSymbols.map((sym) => {
                  const Icon = SYMBOL_ICONS[sym] ?? Star;
                  return (
                    <button key={sym} type="button" className="btn !px-3" onClick={() => traceSymbol(sym)} aria-label={sym}>
                      <Icon size={18} aria-hidden /> {sym}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {lockDialog.kind === 'key' && (
            <button type="button" className="btn btn-primary mt-3" onClick={() => unlock(lockDialog)}>Open it</button>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={useHint}>
              <Lightbulb size={18} aria-hidden /> Hint (free)
            </button>
            <button type="button" className="btn" onClick={() => setLockDialog(null)}>Close</button>
          </div>
          {hintShown && <p className="mt-2 text-sm font-semibold">{lockDialog.derivation}</p>}
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={restart}>
          <RotateCcw size={18} aria-hidden /> Start over
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · Mistakes: {state.mistakes} · Locks open: {state.unlocked.length} of {otherLocks.length}
      </p>

      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">You are out.</p>
          <p className="mt-1 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}<span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <p className="text-sm text-[var(--ink-dim)]">Every lock traced back to something in the room. The next room adds a little more.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>Next room</button>
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}
    </main>
  );
}
