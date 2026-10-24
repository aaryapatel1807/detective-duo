'use client';

/**
 * Together play screen: renders the right game view from the session
 * row (game + mode + seed + level), so a refresh restores the game
 * exactly. Versus views track each player's own marks and a friendly
 * progress bar; co-op views share one state. Phase 6 adds the ten
 * quick games, the private tally in the three original versus modes,
 * the call panel slot, and the booth auto-snap banner.
 */
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe } from '@/components/together/useMe';
import { useRoom } from '@/components/together/useRoom';
import RoomShell from '@/components/together/RoomShell';
import { cycleMark, GridBoard, ProgressBars, VersusCipherView, VersusNonogramView } from '@/components/together/VersusViews';
import { CaseCoopView, EscapeCoopView } from '@/components/together/CoopViews';
import {
  DotsBoxesDuo,
  KnowMeDuo,
  LanternDuo,
  LiarDuo,
  SafeCrackerVersus,
  SketchDuo,
  TallyPanel,
} from '@/components/together/DuoCornerViews';
import CallPanel from '@/components/together/CallPanel';
import {
  BridgeView,
  CheckboxRaceView,
  JinxView,
  PurpleView,
  SpotEmojiView,
  UnoSlapView,
} from '@/components/quickgames/RaceViews';
import SnakeView from '@/components/quickgames/SnakeView';
import { QuoridorView, VibeBoard } from '@/components/quickgames/BoardViews';
import { generatePuzzle as genGrid } from '@/lib/generators/logicGrid';
import { generatePuzzle as genCipher } from '@/lib/generators/cipherDesk';
import { generatePuzzle as genNonogram } from '@/lib/generators/nonogram';
import { generateRoom } from '@/lib/generators/escapeRoom';
import { ALL_CASES } from '@/lib/cases/bank';
import { splitCase, splittableCases } from '@/lib/together/split';
import { cipherProgress, logicGridProgress, nonogramProgress } from '@/lib/together/versus';
import { tallyAfter, type RoomTally } from '@/lib/together/duoCorner';
import { hashSeed } from '@/lib/generators/rng';
import {
  applyQuoridorMove,
  initialQuoridor,
  quoridorWinner,
  type QuoridorMove,
  type QuoridorState,
} from '@/lib/quickgames/quoridor';
import { snakeTargetForLevel } from '@/lib/quickgames/snake';
import {
  generateVibe,
  VIBE_QUESTIONS,
  vibeEliminate,
  vibeRemaining,
} from '@/lib/quickgames/vibeCheck';
import { jinxScore } from '@/lib/quickgames/jinx';
import type { ChatMsg } from '@/lib/together/types';
import { saveSession } from '@/lib/together/session';

const GAME_NAMES: Record<string, string> = {
  'case-files': 'Case Files',
  'escape-rooms': 'Escape Rooms',
  'logic-grids': 'Logic Grids',
  'cipher-desk': 'Cipher Desk',
  'nonograms': 'Nonograms',
  'dots-boxes': 'Dots and Boxes',
  'safe-cracker': 'Safe Cracker',
  'lantern-map': 'Lantern and Map',
  'sketch-clue': 'Sketch the Clue',
  'spot-liar': 'Spot the Liar',
  'know-me': 'How Well Do You Know Me',
  'quoridor': 'Quoridor',
  'checkbox-race': 'Checkbox Race',
  'the-bridge': 'The Bridge',
  'jinx': 'Jinx',
  'spot-emoji': 'Speed Spot-the-Emoji',
  'dont-press-purple': "Don't Press Purple",
  'snake-arena': 'Snake Arena',
  'uno-slap': 'Uno Slap',
  'vibe-check': 'Vibe Check',
};

