'use client';

/**
 * Race views for the Phase 6 quick games that are races: Checkbox
 * Race, The Bridge, Jinx, Speed Spot-the-Emoji, Don't Press Purple,
 * Uno Slap. Each view owns its play state and reports progress; the
 * solo page turns a finish into stars, the room wrapper turns progress
 * into the shared race (first to 100% wins the round — except Jinx,
 * where both lists are compared at reveal; see JinxView).
 *
 * Common props:
 * - mode 'solo': a bot races alongside (a pace, never a claimed solver).
 * - mode 'versus': onProgress reports the player's fraction; the room
 *   wrapper declares the winner. No result panel is shown in versus.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProgressBars } from '@/components/together/VersusViews';
import {
  checkboxBotDelayMs,
  checkboxFinished,
  checkboxProgress,
  currentCall,
  generateCheckbox,
} from '@/lib/quickgames/checkbox';
import {
  generateJinx,
  isValidJinxEntry,
  jinxBotList,
  jinxScore,
  jinxShared,
} from '@/lib/quickgames/jinx';
import {
  generateSpot,
  spotBotDelayMs,
  spotProgress,
} from '@/lib/quickgames/spotEmoji';
import {
  generatePurple,
  purpleBotAccuracy,
  purpleProgress,
  purpleScorePrompt,
} from '@/lib/quickgames/purple';
import {
  UNO_SLAP_COLOUR_STYLE,
  applySlap,
  generateUnoSlap,
  isSlapMatch,
  reshuffleUnoSlapDeck,
  restartedUnoSlapDeck,
  spokenNumber,
  unoSlapBotDelayMs,
  unoSlapBotErrorRate,
  unoSlapDeckExhausted,
  unoSlapProgress,
  type UnoSlapCard,
} from '@/lib/quickgames/unoSlap';
import { rngFromSeed } from '@/lib/generators/rng';

export interface RaceViewProps {
  seed: string;
  level: number;
  mode: 'solo' | 'versus';
  opponentPct?: number;
  opponentName?: string;
  disabled?: boolean;
  onProgress?: (pct: number) => void;
  /** Solo only: the player finished (true = won, false = bot won). */
  onFinish?: (won: boolean) => void;
  /** Jinx versus only: the player's submitted word list. */
  onSubmitList?: (words: string[]) => void;
}

function RaceBars({
  mode,
  mine,
  bot,
  opponentPct,
  opponentName,
}: {
  mode: 'solo' | 'versus';
  mine: number;
  bot?: number;
  opponentPct?: number;
  opponentName?: string;
}) {
  if (mode === 'versus') {
    return (
      <ProgressBars
        rows={[
          { name: 'You', pct: mine, isMe: true },
          { name: opponentName ?? 'Partner', pct: opponentPct ?? 0, isMe: false },
        ]}
      />
    );
  }
  if (bot === undefined) return null;
  return (
    <ProgressBars
      rows={[
        { name: 'You', pct: mine, isMe: true },
        { name: 'Bot', pct: bot, isMe: false },
      ]}
    />
  );
}

/** Run `fn` once when `done` flips true. */
function useOnce(done: boolean, fn: () => void) {
  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      fn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
}

// ---------------------------------------------------------- Checkbox Race ----

