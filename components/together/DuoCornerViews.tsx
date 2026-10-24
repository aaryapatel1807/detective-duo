'use client';

/**
 * Duo Corner together views (Phase 5).
 *
 * Rendered by the together play screen from the session row, so a refresh
 * restores the game exactly. Versus views (Dots and Boxes, Safe Cracker)
 * and the versus-flavoured Liar rounds track a PRIVATE tally: round wins
 * per player, shown inside the room only. No public board, no XP, no
 * ranks — just the two of them.
 */
import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Delete } from 'lucide-react';
import {
  claimEdge,
  emptyBoard,
  isFull,
  paramsForLevel as dotsParamsForLevel,
  score as dotsScore,
  type DotsBoxesBoard,
} from '@/lib/generators/dotsBoxes';
import {
  generateCode,
  isCracked,
  markGuess,
  paramsForLevel as safeParamsForLevel,
  versusProgress,
  type GuessRecord,
} from '@/lib/generators/safeCracker';
import {
  describeView,
  generateMaze,
  tryStep,
  visibleCells,
  type Dir,
  type LanternMaze,
} from '@/lib/generators/lanternMaze';
import {
  normaliseGuess,
  pickTheme,
  pickWord,
  SKETCH_THEMES,
  type SketchTheme,
  type Stroke,
} from '@/lib/generators/sketchWords';
import { LIAR_PROMPTS } from '@/lib/generators/liarBank';
import { rngFromSeed, shuffle } from '@/lib/generators/rng';
import { KNOW_TAG_LABEL, pickQuestions } from '@/lib/generators/knowMe';
import {
  dotsNextTurn,
  dotsResult,
  knowMePhase,
  liarPhase,
  sketchDrawerUid,
  tallyAfter,
  type RoomTally,
} from '@/lib/together/duoCorner';
import type { RoomPlayer, RoomSession } from '@/lib/together/types';
import DotsBoard from '@/components/duo/DotsBoard';
import SketchCanvas from '@/components/duo/SketchCanvas';
import { ProgressBars } from '@/components/together/VersusViews';

export interface DuoViewProps {
  seed: string;
  level: number;
  me: { uid: string; name: string };
  other: { uid: string; name: string } | undefined;
  players: RoomPlayer[];
  isHost: boolean;
  paused: boolean;
  state: Record<string, unknown>;
  update: (patch: Record<string, unknown>, immediate?: boolean) => void;
  updateSession: (patch: Partial<RoomSession>) => void;
  sendChat: (text: string) => void;
  winnerUid: string | null;
}

function hostUid(players: RoomPlayer[]): string {
  return players[0]?.uid ?? '';
}

function guestUid(players: RoomPlayer[], meUid: string): string {
  return players.find((p) => p.uid !== meUid)?.uid ?? '';
}

/** Private room tally: wins per display name, inside this room only. */
export function TallyPanel({
  tally,
  players,
  meUid,
}: {
  tally: RoomTally | undefined;
  players: RoomPlayer[];
  meUid: string;
}) {
  const rows = players.map((p) => ({ name: p.uid === meUid ? 'You' : p.name, wins: tally?.[p.uid] ?? 0 }));
  const total = rows.reduce((s, r) => s + r.wins, 0);
  return (
    <section className="panel mt-4 p-4">
      <p className="font-semibold">Rounds in this room</p>
      {total === 0 ? (
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          No rounds finished yet — the tally lives here, just between the two of you.
        </p>
      ) : (
        <p className="mt-1 text-sm">
          {rows.map((r) => `${r.name} · ${r.wins} ${r.wins === 1 ? 'win' : 'wins'}`).join(' — ')}
        </p>
      )}
    </section>
  );
}

function finishVersus(
  props: DuoViewProps,
  winnerUid: string | null,
  tally: RoomTally | undefined,
) {
  props.update({ tally: tallyAfter(tally, winnerUid) }, true);
  props.updateSession({ winnerUid, status: 'finished' });
}

// ------------------------------------------------------- Dots and Boxes ----