export default function PlayPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const router = useRouter();
  const me = useMe();
  const {
    session, loaded, members, paused, connected, cursors,
    update, updateSession, sendChat, sendNote, sendCursor,
  } = useRoom(code, me);

  useEffect(() => {
    if (loaded && session && session.status === 'lobby') {
      router.replace(`/together/${code}`);
    }
  }, [loaded, session?.status, code, router]);

  const state = useMemo(() => session?.state ?? {}, [session?.state]);
  const other = useMemo(
    () => (session?.players ?? []).find((p) => p.uid !== me?.uid),
    [session?.players, me?.uid],
  );
  const isHost = (session?.players[0]?.uid ?? '') === me?.uid;

  const gridPuzzle = useMemo(
    () => (session && session.game === 'logic-grids' ? genGrid(session.seed, session.level) : null),
    [session?.game, session?.seed, session?.level],
  );
  const cipherPuzzle = useMemo(
    () => (session && session.game === 'cipher-desk' ? genCipher(session.seed, session.level) : null),
    [session?.game, session?.seed, session?.level],
  );
  const nonogramPuzzle = useMemo(
    () => (session && session.game === 'nonograms' ? genNonogram(session.seed, session.level) : null),
    [session?.game, session?.seed, session?.level],
  );
  const escapeRoom = useMemo(
    () => (session && session.game === 'escape-rooms' ? generateRoom(session.seed, session.level) : null),
    [session?.game, session?.seed, session?.level],
  );
  const coopCase = useMemo(() => {
    if (!session || session.game !== 'case-files' || session.mode !== 'coop') return null;
    const pool = splittableCases(ALL_CASES, session.seed);
    const picked = pool.length > 0
      ? pool[(session.level - 1) % pool.length]
      : ALL_CASES[(session.level - 1) % ALL_CASES.length];
    return { picked, split: splitCase(picked, session.seed) };
  }, [session?.game, session?.mode, session?.seed, session?.level]);

  // Versus win detection (either player's progress hitting 100%).
  // Phase 6: the win also bumps the private room tally (just the two
  // of them — not a leaderboard, not XP, not a rank).
  const myPct = useMemo(() => {
    if (!session || !me || session.mode !== 'versus') return 0;
    const progress = (state.progress ?? {}) as Record<string, number>;
    return progress[me.uid] ?? 0;
  }, [session?.mode, state.progress, me?.uid]);
  useEffect(() => {
    if (session && session.mode === 'versus' && myPct >= 1 && !session.winnerUid && me) {
      update({ tally: tallyAfter(state.tally as RoomTally | undefined, me.uid) }, true);
      updateSession({ winnerUid: me.uid, status: 'finished' });
    }
  }, [myPct, session?.mode, session?.winnerUid, me?.uid, updateSession, update, state.tally]);

  // Phase 6 shared-board room setup + win declaration (host-only, so a
  // win is declared exactly once even though both clients see the board).
  const quickQuoridor = (
    session?.game === 'quoridor' ? (state.quoridor as QuoridorState | undefined) : undefined
  );
  const jinxLists = (
    session?.game === 'jinx' ? ((state.answers ?? {}) as Record<string, string[]>) : {}
  );
  const jinxSubmitted = (
    session?.game === 'jinx' ? ((state.jinxSubmitted ?? {}) as Record<string, boolean>) : {}
  );
  useEffect(() => {
    if (!session || session.game !== 'quoridor' || session.mode !== 'versus') return;
    if (quickQuoridor || !isHost || session.status !== 'playing') return;
    update({ quoridor: initialQuoridor(session.level) });
  }, [session, quickQuoridor, isHost, update]);
  useEffect(() => {
    if (!quickQuoridor || !session || session.winnerUid || !isHost) return;
    const w = quoridorWinner(quickQuoridor);
    if (w === null) return;
    const winner = session.players[w]?.uid;
    if (!winner) return;
    update({ tally: tallyAfter(state.tally as RoomTally | undefined, winner) }, true);
    updateSession({ winnerUid: winner, status: 'finished' });
  }, [quickQuoridor, session, isHost, update, updateSession, state.tally]);
  useEffect(() => {
    if (!session || session.game !== 'vibe-check' || session.mode !== 'versus') return;
    if ((state.vibeTurn as string | undefined) || !isHost || session.status !== 'playing') return;
    update({ vibeTurn: session.players[0]?.uid ?? '', vibeEliminated: {} });
  }, [session, state.vibeTurn, isHost, update]);
  useEffect(() => {
    if (!session || session.game !== 'jinx' || session.mode !== 'versus' || !isHost) return;
    if (session.winnerUid || session.status === 'finished') return;
    const uids = session.players.map((p) => p.uid);
    if (uids.length < 2 || !uids.every((u) => jinxSubmitted[u])) return;
    const [a, b] = uids as [string, string];
    const sa = jinxScore(jinxLists[a] ?? [], jinxLists[b] ?? []);
    const sb = jinxScore(jinxLists[b] ?? [], jinxLists[a] ?? []);
    if (sa === sb) {
      updateSession({ status: 'finished' });
      return;
    }
    const winner = sa > sb ? a : b;
    update({ tally: tallyAfter(state.tally as RoomTally | undefined, winner) }, true);
    updateSession({ winnerUid: winner, status: 'finished' });
  }, [session, jinxLists, jinxSubmitted, isHost, update, updateSession, state.tally]);

  if (!loaded || !me) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Opening the game…</p>
      </main>
    );
  }
  if (!session) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h1 className="mt-6 text-3xl font-bold">No room {code} here</h1>
        <p className="mt-1 text-[var(--ink-dim)]">This room does not exist yet.</p>
        <Link href="/together" className="btn btn-primary mt-4">Back to together</Link>
      </main>
    );
  }
  if (session.status === 'lobby' || !session.game) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Back to the lobby…</p>
      </main>
    );
  }

  const answers = (state.answers ?? {}) as Record<string, Record<string, string>>;
  const progress = (state.progress ?? {}) as Record<string, number>;
  const chat = (state.chat ?? []) as ChatMsg[];
  const notes = (state.notes as string | undefined) ?? '';
  const title = `${GAME_NAMES[session.game] ?? session.game} · ${session.mode === 'versus' ? 'Versus' : 'Co-op'} · Level ${session.level}`;

  const leave = async () => {
    const next = { ...session, players: session.players.filter((p) => p.uid !== me.uid) };
    await saveSession(next);
    router.push('/together');
  };

  const versusBars = (myMarksPct: number) => (
    <ProgressBars
      rows={[
        { name: me.name, pct: myMarksPct, isMe: true },
        { name: other?.name ?? 'Partner', pct: other ? (progress[other.uid] ?? 0) : 0, isMe: false },
      ]}
    />
  );

  const winnerPanel = session.winnerUid ? (
    <section className="card mt-4 p-5 text-center">
      <p className="font-display text-2xl font-bold">
        {session.winnerUid === me.uid
          ? 'You solved it first — lovely round.'
          : `${other?.name ?? 'Your partner'} solved it first — lovely round.`}
      </p>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        No scores, no rematch pressure. Play again whenever you like.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => updateSession({ status: 'lobby', game: '', mode: '', winnerUid: null })}
        >
          Back to the room
        </button>
      </div>
    </section>
  ) : null;

  let body: React.ReactNode = null;

  if (session.mode === 'versus' && gridPuzzle) {
    const myMarks = (answers[me.uid] ?? {}) as Record<string, 'yes' | 'no'>;
    const pct = logicGridProgress(gridPuzzle, myMarks);
    body = (
      <>
        {versusBars(pct)}
        <div className="mt-4">
          <GridBoard
            puzzle={gridPuzzle}
            marks={myMarks}
            disabled={paused || !!session.winnerUid}
            onCycle={(key) => {
              const next = { ...myMarks };
              const cycled = cycleMark(next[key]);
              if (cycled) next[key] = cycled;
              else delete next[key];
              update({
                answers: { ...answers, [me.uid]: next },
                progress: { ...progress, [me.uid]: logicGridProgress(gridPuzzle, next) },
              });
            }}
          />
        </div>
        {winnerPanel}
      </>
    );
  } else if (session.mode === 'versus' && cipherPuzzle) {
    const answer = (answers[me.uid] as unknown as string) ?? '';
    const pct = cipherProgress(cipherPuzzle.plaintext, answer);
    body = (
      <>
        {versusBars(pct)}
        <div className="mt-4">
          <VersusCipherView
            puzzle={cipherPuzzle}
            answer={answer}
            disabled={paused || !!session.winnerUid}
            onAnswer={(a) =>
              update({
                answers: { ...answers, [me.uid]: a },
                progress: { ...progress, [me.uid]: cipherProgress(cipherPuzzle.plaintext, a) },
              })
            }
          />
        </div>
        {winnerPanel}
      </>
    );
  } else if (session.mode === 'versus' && nonogramPuzzle) {
    const myMarks = (answers[me.uid] ?? {}) as Record<string, 'fill' | 'x'>;
    const pct = nonogramProgress(nonogramPuzzle, myMarks);
    body = (
      <>
        {versusBars(pct)}
        <div className="mt-4">
          <VersusNonogramView
            puzzle={nonogramPuzzle}
            marks={myMarks}
            disabled={paused || !!session.winnerUid}
            onCycle={(key) => {
              const next = { ...myMarks };
              const cur = next[key];
              const cycled = !cur ? 'fill' : cur === 'fill' ? 'x' : undefined;
              if (cycled) next[key] = cycled;
              else delete next[key];
              update({
                answers: { ...answers, [me.uid]: next },
                progress: { ...progress, [me.uid]: nonogramProgress(nonogramPuzzle, next) },
              });
            }}
          />
        </div>
        {winnerPanel}
      </>
    );
  } else if (session.mode === 'coop' && gridPuzzle) {
    const marks = (state.marks ?? {}) as Record<string, 'yes' | 'no'>;
    const struck = (state.struckClues ?? []) as number[];
    body = (
      <GridBoard
        puzzle={gridPuzzle}
        marks={marks}
        struckClues={struck}
        disabled={paused}
        onCycle={(key) => {
          const next = { ...marks };
          const cycled = cycleMark(next[key]);
          if (cycled) next[key] = cycled;
          else delete next[key];
          update({ marks: next });
        }}
        onStrikeClue={(id) =>
          update({ struckClues: struck.includes(id) ? struck.filter((x) => x !== id) : [...struck, id] })
        }
      />
    );
  } else if (session.mode === 'coop' && coopCase) {
    const { picked, split } = coopCase;
    const side = isHost ? split.sideA : split.sideB;
    const pinned = (state.pinned ?? []) as string[];
    const wrongAccused = (state.wrongAccused ?? []) as string[];
    const solved = (state.solved as boolean | undefined) ?? false;
    body = (
      <CaseCoopView
        c={picked}
        side={side}
        partnerName={other?.name ?? 'your partner'}
        pinned={pinned}
        onTogglePin={(id) =>
          update({ pinned: pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id] })
        }
        accused={(state.accused as string | null) ?? null}
        solved={solved}
        solvedByName={
          (state.solvedBy as string | undefined)
            ? session.players.find((p) => p.uid === state.solvedBy)?.name ?? null
            : null
        }
        wrongAccused={wrongAccused}
        mistakes={(state.mistakes as number | undefined) ?? 0}
        revealedSteps={(state.revealedSteps as number | undefined) ?? 0}
        onHint={() =>
          update({ revealedSteps: Math.min(picked.deductionPath.length, ((state.revealedSteps as number | undefined) ?? 0) + 1) })
        }
        onAccuse={(id) => {
          if (id === picked.solution.culpritId) {
            update({ solved: true, solvedBy: me.uid, accused: id }, true);
            updateSession({ status: 'finished' });
          } else if (!wrongAccused.includes(id)) {
            update(
              {
                wrongAccused: [...wrongAccused, id],
                mistakes: ((state.mistakes as number | undefined) ?? 0) + 1,
                accused: id,
              },
              true,
            );
          }
        }}
        disabled={paused || solved}
      />
    );
  } else if (session.mode === 'coop' && escapeRoom) {
    const escapeRole = (state.escapeRole ?? {}) as Record<string, 'room' | 'notebook'>;
    const myRole = escapeRole[me.uid] ?? (isHost ? 'room' : 'notebook');
    const inventory = (state.inventory ?? []) as string[];
    const openedLocks = (state.openedLocks ?? []) as string[];
    const inspected = (state.inspected ?? []) as string[];
    const escaped = (state.escaped as boolean | undefined) ?? false;
    body = (
      <EscapeCoopView
        room={escapeRoom}
        myRole={myRole}
        onSwapRole={() => {
          const next: Record<string, 'room' | 'notebook'> = { ...escapeRole };
          const others = session.players.filter((p) => p.uid !== me.uid);
          next[me.uid] = myRole === 'room' ? 'notebook' : 'room';
          for (const o of others) next[o.uid] = next[me.uid] === 'room' ? 'notebook' : 'room';
          update({ escapeRole: next }, true);
        }}
        inventory={inventory}
        openedLocks={openedLocks}
        inspected={inspected}
        onInspect={(id) =>
          update({ inspected: inspected.includes(id) ? inspected : [...inspected, id] })
        }
        onTakeItem={(item) =>
          update({ inventory: inventory.includes(item) ? inventory : [...inventory, item] }, true)
        }
        onTryLock={(lock, value) => {
          // Server-side-trust-free verification: only valid opens land in state.
          let ok = false;
          if (lock.kind === 'key') ok = inventory.includes(lock.requiresItem ?? 'key');
          else if (lock.kind === 'door')
            ok = escapeRoom.locks.filter((l) => l.kind !== 'door').every((l) => openedLocks.includes(l.id));
          else if (lock.kind === 'pattern')
            ok = Array.isArray(lock.solution) && lock.solution.join(',') === value;
          else ok = lock.solution === value;
          if (!ok) return;
          const nextOpened = [...openedLocks, lock.id];
          const isDoor = lock.kind === 'door';
          update({ openedLocks: nextOpened, escaped: isDoor ? true : escaped }, true);
          if (isDoor) updateSession({ status: 'finished' });
        }}
        escaped={escaped}
        disabled={paused || escaped}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'dots-boxes') {
    body = (
      <DotsBoxesDuo
        seed={session.seed}
        level={session.level}
        me={me}
        other={other}
        players={session.players}
        isHost={isHost}
        paused={paused}
        state={state}
        update={update}
        updateSession={updateSession}
        sendChat={sendChat}
        winnerUid={session.winnerUid}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'safe-cracker') {
    body = (
      <SafeCrackerVersus
        seed={session.seed}
        level={session.level}
        me={me}
        other={other}
        players={session.players}
        isHost={isHost}
        paused={paused}
        state={state}
        update={update}
        updateSession={updateSession}
        sendChat={sendChat}
        winnerUid={session.winnerUid}
      />
    );
  } else if (session.mode === 'coop' && session.game === 'lantern-map') {
    body = (
      <LanternDuo
        seed={session.seed}
        level={session.level}
        me={me}
        other={other}
        players={session.players}
        isHost={isHost}
        paused={paused}
        state={state}
        update={update}
        updateSession={updateSession}
        sendChat={sendChat}
        winnerUid={session.winnerUid}
      />
    );
  } else if (session.mode === 'coop' && session.game === 'sketch-clue') {
    body = (
      <SketchDuo
        seed={session.seed}
        level={session.level}
        me={me}
        other={other}
        players={session.players}
        isHost={isHost}
        paused={paused}
        state={state}
        update={update}
        updateSession={updateSession}
        sendChat={sendChat}
        winnerUid={session.winnerUid}
      />
    );
  } else if (session.mode === 'coop' && session.game === 'spot-liar') {
    body = (
      <LiarDuo
        seed={session.seed}
        level={session.level}
        me={me}
        other={other}
        players={session.players}
        isHost={isHost}
        paused={paused}
        state={state}
        update={update}
        updateSession={updateSession}
        sendChat={sendChat}
        winnerUid={session.winnerUid}
      />
    );
  } else if (session.mode === 'coop' && session.game === 'know-me') {
    body = (
      <KnowMeDuo
        seed={session.seed}
        level={session.level}
        me={me}
        other={other}
        players={session.players}
        isHost={isHost}
        paused={paused}
        state={state}
        update={update}
        updateSession={updateSession}
        sendChat={sendChat}
        winnerUid={session.winnerUid}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'checkbox-race') {
    body = (
      <CheckboxRaceView
        seed={session.seed}
        level={session.level}
        mode="versus"
        opponentPct={other ? (progress[other.uid] ?? 0) : 0}
        opponentName={other?.name}
        disabled={paused || !!session.winnerUid}
        onProgress={(pct) => update({ progress: { ...progress, [me.uid]: pct } })}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'the-bridge') {
    body = (
      <BridgeView
        seed={session.seed}
        level={session.level}
        mode="versus"
        opponentPct={other ? (progress[other.uid] ?? 0) : 0}
        opponentName={other?.name}
        disabled={paused || !!session.winnerUid}
        onProgress={(pct) => update({ progress: { ...progress, [me.uid]: pct } })}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'spot-emoji') {
    body = (
      <SpotEmojiView
        seed={session.seed}
        level={session.level}
        mode="versus"
        opponentPct={other ? (progress[other.uid] ?? 0) : 0}
        opponentName={other?.name}
        disabled={paused || !!session.winnerUid}
        onProgress={(pct) => update({ progress: { ...progress, [me.uid]: pct } })}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'dont-press-purple') {
    body = (
      <PurpleView
        seed={session.seed}
        level={session.level}
        mode="versus"
        opponentPct={other ? (progress[other.uid] ?? 0) : 0}
        opponentName={other?.name}
        disabled={paused || !!session.winnerUid}
        onProgress={(pct) => update({ progress: { ...progress, [me.uid]: pct } })}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'uno-slap') {
    body = (
      <UnoSlapView
        seed={session.seed}
        level={session.level}
        mode="versus"
        opponentPct={other ? (progress[other.uid] ?? 0) : 0}
        opponentName={other?.name}
        disabled={paused || !!session.winnerUid}
        onProgress={(pct) => update({ progress: { ...progress, [me.uid]: pct } })}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'snake-arena') {
    body = (
      <SnakeView
        seed={session.seed}
        level={session.level}
        target={snakeTargetForLevel(session.level)}
        mode="versus"
        opponentPct={other ? (progress[other.uid] ?? 0) : 0}
        opponentName={other?.name}
        disabled={paused || !!session.winnerUid}
        onProgress={(pct) => update({ progress: { ...progress, [me.uid]: pct } })}
      />
    );
  } else if (session.mode === 'versus' && session.game === 'jinx') {
    const lists = (state.answers ?? {}) as Record<string, string[]>;
    const submitted = (state.jinxSubmitted ?? {}) as Record<string, boolean>;
    const myList = lists[me.uid] ?? [];
    const otherList = other ? (lists[other.uid] ?? []) : [];
    const bothSubmitted = !!submitted[me.uid] && !!other?.uid && !!submitted[other.uid];
    body = (
      <>
        <JinxView
          seed={session.seed}
          level={session.level}
          mode="versus"
          opponentPct={other ? (submitted[other.uid] ? 1 : 0) : 0}
          opponentName={other?.name}
          disabled={paused || !!session.winnerUid || !!submitted[me.uid]}
          onSubmitList={(words) =>
            update(
              {
                answers: { ...lists, [me.uid]: words },
                jinxSubmitted: { ...submitted, [me.uid]: true },
              },
              true,
            )
          }
        />
        {bothSubmitted && (
          <section className="card mt-4 p-5 text-center">
            <p className="font-display text-xl font-bold">Lists flipped</p>
            <p className="mt-1 text-sm">
              You scored {jinxScore(myList, otherList)} · {other?.name ?? 'Partner'} scored{' '}
              {jinxScore(otherList, myList)}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              Shared words scored for nobody — the win is in the words only one of you found.
            </p>
          </section>
        )}
      </>
    );
  } else if (session.mode === 'versus' && session.game === 'quoridor') {
    const q = state.quoridor as QuoridorState | undefined;
    if (!q) {
      body = <p className="panel p-4 text-sm">Setting up the board…</p>;
    } else {
      const myIdx = session.players.findIndex((p) => p.uid === me.uid);
      body = (
        <QuoridorView
          state={q}
          onMove={(m: QuoridorMove) => update({ quoridor: applyQuoridorMove(q, m) }, true)}
          myTurn={q.turn === myIdx}
          disabled={paused || !!session.winnerUid}
          meLabel="You"
          foeLabel={other?.name ?? 'Partner'}
        />
      );
    }
  } else if (session.mode === 'versus' && session.game === 'vibe-check') {
    const vibeGame = generateVibe(session.seed, session.level);
    const mySecretIdx = hashSeed(`${session.seed}|vibe|${me.uid}`) % 24;
    const mySecret = vibeGame.board[mySecretIdx]!;
    const eliminatedMap = (state.vibeEliminated ?? {}) as Record<string, number[]>;
    const myEliminated = eliminatedMap[me.uid] ?? [];
    const pending = state.vibePending as
      | { askerUid: string; questionId: string; text: string; trait: string }
      | null
      | undefined;
    const lastAnswer = state.vibeLastAnswer as
      | { text: string; answer: boolean }
      | null
      | undefined;
    const asked = (state.vibeAsked ?? []) as string[];
    const turnUid = state.vibeTurn as string | undefined;
    const myTurn = turnUid === me.uid;
    const setEliminated = (next: number[]) =>
      update({ vibeEliminated: { ...eliminatedMap, [me.uid]: next } });
    body = (
      <div>
        <section className="panel p-4">
          <p className="text-sm">
            Your secret: <strong>{mySecret.name}</strong> — traits:{' '}
            {mySecret.traits.join(', ')}. Answer honestly about them.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Board: {vibeGame.kind === 'desi' ? 'desi' : vibeGame.kind === 'global' ? 'global' : 'desi + global'} ·
            Fictional personas, not real celebrities.
          </p>
        </section>
        {pending && pending.askerUid !== me.uid && (
          <section className="card mt-4 p-4">
            <p className="font-semibold">
              {other?.name ?? 'Your partner'} asks: “{pending.text}”
            </p>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              Answer about {mySecret.name}, honestly.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={paused}
                onClick={() =>
                  update(
                    {
                      vibePending: null,
                      vibeLastAnswer: { text: pending.text, answer: true },
                    },
                    true,
                  )
                }
              >
                Yes
              </button>
              <button
                type="button"
                className="btn"
                disabled={paused}
                onClick={() =>
                  update(
                    {
                      vibePending: null,
                      vibeLastAnswer: { text: pending.text, answer: false },
                    },
                    true,
                  )
                }
              >
                No
              </button>
            </div>
          </section>
        )}
        {pending && pending.askerUid === me.uid && (
          <p className="panel mt-4 p-4 text-sm">
            Waiting for {other?.name ?? 'your partner'} to answer…
          </p>
        )}
        {!pending && myTurn && (
          <section className="card mt-4 p-4">
            {lastAnswer && (
              <p className="text-sm">
                They answered <strong>{lastAnswer.answer ? 'Yes' : 'No'}</strong> to “
                {lastAnswer.text}” — flip down everyone it can't be.
              </p>
            )}
            <p className="mt-2 font-semibold">Ask a question</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {VIBE_QUESTIONS.filter((q) => !asked.includes(q.id)).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className="btn"
                  disabled={paused || !!session.winnerUid}
                  onClick={() =>
                    update(
                      {
                        vibePending: {
                          askerUid: me.uid,
                          questionId: q.id,
                          text: q.text,
                          trait: q.trait,
                        },
                        vibeAsked: [...asked, q.id],
                      },
                      true,
                    )
                  }
                >
                  {q.text}
                </button>
              ))}
            </div>
            {other && (
              <button
                type="button"
                className="btn mt-3"
                disabled={paused || !!session.winnerUid}
                onClick={() => update({ vibeTurn: other.uid }, true)}
              >
                Pass the turn
              </button>
            )}
          </section>
        )}
        {!pending && !myTurn && (
          <p className="panel mt-4 p-4 text-sm">
            {other?.name ?? 'Your partner'} is asking — wait for their question, then answer
            honestly about {mySecret.name}.
          </p>
        )}
        <div className="mt-4">
          <VibeBoard
            board={vibeGame.board}
            eliminated={myEliminated}
            onToggleEliminate={(i) =>
              setEliminated(
                myEliminated.includes(i)
                  ? myEliminated.filter((x) => x !== i)
                  : [...myEliminated, i],
              )
            }
            onGuess={(i) => {
              if (!myTurn || paused || !!session.winnerUid) return;
              const opponentSecretIdx = hashSeed(`${session.seed}|vibe|${other?.uid ?? ''}`) % 24;
              if (i === opponentSecretIdx) {
                update(
                  { tally: tallyAfter(state.tally as RoomTally | undefined, me.uid) },
                  true,
                );
                updateSession({ winnerUid: me.uid, status: 'finished' });
              } else {
                setEliminated([...myEliminated, i]);
                if (other) update({ vibeTurn: other.uid }, true);
              }
            }}
            disabled={paused || !!session.winnerUid || !myTurn}
          />
        </div>
      </div>
    );
  } else {
    body = (
      <p className="panel p-4 text-sm">
        This game is not available in together mode yet — head back to the room and
        pick another.
      </p>
    );
  }

  const showMainVersusTally =
    session.mode === 'versus' &&
    ['logic-grids', 'cipher-desk', 'nonograms'].includes(session.game);

  return (
    <RoomShell
      code={code}
      title={title}
      members={members.length ? members : session.players.map((p) => ({ uid: p.uid, name: p.name }))}
      meUid={me.uid}
      paused={paused}
      connected={connected}
      chat={chat}
      notes={notes}
      cursors={cursors}
      onChat={sendChat}
      onNote={sendNote}
      onCursor={sendCursor}
      onLeave={leave}
      backHref={`/together/${code}`}
      call={<CallPanel code={code} meUid={me.uid} isHost={isHost} />}
      boothAutoSnap={(state.boothAutoSnap as boolean | undefined) ?? false}
      onBoothAutoSnap={(v) => update({ boothAutoSnap: v })}
      showWinSnap={!!session.winnerUid && (state.boothAutoSnap as boolean | undefined) === true}
    >
      {body}
      {showMainVersusTally && (
        <TallyPanel
          tally={state.tally as RoomTally | undefined}
          players={session.players}
          meUid={me.uid}
        />
      )}
    </RoomShell>
  );
}