export function CheckboxRaceView(props: RaceViewProps) {
  const game = useMemo(
    () => generateCheckbox(props.seed, props.level),
    [props.seed, props.level],
  );
  const [found, setFound] = useState<number[]>([]);
  const [botFound, setBotFound] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const finished = checkboxFinished(game, found);
  const botFinished = botFound >= game.target;

  useEffect(() => {
    if (props.mode !== 'solo' || finished || botFinished || props.disabled) return;
    const t = setTimeout(
      () => setBotFound((n) => n + 1),
      checkboxBotDelayMs(props.level),
    );
    return () => clearTimeout(t);
  }, [botFound, finished, props.mode, props.level, props.disabled]);

  useOnce(finished, () => {
    props.onProgress?.(1);
    if (props.mode === 'solo') props.onFinish?.(true);
  });
  useOnce(botFinished && props.mode === 'solo', () => props.onFinish?.(false));

  const call = currentCall(game, found);
  const mine = checkboxProgress(game, found);
  const botPct = Math.min(1, botFound / game.target);

  return (
    <div>
      <RaceBars
        mode={props.mode}
        mine={mine}
        bot={props.mode === 'solo' ? botPct : undefined}
        opponentPct={props.opponentPct}
        opponentName={props.opponentName}
      />
      <section className="card mt-4 p-4">
        <p className="text-sm text-[var(--ink-dim)]">
          Find the called number in the cloud. First to {game.target} boxes wins.
        </p>
        <p className="mt-2 font-display text-2xl font-bold" aria-live="polite">
          {call === null ? 'All boxes filled!' : `Called: ${call}`}
        </p>
        {msg && <p className="mt-1 text-sm">{msg}</p>}
        <div className="mt-3 grid grid-cols-10 gap-1">
          {game.grid.map((n) => {
            const isFound = found.includes(n);
            const isCall = n === call;
            return (
              <button
                key={n}
                type="button"
                className="flex aspect-square items-center justify-center rounded-md border text-xs font-bold sm:text-sm"
                style={{
                  borderColor: 'var(--line)',
                  background: isFound ? 'var(--accent)' : isCall ? 'var(--surface)' : 'transparent',
                  color: isFound ? 'white' : 'inherit',
                  outline: isCall ? '2px solid var(--accent)' : undefined,
                }}
                disabled={props.disabled || finished || isFound}
                onClick={() => {
                  if (n === call) {
                    const next = [...found, n];
                    setFound(next);
                    setMsg(null);
                    props.onProgress?.(checkboxProgress(game, next));
                  } else {
                    setMsg('That is not the called number — keep hunting.');
                  }
                }}
                aria-label={`Number ${n}${isFound ? ', found' : ''}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function JinxView(props: RaceViewProps) {
  const game = useMemo(
    () => generateJinx(props.seed, props.level),
    [props.seed, props.level],
  );
  const [words, setWords] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const botList = useMemo(
    () => (props.mode === 'solo' ? jinxBotList(game, props.level, props.seed) : []),
    [game, props.mode, props.level, props.seed],
  );
  const mine = submitted ? 1 : 0;

  const submit = () => {
    if (submitted) return;
    setSubmitted(true);
    if (props.mode === 'solo') {
      const myScore = jinxScore(words, botList);
      const botScore = jinxScore(botList, words);
      props.onFinish?.(myScore >= botScore);
    } else {
      // Versus Jinx never writes progress: both lists are compared at
      // reveal, so the room's first-to-100% winner effect must not fire.
      props.onSubmitList?.(words);
    }
  };

  const shared = submitted && props.mode === 'solo' ? jinxShared(words, botList) : [];
  const myScore = submitted && props.mode === 'solo' ? jinxScore(words, botList) : 0;
  const botScore = submitted && props.mode === 'solo' ? jinxScore(botList, words) : 0;

  return (
    <div>
      <RaceBars
        mode={props.mode}
        mine={mine}
        bot={props.mode === 'solo' ? (submitted ? 1 : 0) : undefined}
        opponentPct={props.opponentPct}
        opponentName={props.opponentName}
      />
      <section className="card mt-4 p-4">
        <p className="text-sm text-[var(--ink-dim)]">
          The same nine letters for both of you. Find every word hiding in them, then
          press Done — any word you both found is a JINX and scores for nobody.
        </p>
        <p className="mt-3 flex flex-wrap gap-1" aria-label="Letter bag">
          {game.letters.split('').map((ch, i) => (
            <span
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-lg border text-xl font-bold"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            >
              {ch}
            </span>
          ))}
        </p>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
        {!submitted ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const w = draft.trim().toUpperCase();
              if (!w) return;
              if (isValidJinxEntry(w, game, words)) {
                setWords([...words, w]);
                setDraft('');
                setMsg(null);
              } else {
                setMsg('Not this time — it must be a real word built from these letters, and new.');
              }
            }}
          >
            <input
              className="input flex-1 uppercase"
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              placeholder="A word from the letters…"
              maxLength={9}
              disabled={props.disabled}
              aria-label="A word from the letters"
            />
            <button type="submit" className="btn" disabled={props.disabled}>
              Add
            </button>
          </form>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1">
          {words.map((w) => (
            <span
              key={w}
              className="rounded-full border px-2 py-1 text-sm font-semibold"
              style={{
                borderColor: 'var(--line)',
                opacity: shared.includes(w) ? 0.5 : 1,
                textDecoration: shared.includes(w) ? 'line-through' : undefined,
              }}
            >
              {w}
            </span>
          ))}
          {words.length === 0 && (
            <span className="text-sm text-[var(--ink-dim)]">No words yet.</span>
          )}
        </div>
        {!submitted ? (
          <button
            type="button"
            className="btn btn-primary mt-3"
            disabled={props.disabled || words.length === 0}
            onClick={submit}
          >
            Done — flip the lists
          </button>
        ) : props.mode === 'solo' ? (
          <div className="mt-3 text-sm">
            <p>
              You scored <strong>{myScore}</strong>, the bot scored{' '}
              <strong>{botScore}</strong>.
            </p>
            {shared.length > 0 && (
              <p className="mt-1 text-[var(--ink-dim)]">
                Jinxed (both found, no points): {shared.join(', ')}
              </p>
            )}
            <p className="mt-1 text-[var(--ink-dim)]">
              The bot found: {botList.join(', ') || 'nothing'}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            List submitted — waiting for your partner's list to flip them together.
          </p>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------- Speed Spot-the-Emoji ----

export function SpotEmojiView(props: RaceViewProps) {
  const game = useMemo(
    () => generateSpot(props.seed, props.level),
    [props.seed, props.level],
  );
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [botCorrect, setBotCorrect] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  // Twin confirmation: on a correct tap the twin stays highlighted on
  // BOTH cards for a beat before the next round deals, so the win is
  // shown by ring + background + the "Twin!" text, never colour alone.
  const [justFound, setJustFound] = useState(false);
  // Wrong-tap feedback: brief shake on the tapped cell only. The round
  // and progress are untouched — a wrong tap never loses the round.
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const twinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Display-only timer: elapsed time is shown, never used to fail a
  // player. It freezes once the game is decided.
  const startedAt = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const finished = correct >= game.target;
  const botFinished = botCorrect >= game.target;
  const card = game.cards[Math.min(round, game.cards.length - 1)];

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsedMs(0);
  }, [props.seed, props.level]);

  useEffect(() => {
    if (finished || botFinished) return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 500);
    return () => clearInterval(t);
  }, [finished, botFinished, props.seed, props.level]);

  useEffect(
    () => () => {
      if (twinTimer.current) clearTimeout(twinTimer.current);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (props.mode !== 'solo' || finished || botFinished || props.disabled) return;
    // Seeded jitter per bot round: human pacing, never instant at low
    // levels (see spotBotDelayMs — ±15% of the level base delay).
    const t = setTimeout(
      () => setBotCorrect((n) => n + 1),
      spotBotDelayMs(props.level, props.seed, botCorrect),
    );
    return () => clearTimeout(t);
  }, [botCorrect, finished, props.mode, props.level, props.disabled, props.seed, botFinished]);

  useOnce(finished, () => {
    props.onProgress?.(1);
    if (props.mode === 'solo') props.onFinish?.(true);
  });
  useOnce(botFinished && props.mode === 'solo', () => props.onFinish?.(false));

  const mine = spotProgress(game, correct);
  const botPct = Math.min(1, botCorrect / game.target);
  // Larger, thumb-sized cells: fewer columns than the old 6-across row,
  // so each cell is ~60px+ on mobile. Columns stay literal class names
  // so Tailwind picks them up.
  const cols = game.cardSize <= 6 ? 'grid-cols-3' : game.cardSize <= 8 ? 'grid-cols-4' : 'grid-cols-3';
  const elapsed = `${Math.floor(elapsedMs / 60000)}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div>
      <style>{`@keyframes spot-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } .spot-shake { animation: spot-shake 0.3s ease; }`}</style>
      <RaceBars
        mode={props.mode}
        mine={mine}
        bot={props.mode === 'solo' ? botPct : undefined}
        opponentPct={props.opponentPct}
        opponentName={props.opponentName}
      />
      <section className="card mt-4 p-4">
        <p className="text-sm text-[var(--ink-dim)]">
          Two cards, {game.cardSize} pictures each, exactly one shared. Tap the twin on your card —
          first to {game.target} wins.
        </p>
        <p className="mt-1 text-sm text-[var(--ink-dim)]" aria-live="off">
          Round {Math.min(round + 1, game.target)} of {game.target} · Time {elapsed} · No time limit — take as long as you need.
        </p>
        <p className="mt-1 text-sm font-semibold">
          {props.mode === 'solo'
            ? `You: ${correct} found · Cosy Bot: ${botCorrect} found · First to ${game.target} wins`
            : `You: ${correct} found · First to ${game.target} wins`}
        </p>
        {msg && (
          <p className="mt-2 text-sm font-semibold" role="status" aria-live="polite">
            {msg}
          </p>
        )}
        {card && !finished && (
          <>
            <p className="mt-3 text-sm font-semibold">Your card</p>
            <div className={`mt-1 grid ${cols} gap-2`}>
              {card.mine.map((e, i) => {
                const isTwin = justFound && e === card.shared;
                const isWrong = wrongIdx === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`relative flex aspect-square min-h-[60px] items-center justify-center rounded-xl border text-4xl sm:min-h-[68px] sm:text-5xl ${isWrong ? 'spot-shake' : ''} ${isTwin ? 'scale-105' : ''}`}
                    style={{
                      borderColor: 'var(--line)',
                      background: 'var(--surface)',
                      boxShadow: isTwin
                        ? '0 0 0 3px var(--good), 0 0 0 6px var(--surface)'
                        : isWrong
                          ? '0 0 0 3px var(--bad)'
                          : undefined,
                    }}
                    disabled={props.disabled || justFound}
                    onClick={() => {
                      if (justFound) return;
                      if (e === card.shared) {
                        setJustFound(true);
                        setWrongIdx(null);
                        setMsg('✓ Twin! That picture is on both cards.');
                        twinTimer.current = setTimeout(() => {
                          const next = correct + 1;
                          setCorrect(next);
                          setJustFound(false);
                          setMsg(null);
                          setRound((r) => r + 1);
                          props.onProgress?.(spotProgress(game, next));
                        }, 800);
                      } else {
                        setMistakes((m) => m + 1);
                        setWrongIdx(i);
                        setMsg('✗ Not the twin — look again. No harm, just keep looking.');
                        if (wrongTimer.current) clearTimeout(wrongTimer.current);
                        wrongTimer.current = setTimeout(() => setWrongIdx(null), 400);
                      }
                    }}
                    aria-label={`Picture ${e}${isTwin ? ' — the twin' : ''}`}
                  >
                    {e}
                    {isTwin && (
                      <span className="absolute right-1 top-1 text-base font-bold" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm font-semibold">The other card</p>
            <div className={`mt-1 grid ${cols} gap-2 opacity-80`}>
              {card.theirs.map((e, i) => {
                const isTwin = justFound && e === card.shared;
                return (
                  <span
                    key={i}
                    className={`relative flex aspect-square min-h-[52px] items-center justify-center rounded-xl border text-3xl sm:text-4xl ${isTwin ? 'scale-105' : ''}`}
                    style={{
                      borderColor: 'var(--line)',
                      boxShadow: isTwin ? '0 0 0 3px var(--good)' : undefined,
                    }}
                  >
                    {e}
                    {isTwin && (
                      <span className="absolute right-1 top-1 text-sm font-bold" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </>
        )}
        {mistakes > 0 && (
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            {mistakes} wrong {mistakes === 1 ? 'tap' : 'taps'} — no harm, just slower.
          </p>
        )}
      </section>
    </div>
  );
}

// --------------------------------------------------------- Don't Press Purple ----

export function PurpleView(props: RaceViewProps) {
  const game = useMemo(
    () => generatePurple(props.seed, props.level),
    [props.seed, props.level],
  );
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [botScore, setBotScore] = useState(0);
  const [botMistakes, setBotMistakes] = useState(0);
  const finished = idx >= game.prompts.length;
  const prompt = game.prompts[idx];

  // Advance prompts on their beat; a missed teal counts as a mistake.
  useEffect(() => {
    if (finished || props.disabled) return;
    const t = setTimeout(() => {
      const p = game.prompts[idx];
      if (p === 'teal' && !tapped) {
        setMistakes((m) => m + 1);
      }
      if (props.mode === 'solo' && p) {
        const acc = purpleBotAccuracy(props.level);
        const ok = Math.random() < acc;
        if (p === 'teal') {
          if (ok) setBotScore((s) => s + 1);
          else setBotMistakes((m) => m + 1);
        } else if (!ok) {
          setBotMistakes((m) => m + 1);
        }
      }
      setIdx((i) => i + 1);
      setTapped(false);
    }, game.beatMs);
    return () => clearTimeout(t);
  }, [idx, tapped, finished, props.disabled, game, props.mode, props.level]);

  const mine = purpleProgress(game, idx);
  useEffect(() => {
    if (props.mode === 'versus') props.onProgress?.(mine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine]);

  useOnce(finished && props.mode === 'solo', () =>
    props.onFinish?.(score > botScore || (score === botScore && mistakes <= botMistakes)),
  );
  useOnce(finished && props.mode === 'versus', () => props.onProgress?.(1));

  return (
    <div>
      {props.mode === 'versus' && (
        <RaceBars
          mode={props.mode}
          mine={mine}
          opponentPct={props.opponentPct}
          opponentName={props.opponentName}
        />
      )}
      <section className="card mt-4 p-4 text-center">
        <p className="text-sm text-[var(--ink-dim)]">
          Tap when it lights up teal. When it flashes violet, keep your hands still.
          {` ${game.prompts.length} prompts.`}
        </p>
        {!finished && prompt ? (
          <>
            <div
              className="mx-auto mt-4 h-32 w-32 rounded-full border-4"
              style={{
                borderColor: 'var(--line)',
                background: prompt === 'teal' ? '#2dd4bf' : '#8b5cf6',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              }}
              aria-label={prompt === 'teal' ? 'Teal prompt — tap' : 'Violet prompt — hold still'}
            />
            <button
              type="button"
              className="btn btn-primary mt-4"
              disabled={props.disabled || tapped}
              onClick={() => {
                setTapped(true);
                const r = purpleScorePrompt(prompt, true, score, mistakes);
                setScore(r.score);
                setMistakes(r.mistakes);
              }}
            >
              Tap!
            </button>
            <p className="mt-2 text-sm">
              Score {score} · {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
              {props.mode === 'solo' && ` · Bot ${botScore} (mistakes ${botMistakes})`}
            </p>
          </>
        ) : (
          <p className="mt-4 font-semibold">
            Round done — score {score}, mistakes {mistakes}
            {props.mode === 'solo' && `, bot ${botScore} (mistakes ${botMistakes})`}.
          </p>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------- Uno Slap ----

/**
 * An original code-drawn UNO-style card face: coloured background, white
 * tilted oval, centre number in the card colour, corner numbers.
 * No copied UNO artwork or logo. A null card renders the face-down back.
 */
function UnoCard({ card }: { card: UnoSlapCard | null }) {
  if (card === null) {
    return (
      <div
        className="relative mx-auto h-40 w-28 overflow-hidden rounded-2xl shadow-lg"
        style={{ background: '#111' }}
        aria-label="No card yet"
      >
        <div
          className="absolute left-1/2 top-1/2 flex h-28 w-20 items-center justify-center rounded-[50%]"
          style={{ background: '#fff', transform: 'translate(-50%, -50%) rotate(-24deg)' }}
        >
          <span className="text-3xl font-bold" style={{ transform: 'rotate(24deg)', color: '#111' }}>
            ?
          </span>
        </div>
        <span className="absolute left-2 top-1.5 text-base font-bold text-white">?</span>
        <span className="absolute bottom-1.5 right-2 rotate-180 text-base font-bold text-white">?</span>
      </div>
    );
  }
  const style = UNO_SLAP_COLOUR_STYLE[card.colour];
  return (
    <div
      className="relative mx-auto h-40 w-28 overflow-hidden rounded-2xl shadow-lg"
      style={{ background: style.bg }}
      aria-label={`${card.colour} ${card.value} card`}
    >
      <div
        className="absolute left-1/2 top-1/2 flex h-28 w-20 items-center justify-center rounded-[50%]"
        style={{ background: '#fff', transform: 'translate(-50%, -50%) rotate(-24deg)' }}
      >
        <span
          className="text-5xl font-black italic"
          style={{ transform: 'rotate(24deg)', color: style.centre }}
        >
          {card.value}
        </span>
      </div>
      <span className="absolute left-2 top-1.5 text-base font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
        {card.value}
      </span>
      <span className="absolute bottom-1.5 right-2 rotate-180 text-base font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
        {card.value}
      </span>
    </div>
  );
}

export function UnoSlapView(props: RaceViewProps) {
  const game = useMemo(
    () => generateUnoSlap(props.seed, props.level),
    [props.seed, props.level],
  );
  // The pile being played: starts as the dealt deck, then changes on a
  // restart (fresh deck) or a reshuffle (same cards, new order).
  const [deck, setDeck] = useState(game.deck);
  const [round, setRound] = useState(0);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [laid, setLaid] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [botMistakes, setBotMistakes] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const finished = score >= game.target;
  const botFinished = botScore >= game.target;
  const top = laid > 0 ? deck[laid - 1]! : null;
  // The nth card laid (1-indexed) is spoken as ((n - 1) % 10) + 1.
  const spoken = spokenNumber(Math.max(0, laid - 1));
  // A match is on the card's VALUE only — its colour never matters.
  const match = top !== null && isSlapMatch(top.value, spoken);

  // Bot: slaps matches after a delay, sometimes slaps wrongly.
  useEffect(() => {
    if (props.mode !== 'solo' || finished || botFinished || props.disabled) return;
    if (laid === 0) return;
    const t = setTimeout(
      () => {
        const isMatch = isSlapMatch(deck[laid - 1]!.value, spokenNumber(laid - 1));
        if (isMatch) {
          setBotScore((s) => s + 1);
        } else if (Math.random() < unoSlapBotErrorRate(props.level)) {
          setBotScore((s) => Math.max(0, s - 1));
          setBotMistakes((m) => m + 1);
        }
      },
      unoSlapBotDelayMs(props.level),
    );
    return () => clearTimeout(t);
  }, [laid, finished, botFinished, props.mode, props.level, props.disabled, deck]);

  useOnce(finished, () => {
    props.onProgress?.(1);
    if (props.mode === 'solo') props.onFinish?.(true);
  });
  useOnce(botFinished && props.mode === 'solo', () => props.onFinish?.(false));

  const mine = unoSlapProgress(game, score);
  const botPct = Math.min(1, botScore / game.target);

  return (
    <div>
      <RaceBars
        mode={props.mode}
        mine={mine}
        bot={props.mode === 'solo' ? botPct : undefined}
        opponentPct={props.opponentPct}
        opponentName={props.opponentName}
      />
      <section className="card mt-4 p-4 text-center">
        <p className="text-sm text-[var(--ink-dim)]">
          Lay cards counting one to ten out loud. The instant a card matches the spoken
          number, slap — first to {game.target} wins. A wrong slap costs a point.
        </p>
        <p className="mt-3 text-sm">
          Spoken: <strong className="text-xl">{spoken}</strong> · Cards laid: {laid} of{' '}
          {deck.length}
          {top !== null && (
            <>
              {' · '}Top card: {top.colour} {top.value}
            </>
          )}
        </p>
        <div className="mt-3">
          <UnoCard card={top} />
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
        {(finished || botFinished) && props.mode === 'solo' && (
          <p className="mt-2 text-sm">
            Round over — use “Play again” / “Try again” below for a fresh, newly
            shuffled round.
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn"
            disabled={props.disabled || finished || botFinished}
            onClick={() => {
              // Auto-reshuffle: a spent pile never dead-ends the round.
              // The whole pile is shuffled into a new order and the
              // first card of the new pile is laid; scores are kept.
              if (unoSlapDeckExhausted(laid, deck.length)) {
                setDeck(
                  reshuffleUnoSlapDeck(
                    deck,
                    rngFromSeed(`${props.seed}|auto-${reshuffleCount}`),
                  ),
                );
                setReshuffleCount((c) => c + 1);
                setLaid(1);
                setMsg('Deck ran out — reshuffled, counting starts again.');
              } else {
                setLaid((n) => n + 1);
              }
            }}
          >
            Lay a card
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={props.disabled || finished || botFinished || top === null}
            onClick={() => {
              const r = applySlap(match, { score, mistakes });
              setScore(r.score);
              setMistakes(r.mistakes);
              setMsg(match ? 'Slap! Yours.' : 'No match — that slap costs a point.');
              if (match) props.onProgress?.(unoSlapProgress(game, r.score));
            }}
          >
            Slap!
          </button>
          <button
            type="button"
            className="btn"
            disabled={props.disabled || finished || botFinished}
            onClick={() => {
              // Manual reshuffle: same cards, new order, counting
              // restarts — scores (yours and the bot's) are kept.
              setDeck(
                reshuffleUnoSlapDeck(
                  deck,
                  rngFromSeed(`${props.seed}|reshuffle-${reshuffleCount}`),
                ),
              );
              setReshuffleCount((c) => c + 1);
              setLaid(0);
              setMsg('Reshuffled — scores kept, counting starts again.');
            }}
          >
            Reshuffle
          </button>
          <button
            type="button"
            className="btn"
            disabled={props.disabled || finished || botFinished}
            onClick={() => {
              // Restart: a fresh round — new deck order, all scores reset.
              setDeck(restartedUnoSlapDeck(props.seed, props.level, round + 1));
              setRound((r) => r + 1);
              setLaid(0);
              setScore(0);
              setMistakes(0);
              setBotScore(0);
              setBotMistakes(0);
              setMsg('Fresh round — newly shuffled deck.');
            }}
          >
            Restart
          </button>
        </div>
        <p className="mt-2 text-sm">
          Score {score} · {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
          {props.mode === 'solo' && ` · Bot ${botScore} (mistakes ${botMistakes})`}
        </p>
      </section>
    </div>
  );
}