export function DotsBoxesDuo(props: DuoViewProps) {
  const params = dotsParamsForLevel(props.level);
  const stored = props.state.dotsBoard as DotsBoxesBoard | undefined;
  const board = stored && stored.size === params.size ? stored : emptyBoard(params.size);
  const turnUid = (props.state.dotsTurn as string | undefined) ?? hostUid(props.players);
  const tally = props.state.tally as RoomTally | undefined;
  const myTurn = turnUid === props.me.uid && !props.paused && !props.winnerUid;
  const full = isFull(board);

  const onEdge = (edge: Parameters<typeof claimEdge>[2]) => {
    if (!myTurn || full) return;
    const myIndex = props.players.findIndex((p) => p.uid === props.me.uid);
    const side = (myIndex === 1 ? 1 : 0) as 0 | 1;
    const res = claimEdge(board, side, edge);
    if (!res.valid) return;
    const uids = props.players.map((p) => p.uid);
    const next = dotsNextTurn(res.completed.length, props.me.uid, uids.length ? uids : [props.me.uid]);
    props.update({ dotsBoard: res.board, dotsTurn: next }, true);
    if (isFull(res.board)) {
      const r = dotsResult(res.board, uids.length ? uids : [props.me.uid, '']);
      if (r.finished) {
        finishVersus(props, r.winnerUid, tally);
      }
    }
  };

  const nameOf = (idx: 0 | 1) => {
    const p = props.players[idx];
    if (!p) return 'Partner';
    return p.uid === props.me.uid ? 'You' : p.name;
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span>
          {nameOf(0)} · {dotsScore(board)[0]}
        </span>
        <span className="chip">
          {props.winnerUid
            ? 'Game over'
            : props.paused
              ? 'Paused — waiting for a player'
              : myTurn
                ? 'Your turn'
                : `Waiting on ${turnUid === props.me.uid ? 'you' : props.other?.name ?? 'your partner'}`}
        </span>
        <span>
          {nameOf(1)} · {dotsScore(board)[1]}
        </span>
      </div>
      <div className="card mt-3 p-4">
        <DotsBoard board={board} onEdge={onEdge} interactive={myTurn && !full} />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        Close a box and you go again. Most boxes wins the round.
      </p>
      {props.winnerUid && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            {props.winnerUid === props.me.uid
              ? 'You took more boxes — lovely round.'
              : `${props.other?.name ?? 'Your partner'} took more boxes — lovely round.`}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Back to the room whenever you like, for another round.
          </p>
        </section>
      )}
      {props.winnerUid === null && full && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">An even game.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">Same boxes each. That counts too.</p>
        </section>
      )}
      <TallyPanel tally={tally} players={props.players} meUid={props.me.uid} />
    </div>
  );
}

// ---------------------------------------------------------- Safe Cracker ----

