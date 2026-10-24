'use client';

/**
 * Together play screen: renders the right game view from the session
 * row (game + mode + seed + level), so a refresh restores the game
 * exactly. Versus views track each player's own marks and a friendly
 * progress bar; co-op views share one state.
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
} from '@/components/together/DuoCornerViews';
import { generatePuzzle as genGrid } from '@/lib/generators/logicGrid';
import { generatePuzzle as genCipher } from '@/lib/generators/cipherDesk';
import { generatePuzzle as genNonogram } from '@/lib/generators/nonogram';
import { generateRoom } from '@/lib/generators/escapeRoom';
import { ALL_CASES } from '@/lib/cases/bank';
import { splitCase, splittableCases } from '@/lib/together/split';
import { cipherProgress, logicGridProgress, nonogramProgress } from '@/lib/together/versus';
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
  const myPct = useMemo(() => {
    if (!session || !me || session.mode !== 'versus') return 0;
    const progress = (state.progress ?? {}) as Record<string, number>;
    return progress[me.uid] ?? 0;
  }, [session?.mode, state.progress, me?.uid]);
  useEffect(() => {
    if (session && session.mode === 'versus' && myPct >= 1 && !session.winnerUid && me) {
      updateSession({ winnerUid: me.uid, status: 'finished' });
    }
  }, [myPct, session?.mode, session?.winnerUid, me?.uid, updateSession]);

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
  } else {
    body = (
      <p className="panel p-4 text-sm">
        This game is not available in together mode yet — head back to the room and
        pick another.
      </p>
    );
  }

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
    >
      {body}
    </RoomShell>
  );
}
