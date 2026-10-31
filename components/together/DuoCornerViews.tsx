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
  guessCloseness,
  normaliseGuess,
  pickTheme,
  pickWord,
  sketchBlanks,
  sketchFirstLetterHint,
  SKETCH_THEMES,
  type SketchTheme,
  type Stroke,
} from '@/lib/generators/sketchWords';
import { LIAR_PROMPTS } from '@/lib/generators/liarBank';
import { rngFromSeed, shuffle } from '@/lib/generators/rng';
import {
  KNOW_TAG_LABEL,
  pickQuestions,
  pickWyr,
  validatedCorrectCount,
  type KnowValidation,
} from '@/lib/generators/knowMe';
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
  // Guesser aids: wrong guesses so far, and the first-letter hint that
  // unlocks after 3 wrong guesses (guesser side only, below).
  const wrongCount = guesses.filter(
    (g) => normaliseGuess(g.text) !== normaliseGuess(word.word),
  ).length;
  const firstLetterHint = sketchFirstLetterHint(word.word, wrongCount);

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
          <p className="mt-2 font-display text-xl font-bold tracking-widest" aria-label={`Word length: ${word.word.replace(/ /g, '').length} letters`}>
            {sketchBlanks(word.word)}
          </p>
          <p className="text-sm text-[var(--ink-dim)]">
            {word.word.replace(/ /g, '').length} letters
            {!wonUid && firstLetterHint && (
              <> · Hint after 3 wrong guesses: starts with “{firstLetterHint.toUpperCase()}”</>
            )}
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
          {guesses.map((g, i) => {
            const c = guessCloseness(g.text, word.word);
            return (
              <p key={i} className="panel p-3 text-sm">
                <span className="font-semibold">{g.name}:</span> {g.text}
                <span className="ml-2 text-[var(--ink-dim)]">
                  {c.closeness === 'exact'
                    ? '· Exact!'
                    : c.closeness === 'close'
                      ? `· Close — ${c.reason}`
                      : '· Not close'}
                </span>
              </p>
            );
          })}
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
  const [section, setSection] = useState<'questions' | 'wyr'>('questions');
  const questions = pickQuestions(props.seed);
  const wyrPairs = pickWyr(`${props.seed}|wyr`);
  // Separate state keys per section, so Questions and Would You Rather never collide.
  const answersKey = section === 'wyr' ? 'wyrAnswers' : 'knowAnswers';
  const guessesKey = section === 'wyr' ? 'wyrGuesses' : 'knowGuesses';
  const validationsKey = section === 'wyr' ? 'wyrValidations' : 'knowValidations';
  const answers = (props.state[answersKey] as Record<string, Record<string, string>> | undefined) ?? {};
  const guesses = (props.state[guessesKey] as Record<string, Record<string, string>> | undefined) ?? {};
  const validations = (props.state[validationsKey] as
    | Record<string, Record<string, KnowValidation>>
    | undefined) ?? {};
  // Unified items: questions are free text, WYR pairs are an A/B choice.
  // Stored values are the answer text for questions, 'A' | 'B' for WYR.
  const items =
    section === 'questions'
      ? questions.map((q) => ({
          id: q.id,
          prompt: q.text,
          chip: KNOW_TAG_LABEL[q.tag] as string | undefined,
          options: undefined as [string, string] | undefined,
        }))
      : wyrPairs.map((w) => ({
          id: w.id,
          prompt: 'Would you rather…',
          chip: undefined as string | undefined,
          options: [w.optionA, w.optionB] as [string, string],
        }));
  const itemIds = items.map((i) => i.id);
  const uids = props.players.length >= 2 ? props.players.map((p) => p.uid) : [props.me.uid, '__waiting__'];
  const phase = knowMePhase(answers, guesses, uids, items.length, validations, itemIds);
  const otherUid = guestUid(props.players, props.me.uid);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const myAnswers = answers[props.me.uid] ?? {};
  const partnerAnswers = otherUid ? (answers[otherUid] ?? {}) : {};
  const myGuesses = guesses[props.me.uid] ?? {};
  const partnerGuesses = otherUid ? (guesses[otherUid] ?? {}) : {};
  const myValidations = validations[props.me.uid] ?? {};
  const partnerValidations = otherUid ? (validations[otherUid] ?? {}) : {};
  // Validations are keyed by answer-owner: validations[partner] are the
  // partner's verdicts on MY guesses (my score), validations[me] are my
  // verdicts on the partner's guesses (their score).
  const myScore = otherUid ? validatedCorrectCount(validations, otherUid) : 0;
  const partnerScore = validatedCorrectCount(validations, props.me.uid);
  const answeredCount = (m: Record<string, string>) =>
    Object.values(m).filter((v) => (v ?? '').trim() !== '').length;

  const saveAnswers = () => {
    props.update({ [answersKey]: { ...answers, [props.me.uid]: draft } }, true);
  };

  const saveGuesses = () => {
    props.update({ [guessesKey]: { ...guesses, [props.me.uid]: draft } }, true);
  };

  /** Mark the partner's guess about MY answer — owner-only, once per question. */
  const validate = (qid: string, verdict: KnowValidation) => {
    if (props.paused || myValidations[qid]) return;
    props.update(
      { [validationsKey]: { ...validations, [props.me.uid]: { ...myValidations, [qid]: verdict } } },
      true,
    );
  };

  /** Display text for a stored value (option text for WYR, raw text for questions). */
  const display = (item: (typeof items)[number], value: string | undefined) => {
    if (value === undefined) return '';
    if (!item.options) return value;
    return value === 'A' ? item.options[0] : item.options[1];
  };

  // Draft follows the current section + phase's fields.
  const draftFor = phase === 'answering' ? myAnswers : myGuesses;
  const draftKey = `${section}|${phase}|${Object.keys(draftFor).length}`;
  const [seenKey, setSeenKey] = useState(draftKey);
  if (seenKey !== draftKey) {
    setSeenKey(draftKey);
    setDraft(draftFor);
  }

  const allFilled = (m: Record<string, string>) =>
    items.every((it) => (m[it.id] ?? '').trim() !== '');

  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        Six questions, three moods. Answer privately, guess each other’s, reveal together —
        then each of you marks the guesses about your own answers Correct or Incorrect.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Know Me sections">
        {(['questions', 'wyr'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            className={`chip ${section === s ? '!bg-[var(--accent)] !text-[var(--accent-ink)]' : ''}`}
            onClick={() => setSection(s)}
          >
            {s === 'questions' ? 'Questions' : 'Would You Rather'}
          </button>
        ))}
      </div>

      {phase === 'answering' && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">
            {section === 'questions' ? 'First, about you' : 'First, your picks'}
          </h2>
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <span className="font-semibold">{item.prompt}</span>
              {item.chip && <span className="chip ml-2">{item.chip}</span>}
              {item.options ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['A', 'B'] as const).map((choice, i) => (
                    <button
                      key={choice}
                      type="button"
                      className={`btn ${draft[item.id] === choice ? 'btn-primary' : ''}`}
                      aria-pressed={draft[item.id] === choice}
                      disabled={props.paused}
                      onClick={() => setDraft({ ...draft, [item.id]: choice })}
                    >
                      {item.options![i]}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="input mt-2 w-full"
                  value={draft[item.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [item.id]: e.target.value })}
                  placeholder="Your answer"
                  disabled={props.paused}
                />
              )}
            </div>
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
              : answeredCount(partnerAnswers) >= items.length
                ? 'Your partner has answered.'
                : `Your partner has answered ${answeredCount(partnerAnswers)} of ${items.length}. Their answers stay hidden until the reveal.`}
          </p>
        </section>
      )}

      {phase === 'guessing' && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">Now guess each other’s answers</h2>
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <span className="font-semibold">{item.prompt}</span>
              <span className="mt-1 block text-sm text-[var(--ink-dim)]">
                You answered: {display(item, myAnswers[item.id])}
              </span>
              {item.options ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['A', 'B'] as const).map((choice, i) => (
                    <button
                      key={choice}
                      type="button"
                      className={`btn ${draft[item.id] === choice ? 'btn-primary' : ''}`}
                      aria-pressed={draft[item.id] === choice}
                      disabled={props.paused}
                      onClick={() => setDraft({ ...draft, [item.id]: choice })}
                    >
                      {item.options![i]}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="input mt-2 w-full"
                  value={draft[item.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [item.id]: e.target.value })}
                  placeholder={`${props.other?.name ?? 'Your partner'} would say…`}
                  disabled={props.paused}
                />
              )}
            </div>
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
            {answeredCount(partnerGuesses) >= items.length
              ? 'Your partner has guessed.'
              : `Your partner has guessed ${answeredCount(partnerGuesses)} of ${items.length}.`}
          </p>
        </section>
      )}

      {(phase === 'validating' || phase === 'reveal') && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">The reveal — no score yet</h2>
          <p className="text-sm text-[var(--ink-dim)]">
            Answers and guesses are out in the open, but the app has not judged them. Mark
            each guess about <em>your</em> answers Correct or Incorrect — only you can mark
            those, one tap each. The score appears once you have both marked everything.
          </p>
          {items.map((item) => {
            const myVerdict = myValidations[item.id];
            const partnerVerdict = partnerValidations[item.id];
            return (
              <div key={item.id} className="card p-4">
                <p className="font-semibold">{item.prompt}</p>
                <p className="mt-1 text-sm">You: {display(item, myAnswers[item.id])}</p>
                <p className="text-sm">
                  {props.other?.name ?? 'Partner'}: {display(item, partnerAnswers[item.id])}
                </p>
                <p className="text-sm">
                  You guessed: {display(item, myGuesses[item.id])}
                  {partnerVerdict && (
                    <>
                      {' — '}Partner marked your guess:{' '}
                      <span className="font-semibold">
                        {partnerVerdict === 'correct' ? 'Correct.' : 'Incorrect.'}
                      </span>
                    </>
                  )}
                </p>
                <p className="text-sm">
                  They guessed: {display(item, partnerGuesses[item.id])}
                </p>
                {myVerdict ? (
                  <p className="mt-2 text-sm">
                    You marked their guess:{' '}
                    <span className="font-semibold">
                      {myVerdict === 'correct' ? 'Correct.' : 'Incorrect.'}
                    </span>
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-sm">Was their guess about you right?</span>
                    <button
                      type="button"
                      className="btn"
                      disabled={props.paused}
                      onClick={() => validate(item.id, 'correct')}
                    >
                      Correct
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={props.paused}
                      onClick={() => validate(item.id, 'incorrect')}
                    >
                      Incorrect
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {phase === 'done' && (
        <section className="mt-3 space-y-3">
          <h2 className="text-lg font-bold">
            Validated score — You {myScore} of {items.length} ·{' '}
            {props.other?.name ?? 'Partner'} {partnerScore} of {items.length}
          </h2>
          <p className="text-sm text-[var(--ink-dim)]">
            Each score is the guesses the other partner marked Correct — nobody scored
            their own guesses.
          </p>
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <p className="font-semibold">{item.prompt}</p>
              <p className="mt-1 text-sm">You: {display(item, myAnswers[item.id])}</p>
              <p className="text-sm">
                {props.other?.name ?? 'Partner'}: {display(item, partnerAnswers[item.id])}
              </p>
              <p className="text-sm">
                You guessed: {display(item, myGuesses[item.id])} — Partner marked it:{' '}
                <span className="font-semibold">
                  {partnerValidations[item.id] === 'correct' ? 'Correct.' : 'Incorrect.'}
                </span>
              </p>
              <p className="text-sm">
                They guessed: {display(item, partnerGuesses[item.id])} — You marked it:{' '}
                <span className="font-semibold">
                  {myValidations[item.id] === 'correct' ? 'Correct.' : 'Incorrect.'}
                </span>
              </p>
            </div>
          ))}
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