export function SafeCrackerVersus(props: DuoViewProps) {
  const params = safeParamsForLevel(props.level);
  const secret = generateCode(props.seed, props.level);
  const all = (props.state.safeGuesses ?? {}) as Record<string, GuessRecord[]>;
  const myGuesses = all[props.me.uid] ?? [];
  const otherUid = guestUid(props.players, props.me.uid);
  const otherGuesses = otherUid ? (all[otherUid] ?? []) : [];
  const tally = props.state.tally as RoomTally | undefined;
  const [current, setCurrent] = useState<number[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const myCracked = myGuesses.some((g) => isCracked(g.guess, secret));
  const myPct = myCracked ? 1 : versusProgress(params, myGuesses, false);
  const otherPct = otherUid
    ? otherGuesses.some((g) => isCracked(g.guess, secret))
      ? 1
      : versusProgress(params, otherGuesses, false)
    : 0;

  const submit = () => {
    if (props.paused || props.winnerUid || myCracked || current.length !== params.digits) return;
    if (!params.repeats && new Set(current).size !== current.length) {
      setMsg('This level never repeats a digit. Swap one out.');
      return;
    }
    const guess = [...current];
    const mark = markGuess(guess, secret);
    const next = [...myGuesses, { guess, mark }];
    const cracked = isCracked(guess, secret);
    props.update(
      {
        safeGuesses: { ...all, [props.me.uid]: next },
        safeProgress: {
          ...((props.state.safeProgress ?? {}) as Record<string, number>),
          [props.me.uid]: cracked ? 1 : versusProgress(params, next, false),
        },
      },
      true,
    );
    setCurrent([]);
    if (cracked) {
      finishVersus(props, props.me.uid, tally);
    } else {
      setMsg(
        mark.rightPlace === 0 && mark.rightDigit === 0
          ? 'None of those digits are in the code. That rules out a lot.'
          : `${mark.rightPlace} in the right place, ${mark.rightDigit} right digit, wrong place.`,
      );
    }
  };

  return (
    <div>
      <ProgressBars
        rows={[
          { name: 'You', pct: myPct, isMe: true },
          { name: props.other?.name ?? 'Partner', pct: otherPct, isMe: false },
        ]}
      />
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        Same secret code, both of you. First to crack it wins the round.
      </p>
      <section className="card mt-3 p-4">
        <p className="text-sm font-semibold">Your guesses</p>
        <div className="mt-2 space-y-2">
          {myGuesses.length === 0 && (
            <p className="text-sm text-[var(--ink-dim)]">No guesses yet.</p>
          )}
          {myGuesses.map((g, i) => (
            <div key={i} className="panel flex items-center justify-between gap-2 p-3">
              <span className="flex gap-1.5">
                {g.guess.map((d, j) => (
                  <span key={j} className="chip !px-3 !py-1.5 text-base font-bold">
                    {d}
                  </span>
                ))}
              </span>
              <span className="text-sm text-[var(--ink-dim)]">
                {g.mark.rightPlace} right place · {g.mark.rightDigit} right digit
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {current.map((d, i) => (
            <span key={i} className="chip !px-3 !py-1.5 text-base font-bold">
              {d}
            </span>
          ))}
          {Array.from({ length: params.digits - current.length }, (_, i) => (
            <span key={`e-${i}`} className="chip !px-3 !py-1.5 text-base opacity-40">
              ·
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: params.pool }, (_, d) => (
            <button
              key={d}
              type="button"
              className="btn !px-3.5 !py-2 text-base font-bold"
              disabled={current.length >= params.digits || props.paused || !!props.winnerUid}
              onClick={() => setCurrent([...current, d])}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            className="btn !px-3 !py-2"
            onClick={() => setCurrent(current.slice(0, -1))}
            aria-label="Delete last digit"
          >
            <Delete size={18} aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-primary !px-4 !py-2"
            disabled={current.length !== params.digits || props.paused || !!props.winnerUid}
            onClick={submit}
          >
            Guess
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Your guesses: {myGuesses.length} · {props.other?.name ?? 'Partner'}’s guesses:{' '}
          {otherGuesses.length} (their digits stay hidden — that is the race).
        </p>
      </section>
      {props.winnerUid && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            {props.winnerUid === props.me.uid
              ? 'You cracked it first — lovely round.'
              : `${props.other?.name ?? 'Your partner'} cracked it first — lovely round.`}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            The code was {secret.join('')}. Back to the room for another round.
          </p>
        </section>
      )}
      <TallyPanel tally={tally} players={props.players} meUid={props.me.uid} />
    </div>
  );
}

// ------------------------------------------------------- Lantern and Map ----

function MazeGrid({
  maze,
  visible,
  pos,
  keys,
}: {
  maze: LanternMaze;
  /** Null = whole map visible (map-reader). Otherwise only these tiles. */
  visible: Set<string> | null;
  pos: [number, number] | null;
  keys: number[];
}) {
  const isDoor = (key: string) => maze.doors.includes(key);
  return (
    <div
      className="mx-auto grid w-full max-w-md"
      style={{ gridTemplateColumns: `repeat(${maze.w}, minmax(0, 1fr))` }}
      role="img"
      aria-label="Maze"
    >
      {Array.from({ length: maze.h }, (_, y) =>
        Array.from({ length: maze.w }, (_, x) => {
          const key = `${x},${y}`;
          const seen = visible === null || visible.has(key);
          const isPlayer = pos !== null && pos[0] === x && pos[1] === y;
          const isExit = maze.exit[0] === x && maze.exit[1] === y;
          const keyHere = maze.keyCells[key];
          const hasKey = keyHere !== undefined && !keys.includes(keyHere);
          if (!seen && !isPlayer) return <div key={key} className="aspect-square" />;
          const side = (wall: boolean, doorKey: string) => {
            if (!wall) return { color: 'transparent', style: 'none' as const };
            if (isDoor(doorKey)) return { color: 'var(--accent-2)', style: 'dashed' as const };
            return { color: 'var(--line)', style: 'solid' as const };
          };
          const top = side(maze.hWalls[y][x], `h:${y},${x}`);
          const bottom = side(maze.hWalls[y + 1][x], `h:${y + 1},${x}`);
          const left = side(maze.vWalls[y][x], `v:${y},${x}`);
          const right = side(maze.vWalls[y][x + 1], `v:${y},${x + 1}`);
          return (
            <div
              key={key}
              className="relative flex aspect-square items-center justify-center"
              style={{
                background: 'var(--cell)',
                borderTopWidth: 2,
                borderBottomWidth: 2,
                borderLeftWidth: 2,
                borderRightWidth: 2,
                borderTopColor: top.color,
                borderTopStyle: top.style,
                borderBottomColor: bottom.color,
                borderBottomStyle: bottom.style,
                borderLeftColor: left.color,
                borderLeftStyle: left.style,
                borderRightColor: right.color,
                borderRightStyle: right.style,
              }}
            >
              {isPlayer && (
                <span
                  className="block h-1/2 w-1/2 rounded-full"
                  style={{ background: 'var(--accent)', boxShadow: 'var(--glow)' }}
                  aria-label="Walker is here"
                />
              )}
              {!isPlayer && isExit && <span className="text-xs font-bold">EXIT</span>}
              {!isPlayer && hasKey && <span className="text-xs font-bold">KEY</span>}
            </div>
          );
        }),
      )}
    </div>
  );
}

export function LanternDuo(props: DuoViewProps) {
  const maze = generateMaze(props.seed, props.level);
  const pos = (props.state.lanternPos as [number, number] | undefined) ?? maze.start;
  const keys = (props.state.lanternKeys as number[] | undefined) ?? [];
  const roles = (props.state.lanternRole as Record<string, 'walker' | 'map'> | undefined) ?? {};
  const myRole = roles[props.me.uid] ?? (props.isHost ? 'walker' : 'map');
  const won = (props.state.lanternWon as boolean | undefined) ?? false;
  const [msg, setMsg] = useState<string | null>(null);

  const swapRole = () => {
    const next: Record<string, 'walker' | 'map'> = { ...roles };
    const otherUid = guestUid(props.players, props.me.uid);
    next[props.me.uid] = myRole === 'walker' ? 'map' : 'walker';
    if (otherUid) next[otherUid] = next[props.me.uid] === 'walker' ? 'map' : 'walker';
    props.update({ lanternRole: next }, true);
  };

  const move = (dir: Dir) => {
    if (myRole !== 'walker' || props.paused || won) return;
    const res = tryStep(maze, pos, dir, keys);
    if (!res.info.ok) {
      setMsg(
        res.info.blocked === 'locked-door'
          ? 'Locked. Its key is somewhere in the dark.'
          : res.info.blocked === 'edge'
            ? 'That way is the edge of the map.'
            : 'A wall. Try another way.',
      );
      return;
    }
    const nextKeys = res.info.pickedKey !== null ? [...keys, res.info.pickedKey] : keys;
    props.update({ lanternPos: res.pos, lanternKeys: nextKeys }, true);
    if (res.info.reachedExit) {
      props.update({ lanternWon: true }, true);
      props.updateSession({ status: 'finished' });
      return;
    }
    setMsg(
      res.info.hitTrap
        ? 'A trapdoor! Back at the start. The maze has not changed.'
        : res.info.pickedKey !== null
          ? 'You found a key. It opens one locked door somewhere ahead.'
          : null,
    );
  };

  const vis = new Set(visibleCells(maze, pos, keys).map(([x, y]) => `${x},${y}`));
  const padBtn = 'btn !px-2 !py-3';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">
          You are the {myRole === 'walker' ? 'walker' : 'map-reader'}
        </span>
        <button type="button" className="btn !px-3 !py-2 text-sm" onClick={swapRole}>
          Swap roles
        </button>
      </div>
      {myRole === 'walker' ? (
        <section className="card mt-3 p-4">
          <p className="text-sm text-[var(--ink-dim)]">
            You see only your tile and its open passages. Describe what you see to your
            partner — they hold the whole map.
          </p>
          <div className="mt-3">
            <MazeGrid maze={maze} visible={vis} pos={pos} keys={keys} />
          </div>
          <div className="mx-auto mt-4 grid w-40 grid-cols-3 gap-1">
            <span />
            <button type="button" className={padBtn} onClick={() => move('up')} aria-label="Move up"><ChevronUp size={20} aria-hidden /></button>
            <span />
            <button type="button" className={padBtn} onClick={() => move('left')} aria-label="Move left"><ChevronLeft size={20} aria-hidden /></button>
            <button type="button" className={padBtn} onClick={() => move('down')} aria-label="Move down"><ChevronDown size={20} aria-hidden /></button>
            <button type="button" className={padBtn} onClick={() => move('right')} aria-label="Move right"><ChevronRight size={20} aria-hidden /></button>
          </div>
          <button
            type="button"
            className="btn mt-3"
            onClick={() => props.sendChat(describeView(maze, pos, keys))}
          >
            Tell my partner what I see
          </button>
          {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Keys: {keys.length} of {maze.doors.length} · Dashed lines are locked doors.
          </p>
        </section>
      ) : (
        <section className="card mt-3 p-4">
          <p className="text-sm text-[var(--ink-dim)]">
            You see the whole maze — but not where your partner is. Only what they
            describe. Guide them with the chat.
          </p>
          <div className="mt-3">
            <MazeGrid maze={maze} visible={null} pos={null} keys={keys} />
          </div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            The walker’s keys so far: {keys.length} of {maze.doors.length}.
          </p>
        </section>
      )}
      {won && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">You escaped together.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Walker and map-reader, talking the whole way. Back to the room for a harder maze.
          </p>
        </section>
      )}
    </div>
  );
}

// -------------------------------------------------------- Sketch the Clue ----

export function SketchDuo(props: DuoViewProps) {
  const round = (props.state.sketchRound as number | undefined) ?? 0;
  const theme: SketchTheme = pickTheme(`${props.seed}|${round}`);
  const word = pickWord(`${props.seed}|${round}`, props.level, theme);
  const host = hostUid(props.players);
  const guest = guestUid(props.players, props.me.uid);
  const drawer = sketchDrawerUid(round, host, guest || host);
  const isDrawer = drawer === props.me.uid;
  const strokes = (props.state.sketchStrokes as Stroke[] | undefined) ?? [];
  const guesses = (props.state.sketchGuesses as { name: string; text: string }[] | undefined) ?? [];
  const wonUid = (props.state.sketchWonUid as string | undefined) ?? null;
  const [guess, setGuess] = useState('');

  const submitGuess = () => {
    if (props.paused || wonUid || guess.trim() === '') return;
    const text = guess.trim();
    const next = [...guesses, { name: props.me.name, text }];
    if (normaliseGuess(text) === normaliseGuess(word.word)) {
      props.update({ sketchGuesses: next, sketchWonUid: props.me.uid }, true);
    } else {
      props.update({ sketchGuesses: next }, true);
    }
    setGuess('');
  };

  const nextWord = () => {
    props.update(
      { sketchRound: round + 1, sketchStrokes: [], sketchGuesses: [], sketchWonUid: null },
      true,
    );
  };

  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        Round {round + 1} · Theme: {SKETCH_THEMES.find((t) => t.id === theme)?.label} ·{' '}
        {isDrawer ? 'You draw.' : `${props.other?.name ?? 'Your partner'} draws.`}
      </p>
      {isDrawer ? (
        <section className="card mt-3 p-4">
          <p className="text-lg">
            Draw: <span className="font-display text-xl font-bold">{word.word}</span>
            <span className="ml-2 text-sm text-[var(--ink-dim)]">{word.hint}</span>
          </p>
          <div className="mt-3">
            <SketchCanvas
              strokes={strokes}
              onStrokeEnd={(s) =>
                props.update({ sketchStrokes: [...strokes, s].slice(-80) }, true)
              }
              disabled={!!wonUid || props.paused}
            />
          </div>
          <button
            type="button"
            className="btn mt-3"
            onClick={() => props.update({ sketchStrokes: [] }, true)}
          >
            Clear board
          </button>
        </section>
      ) : (
        <section className="card mt-3 p-4">
          <p className="text-sm text-[var(--ink-dim)]">
            Watch the drawing appear, then type what you think it is. No rush.
          </p>
          <div className="mt-3">
            <SketchCanvas strokes={strokes} onStrokeEnd={() => {}} disabled />
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="input flex-1"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
              placeholder="What is it?"
              disabled={!!wonUid || props.paused}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitGuess}
              disabled={!!wonUid || props.paused}
            >
              Guess
            </button>
          </div>
        </section>
      )}
      {guesses.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {guesses.map((g, i) => (
            <p key={i} className="panel p-3 text-sm">
              <span className="font-semibold">{g.name}:</span> {g.text}
            </p>
          ))}
        </div>
      )}
      {wonUid && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            Guessed it — the word was {word.word}.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {wonUid === props.me.uid ? 'You guessed it.' : `${props.other?.name ?? 'Your partner'} guessed it.`}{' '}
            Next round, the roles swap.
          </p>
          <button type="button" className="btn btn-primary mt-3" onClick={nextWord}>
            Next word
          </button>
        </section>
      )}
      {!guest && !isDrawer && (
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Waiting for your partner to join with the room code.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------- Spot the Liar ----

interface LiarDraft {
  statements: [string, string, string];
  lie: number;
}

export function LiarDuo(props: DuoViewProps) {
  const roundNum = (props.state.liarRound as number | undefined) ?? 0;
  const host = hostUid(props.players);
  const writer = (props.state.liarWriter as string | undefined) ?? host;
  const statements = (props.state.liarStatements as string[] | undefined) ?? [];
  const lie = (props.state.liarLie as number | null | undefined) ?? null;
  const questions = (props.state.liarQuestions as { text: string; answer: 'yes' | 'no' | null }[] | undefined) ?? [];
  const guess = (props.state.liarGuess as number | null | undefined) ?? null;
  const tally = props.state.tally as RoomTally | undefined;
  const isWriter = writer === props.me.uid;
  const otherUid = guestUid(props.players, props.me.uid);
  const phase = liarPhase({ writerUid: writer, statements, lieIndex: lie, questions, guessIndex: guess });

  const [draft, setDraft] = useState<LiarDraft>({ statements: ['', '', ''], lie: 0 });
  const [question, setQuestion] = useState('');
  const [draftKey, setDraftKey] = useState(roundNum);
  if (draftKey !== roundNum) {
    setDraftKey(roundNum);
    setDraft({ statements: ['', '', ''], lie: 0 });
  }

  const prompts = shuffle([...LIAR_PROMPTS], rngFromSeed(`${props.seed}|${roundNum}`)).slice(0, 6);

  const submitStatements = () => {
    if (draft.statements.some((s) => s.trim() === '')) return;
    props.update(
      { liarStatements: draft.statements.map((s) => s.trim()), liarLie: draft.lie },
      true,
    );
  };

  const askQuestion = () => {
    if (question.trim() === '' || questions.length >= 3 || props.paused) return;
    props.update({ liarQuestions: [...questions, { text: question.trim(), answer: null }] }, true);
    setQuestion('');
  };

  const answerQuestion = (i: number, a: 'yes' | 'no') => {
    const next = questions.map((q, j) => (j === i ? { ...q, answer: a } : q));
    props.update({ liarQuestions: next }, true);
  };

  const pickLie = (i: number) => {
    if (phase !== 'picking' || props.paused) return;
    const winnerUid = i === lie ? props.me.uid : writer;
    props.update({ liarGuess: i, tally: tallyAfter(tally, winnerUid) }, true);
  };

  const nextRound = () => {
    props.update(
      {
        liarRound: roundNum + 1,
        liarWriter: otherUid || host,
        liarStatements: [],
        liarLie: null,
        liarQuestions: [],
        liarGuess: null,
      },
      true,
    );
  };

  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        Round {roundNum + 1} · {isWriter ? 'You write the statements.' : `${props.other?.name ?? 'Your partner'} writes the statements.`}
      </p>

      {phase === 'writing' && isWriter && (
        <section className="card mt-3 p-4">
          <p className="font-semibold">Write three statements about yourself — two true, one false.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Stuck? Steal a prompt:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                className="chip"
                onClick={() => {
                  const idx = draft.statements.findIndex((s) => s === '');
                  if (idx !== -1) {
                    const next = [...draft.statements] as [string, string, string];
                    next[idx] = p;
                    setDraft({ ...draft, statements: next });
                  }
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {draft.statements.map((s, i) => (
              <label key={i} className="block">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="lie"
                    checked={draft.lie === i}
                    onChange={() => setDraft({ ...draft, lie: i })}
                    aria-label={`Statement ${i + 1} is the lie`}
                  />
                  Statement {i + 1} {draft.lie === i ? '· this one is the lie' : ''}
                </span>
                <input
                  className="input mt-1 w-full"
                  value={s}
                  onChange={(e) => {
                    const next = [...draft.statements] as [string, string, string];
                    next[i] = e.target.value;
                    setDraft({ ...draft, statements: next });
                  }}
                  placeholder="Something about you"
                />
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary mt-3" onClick={submitStatements}>
            Send the statements
          </button>
        </section>
      )}

      {phase === 'writing' && !isWriter && (
        <p className="panel mt-3 p-4 text-sm">
          Your partner is writing three statements about themselves. Two true, one false.
          You will get up to three yes/no questions before you pick the lie.
        </p>
      )}

      {(phase === 'asking' || phase === 'picking') && (
        <section className="card mt-3 p-4">
          <h2 className="font-display text-lg font-bold">The statements</h2>
          <ol className="mt-2 space-y-2">
            {statements.map((s, i) => (
              <li key={i} className="panel p-3 text-sm">
                {i + 1}. {s}
              </li>
            ))}
          </ol>
          <h3 className="mt-4 font-semibold">Questions ({questions.length} of 3)</h3>
          <div className="mt-2 space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="panel p-3 text-sm">
                <p>{q.text}</p>
                {q.answer ? (
                  <p className="mt-1 font-semibold">Answer: {q.answer}</p>
                ) : isWriter ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn !px-3 !py-1.5 text-sm" onClick={() => answerQuestion(i, 'yes')}>
                      Yes
                    </button>
                    <button type="button" className="btn !px-3 !py-1.5 text-sm" onClick={() => answerQuestion(i, 'no')}>
                      No
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-[var(--ink-dim)]">Waiting for an answer.</p>
                )}
              </div>
            ))}
          </div>
          {!isWriter && questions.length < 3 && phase === 'asking' && (
            <div className="mt-3 flex gap-2">
              <input
                className="input flex-1"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                placeholder="A yes/no question"
                disabled={props.paused}
              />
              <button type="button" className="btn btn-primary" onClick={askQuestion} disabled={props.paused}>
                Ask
              </button>
            </div>
          )}
          {!isWriter && phase === 'picking' && (
            <div className="mt-4">
              <p className="font-semibold">Pick the lie.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {statements.map((_, i) => (
                  <button key={i} type="button" className="btn" onClick={() => pickLie(i)} disabled={props.paused}>
                    Statement {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isWriter && phase === 'picking' && (
            <p className="mt-3 text-sm text-[var(--ink-dim)]">
              Your partner is picking the lie. No peeking — the reveal comes next.
            </p>
          )}
        </section>
      )}

      {phase === 'revealed' && (
        <section className="card mt-3 p-4 text-center">
          <p className="font-display text-xl font-bold">
            The lie was statement {(lie ?? 0) + 1}: {statements[lie ?? 0]}
          </p>
          <p className="mt-1 text-sm">
            {guess === lie
              ? isWriter
                ? 'Your partner spotted it.'
                : 'You spotted it.'
              : isWriter
                ? 'You fooled them — they picked a true statement.'
                : 'You picked a true statement — the writer fooled you.'}
          </p>
          <button type="button" className="btn btn-primary mt-3" onClick={nextRound}>
            Next round (swap roles)
          </button>
        </section>
      )}

      <TallyPanel tally={tally} players={props.players} meUid={props.me.uid} />
    </div>
  );
}

// ------------------------------------------------- How Well Do You Know Me ----

export function KnowMeDuo(props: DuoViewProps) {
  const questions = pickQuestions(props.seed);
  const answers = (props.state.knowAnswers as Record<string, Record<string, string>> | undefined) ?? {};
  const guesses = (props.state.knowGuesses as Record<string, Record<string, string>> | undefined) ?? {};
  const uids = props.players.length >= 2 ? props.players.map((p) => p.uid) : [props.me.uid, '__waiting__'];
  const phase = knowMePhase(answers, guesses, uids, questions.length);
  const otherUid = guestUid(props.players, props.me.uid);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const myAnswers = answers[props.me.uid] ?? {};
  const partnerAnswers = otherUid ? (answers[otherUid] ?? {}) : {};
  const myGuesses = guesses[props.me.uid] ?? {};
  const partnerGuesses = otherUid ? (guesses[otherUid] ?? {}) : {};
  const answeredCount = (m: Record<string, string>) =>
    Object.values(m).filter((v) => (v ?? '').trim() !== '').length;

  const saveAnswers = () => {
    props.update({ knowAnswers: { ...answers, [props.me.uid]: draft } }, true);
  };

  const saveGuesses = () => {
    props.update({ knowGuesses: { ...guesses, [props.me.uid]: draft } }, true);
  };

  // Draft follows the current phase's fields.
  const draftFor = phase === 'answering' ? myAnswers : myGuesses;
  const draftKey = `${phase}|${Object.keys(draftFor).length}`;
  const [seenKey, setSeenKey] = useState(draftKey);
  if (seenKey !== draftKey) {
    setSeenKey(draftKey);
    setDraft(draftFor);
  }

  const allFilled = (m: Record<string, string>) =>
    questions.every((q) => (m[q.id] ?? '').trim() !== '');

  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        Six questions, three moods. Answer privately, guess each other’s, reveal together.
      </p>

      {phase === 'answering' && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">First, about you</h2>
          {questions.map((q) => (
            <label key={q.id} className="card block p-4">
              <span className="font-semibold">{q.text}</span>
              <span className="chip ml-2">{KNOW_TAG_LABEL[q.tag]}</span>
              <input
                className="input mt-2 w-full"
                value={draft[q.id] ?? ''}
                onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })}
                placeholder="Your answer"
                disabled={props.paused}
              />
            </label>
          ))}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allFilled(draft) || props.paused}
            onClick={saveAnswers}
          >
            Save my answers
          </button>
          <p className="text-sm text-[var(--ink-dim)]">
            {props.players.length < 2
              ? 'Waiting for your partner to join with the room code.'
              : answeredCount(partnerAnswers) >= questions.length
                ? 'Your partner has answered.'
                : `Your partner has answered ${answeredCount(partnerAnswers)} of ${questions.length}. Their answers stay hidden until the reveal.`}
          </p>
        </section>
      )}

      {phase === 'guessing' && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">Now guess each other’s answers</h2>
          {questions.map((q) => (
            <label key={q.id} className="card block p-4">
              <span className="font-semibold">{q.text}</span>
              <span className="mt-1 block text-sm text-[var(--ink-dim)]">
                You answered: {myAnswers[q.id]}
              </span>
              <input
                className="input mt-2 w-full"
                value={draft[q.id] ?? ''}
                onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })}
                placeholder={`${props.other?.name ?? 'Your partner'} would say…`}
                disabled={props.paused}
              />
            </label>
          ))}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allFilled(draft) || props.paused}
            onClick={saveGuesses}
          >
            Save my guesses
          </button>
          <p className="text-sm text-[var(--ink-dim)]">
            {answeredCount(partnerGuesses) >= questions.length
              ? 'Your partner has guessed.'
              : `Your partner has guessed ${answeredCount(partnerGuesses)} of ${questions.length}.`}
          </p>
        </section>
      )}

      {phase === 'reveal' && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">The reveal</h2>
          {questions.map((q) => {
            const norm = (s: string) => s.trim().toLowerCase();
            const iMatch = norm(myGuesses[q.id] ?? '') === norm(partnerAnswers[q.id] ?? '');
            const pMatch = norm(partnerGuesses[q.id] ?? '') === norm(myAnswers[q.id] ?? '');
            return (
              <div key={q.id} className="card p-4">
                <p className="font-semibold">{q.text}</p>
                <p className="mt-1 text-sm">You: {myAnswers[q.id]}</p>
                <p className="text-sm">{props.other?.name ?? 'Partner'}: {partnerAnswers[q.id]}</p>
                <p className="text-sm">
                  You guessed: {myGuesses[q.id]} — {iMatch ? 'Match.' : 'Not quite.'}
                </p>
                <p className="text-sm">
                  They guessed: {partnerGuesses[q.id]} — {pMatch ? 'Match.' : 'Not quite.'}
                </p>
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => props.updateSession({ status: 'lobby', game: '', mode: '', winnerUid: null })}
          >
            Back to the room
          </button>
        </section>
      )}
    </div>
  );
}
