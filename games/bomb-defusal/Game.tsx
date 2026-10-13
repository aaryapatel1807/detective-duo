'use client';

/* Bomb Defusal — co-op asymmetric.
 * Technician: sees the bomb (4 modules) + 5:00 countdown.
 * Expert: sees the defusal MANUAL, never the bomb. In-game radio chat.
 * State: shared.games['bomb-defusal']; static config derived from the seed.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './bomb-defusal.css';
import { GameButton, ProgressBar } from '../ui-kit';
import type { GameProps } from '../types';
import type { RoomApi } from '../../lib/realtime/useRoom';
import type { BombRole, BombShared, BombStatus } from './types';
import {
  BOMB_TIME_MS,
  MAX_STRIKES,
  PASSWORD_WORDS,
  PASSWORD_WHEEL_SIZE,
  SIMON_COLORS,
  SIMON_NAMES,
  SIMON_ROUNDS,
  WIRE_NAMES,
  generateBomb,
  keypadPressOrder,
  simonExpected,
  wheelLetters,
  wireToCut,
  type SimonColor,
  type WireColor,
} from './logic';
import { MANUAL_PAGES, MANUAL_TIPS } from './manual';
import ChatBox from './ChatBox';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

const SLUG = 'bomb-defusal';

function patch(room: RoomApi, p: Partial<BombShared>) {
  room.setShared({ games: { [SLUG]: p } });
}

function freshGame(roles: Record<string, BombRole>): BombShared {
  return {
    seed: null,
    roles,
    status: 'setup',
    deadline: 0,
    strikes: 0,
    cutWire: null,
    keypadPressed: [],
    simonRound: 0,
    simonInput: [],
    simonKeyStrikes: 0,
    wheelIdx: [0, 0, 0],
    awarded: {},
  };
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const WIRE_CSS: Record<WireColor, string> = {
  R: '#d63a2c',
  Y: '#e8c33d',
  B: '#3d7de8',
  W: '#e8e2d4',
  K: '#2a2a2e',
};

const SIMON_CSS: Record<SimonColor, string> = {
  R: '#d63a2c',
  G: '#3ddc74',
  B: '#3d7de8',
  Y: '#e8c33d',
};

export default function BombDefusalGame({ room }: GameProps) {
  const gs: BombShared = room.shared?.games?.[SLUG] ?? {};
  const status: BombStatus = gs.status ?? 'setup';
  const cfg = useMemo(
    () => (gs.seed != null ? generateBomb(gs.seed) : null),
    [gs.seed],
  );
  const roles = gs.roles ?? {};
  const myRole: BombRole | undefined = roles[room.me.id];
  const strikes = gs.strikes ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const awardedRef = useRef(false);

  const wiresDone =
    !!cfg && gs.cutWire != null && gs.cutWire === wireToCut(cfg.wires);
  const keypadDone =
    !!cfg &&
    (gs.keypadPressed ?? []).join('|') === keypadPressOrder(cfg.keypad).join('|') &&
    (gs.keypadPressed ?? []).length === 4;
  const simonDone = (gs.simonRound ?? 0) >= SIMON_ROUNDS;
  const passwordDone =
    !!cfg &&
    PASSWORD_WORDS.includes(
      wheelLetters(cfg.password.wheels, gs.wheelIdx ?? [0, 0, 0]).join(''),
    );
  const allDone = wiresDone && keypadDone && simonDone && passwordDone;

  /* countdown tick */
  useEffect(() => {
    if (status !== 'armed') return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [status]);

  /* timer ran out -> boom (any tab; guarded by status) */
  useEffect(() => {
    if (status !== 'armed' || !gs.deadline) return;
    if (now >= gs.deadline) {
      const cur = room.shared?.games?.[SLUG]?.status;
      if (cur === 'armed') {
        patch(room, { status: 'exploded' });
        sounds.stampThud();
      }
    }
  }, [now, status, gs.deadline, room]);

  /* all modules defused -> win */
  useEffect(() => {
    if (status === 'armed' && allDone && cfg) {
      patch(room, { status: 'defused' });
    }
  }, [status, allDone, cfg, room]);

  /* co-op win awards (each tab awards its own player; shared marker = rejoin-safe) */
  useEffect(() => {
    if (status !== 'defused' || awardedRef.current) return;
    if (gs.awarded?.[room.me.id]) return;
    awardedRef.current = true;
    awardXP(XP_AWARDS.coopWin);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    recordCoopWin();
    sounds.stampThud();
    patch(room, { awarded: { ...(gs.awarded ?? {}), [room.me.id]: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, room.me.id]);

  const strike = () => {
    const s = strikes + 1;
    sounds.stampThud();
    if (s >= MAX_STRIKES) patch(room, { strikes: s, status: 'exploded' });
    else patch(room, { strikes: s });
  };

  const chooseRole = (r: BombRole) => {
    sounds.pinTap();
    if (room.peer) {
      const other: BombRole = r === 'technician' ? 'expert' : 'technician';
      patch(room, { roles: { [room.me.id]: r, [room.peer.id]: other } });
    } else {
      patch(room, { roles: { [room.me.id]: r } });
    }
  };

  const arm = () => {
    sounds.paperShuffle();
    let r = roles;
    if (!r[room.me.id]) {
      const ids = room.members.map((m) => m.id).sort();
      const next: Record<string, BombRole> = { ...r };
      ids.forEach((id, i) => {
        if (!next[id]) next[id] = i === 0 ? 'technician' : 'expert';
      });
      r = next;
    }
    patch(room, {
      ...freshGame(r),
      seed: Math.floor(Math.random() * 2 ** 31),
      status: 'armed',
      deadline: Date.now() + BOMB_TIME_MS,
    });
  };

  const reset = () => {
    awardedRef.current = false;
    patch(room, freshGame(roles));
  };

  const remaining = (gs.deadline ?? 0) - now;
  const timeDanger = status === 'armed' && remaining < 60_000;
  const modulesDefused = [wiresDone, keypadDone, simonDone, passwordDone].filter(Boolean).length;

  return (
    <div className="gk-root mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-heading text-2xl">💣 Bomb Defusal</h2>
          <p className="text-sm text-[var(--gk-ink-dim)]">
            {myRole === 'technician'
              ? 'You are the TECHNICIAN — describe what you see.'
              : myRole === 'expert'
                ? "You are the EXPERT — read the manual, give orders."
                : 'Pick a role to begin the operation.'}
          </p>
        </div>
        {status === 'armed' && (
          <div className="flex items-center gap-4">
            <div className={`bd-timer ${timeDanger ? 'bd-timer--danger' : ''}`} role="timer" aria-label={`${fmt(remaining)} remaining`}>
              {fmt(remaining)}
            </div>
            <div className="flex gap-2" title="Strikes" aria-label={`${strikes} of ${MAX_STRIKES} strikes`}>
              {Array.from({ length: MAX_STRIKES }).map((_, i) => (
                <span key={i} className={`bd-led ${i < strikes ? 'bd-led--on' : ''}`} aria-hidden />
              ))}
            </div>
          </div>
        )}
      </div>

      {status === 'armed' && (
        <div className="mb-4 max-w-md">
          <ProgressBar label="MODULES DEFUSED" value={modulesDefused} max={4} />
        </div>
      )}

      {status === 'setup' && (
        <SetupView
          room={room}
          myRole={myRole}
          roles={roles}
          onChoose={chooseRole}
          onArm={arm}
        />
      )}

      {status === 'armed' && cfg && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            {myRole === 'technician' || !room.peer ? (
              <TechnicianView
                room={room}
                gs={gs}
                seed={gs.seed as number}
                onStrike={strike}
                flags={{ wiresDone, keypadDone, simonDone, passwordDone }}
                solo={!room.peer}
                myRole={myRole}
                onChoose={chooseRole}
              />
            ) : (
              <ExpertView room={room} />
            )}
          </div>
          <ChatBox
            room={room}
            actionType="chat"
            title="Field radio — bomb squad"
            quickPhrases={['Cut which wire?', 'Read that back', 'Slow down', 'Got it']}
          />
        </div>
      )}

      {(status === 'defused' || status === 'exploded') && (
        <EndView
          status={status}
          strikes={strikes}
          remaining={remaining}
          onReset={reset}
          partnerName={room.peer?.name}
        />
      )}
    </div>
  );
}

/* ---------------- setup ---------------- */

function SetupView({
  room,
  myRole,
  roles,
  onChoose,
  onArm,
}: {
  room: RoomApi;
  myRole: BombRole | undefined;
  roles: Record<string, BombRole>;
  onChoose: (r: BombRole) => void;
  onArm: () => void;
}) {
  const peerRole = room.peer ? roles[room.peer.id] : undefined;
  return (
    <GlassCard className="p-8 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(179,38,30,0.15)] text-4xl">
        💣
      </div>
      <h3 className="type-heading text-xl">Case file: The Ticking Device</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--gk-ink-dim)]">
        A device with four modules and a five-minute fuse. The Technician sees
        the bomb but not the manual. The Expert holds the manual but never sees
        the bomb. Talk.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(
          [
            { r: 'technician' as BombRole, icon: '🧰', title: 'Technician', desc: 'Sees the bomb. Follows orders.' },
            { r: 'expert' as BombRole, icon: '📖', title: 'Expert', desc: 'Holds the manual. Gives orders.' },
          ]
        ).map(({ r, icon, title, desc }) => (
          <motion.button
            key={r}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChoose(r)}
            className={`glass-card !rounded-2xl p-5 text-left transition ${
              myRole === r
                ? '!border-[var(--amber-glow)] shadow-[0_0_24px_rgba(232,163,61,0.25)]'
                : 'hover:!border-[var(--brass)]'
            }`}
          >
            <div className="text-3xl">{icon}</div>
            <div className="type-heading mt-2">{title}</div>
            <div className="text-sm text-[var(--gk-ink-dim)]">{desc}</div>
            {myRole === r && (
              <div className="eyebrow mt-2 text-[var(--amber-glow)]">← your role</div>
            )}
            {peerRole === r && room.peer && (
              <div className="eyebrow mt-2">{room.peer.name} has this</div>
            )}
          </motion.button>
        ))}
      </div>
      {!room.peer && (
        <p className="mt-4 text-xs text-[var(--gk-ink-faint)]">
          Solo practice — arm the device and you can flip between both views.
        </p>
      )}
      <button
        type="button"
        onClick={onArm}
        disabled={!myRole && !!room.peer && !roles[room.peer?.id ?? '']}
        className="bd-arm mt-6"
      >
        🔴 ARM THE DEVICE
      </button>
    </GlassCard>
  );
}

/* ---------------- technician ---------------- */

function TechnicianView({
  room,
  gs,
  seed,
  onStrike,
  flags,
  solo,
  myRole,
  onChoose,
}: {
  room: RoomApi;
  gs: BombShared;
  seed: number;
  onStrike: () => void;
  flags: { wiresDone: boolean; keypadDone: boolean; simonDone: boolean; passwordDone: boolean };
  solo: boolean;
  myRole: BombRole | undefined;
  onChoose: (r: BombRole) => void;
}) {
  const cfg = useMemo(() => generateBomb(seed), [seed]);
  return (
    <div className="bd-console space-y-4">
      {solo && (
        <div className="flex gap-2">
          <GameButton
            size="sm"
            variant={myRole === 'technician' ? 'primary' : 'ghost'}
            onClick={() => onChoose('technician')}
          >
            🧰 Bomb view
          </GameButton>
          <GameButton
            size="sm"
            variant={myRole === 'expert' ? 'primary' : 'ghost'}
            onClick={() => onChoose('expert')}
          >
            📖 Manual view
          </GameButton>
        </div>
      )}
      {myRole === 'expert' && solo ? (
        <ExpertView room={room} />
      ) : (
        <>
          <WiresModule room={room} gs={gs} cfg={cfg} done={flags.wiresDone} onStrike={onStrike} />
          <KeypadModule room={room} gs={gs} cfg={cfg} done={flags.keypadDone} onStrike={onStrike} />
          <SimonModule room={room} gs={gs} cfg={cfg} done={flags.simonDone} onStrike={onStrike} />
          <PasswordModule room={room} gs={gs} cfg={cfg} done={flags.passwordDone} onStrike={onStrike} />
        </>
      )}
    </div>
  );
}

function ModuleCard({
  title,
  icon,
  done,
  children,
}: {
  title: string;
  icon: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bd-module">
      <span className="bd-module__screw bd-module__screw--tl" aria-hidden />
      <span className="bd-module__screw bd-module__screw--tr" aria-hidden />
      <span className="bd-module__screw bd-module__screw--bl" aria-hidden />
      <span className="bd-module__screw bd-module__screw--br" aria-hidden />
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="type-heading text-lg text-[var(--gk-ink)]">
          {icon} {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`bd-led ${done ? 'bd-led--green bd-led--on' : 'bd-led--on'}`} aria-hidden />
          <span className={`eyebrow ${done ? 'text-[var(--brass)]' : 'text-[var(--blood-bright)]'}`}>
            {done ? '✓ DEFUSED' : '● ARMED'}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function WiresModule({
  room, gs, cfg, done, onStrike,
}: {
  room: RoomApi; gs: BombShared; cfg: ReturnType<typeof generateBomb>; done: boolean; onStrike: () => void;
}) {
  const cut = (i: number) => {
    if (done || gs.cutWire != null) return;
    sounds.pinTap();
    if (i === wireToCut(cfg.wires)) {
      patch(room, { cutWire: i });
      sounds.stampThud();
    } else {
      patch(room, { cutWire: i });
      onStrike();
    }
  };
  return (
    <ModuleCard title="Wires" icon="🔌" done={done}>
      <p className="mb-3 text-xs text-[var(--gk-ink-dim)]">
        Describe the wires left-to-right to your Expert, then cut the ONE they name.
      </p>
      <div className="flex flex-col gap-2">
        {cfg.wires.map((w, i) => {
          const isCut = gs.cutWire === i;
          return (
            <motion.button
              key={i}
              whileTap={done ? undefined : { scale: 0.98 }}
              onClick={() => cut(i)}
              disabled={done || gs.cutWire != null}
              aria-label={`Cut wire ${i + 1}, ${WIRE_NAMES[w]}`}
              className="bd-wire relative min-h-[52px] overflow-hidden rounded-full transition disabled:cursor-default"
              style={{
                background: isCut
                  ? 'rgba(255,255,255,0.06)'
                  : `linear-gradient(180deg, ${WIRE_CSS[w]} 0%, ${WIRE_CSS[w]} 45%, rgba(0,0,0,0.45) 50%, ${WIRE_CSS[w]} 55%, ${WIRE_CSS[w]} 100%)`,
                opacity: isCut ? 0.45 : 1,
              }}
              title={WIRE_NAMES[w]}
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-type text-xs text-black/60">
                {i + 1} · {WIRE_NAMES[w]}
              </span>
              {isCut && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--gk-ink-dim)]">
                  ✂ cut
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </ModuleCard>
  );
}

function KeypadModule({
  room, gs, cfg, done, onStrike,
}: {
  room: RoomApi; gs: BombShared; cfg: ReturnType<typeof generateBomb>; done: boolean; onStrike: () => void;
}) {
  const pressed = gs.keypadPressed ?? [];
  const press = (sym: string) => {
    if (done) return;
    sounds.typewriterClick();
    const expected = keypadPressOrder(cfg.keypad)[pressed.length];
    if (sym === expected) {
      const next = [...pressed, sym];
      patch(room, { keypadPressed: next });
      if (next.length === 4) sounds.stampThud();
    } else {
      patch(room, { keypadPressed: [] });
      onStrike();
    }
  };
  return (
    <ModuleCard title="Keypad" icon="🔢" done={done}>
      <p className="mb-3 text-xs text-[var(--gk-ink-dim)]">
        Read the four symbols to your Expert. Press them in the order they dictate.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {cfg.keypad.map((sym) => {
          const idx = pressed.indexOf(sym);
          return (
            <motion.button
              key={sym}
              whileTap={done ? undefined : { scale: 0.92 }}
              onClick={() => press(sym)}
              disabled={done}
              aria-label={`Keypad symbol ${sym}`}
              className={`bd-key flex items-center justify-center ${
                idx >= 0 ? '!border-[var(--brass)]' : ''
              }`}
              style={idx >= 0 ? { background: 'linear-gradient(180deg, #6b5a33 0%, #4a3f28 60%, #35301f 100%)' } : undefined}
            >
              {sym}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 font-type text-xs text-[var(--gk-ink-dim)]">
        Pressed: {pressed.join(' ') || '—'}
      </div>
    </ModuleCard>
  );
}

function SimonModule({
  room, gs, cfg, done, onStrike,
}: {
  room: RoomApi; gs: BombShared; cfg: ReturnType<typeof generateBomb>; done: boolean; onStrike: () => void;
}) {
  const round = gs.simonRound ?? 0;
  const input = gs.simonInput ?? [];
  const keyStrikes = gs.simonKeyStrikes ?? 0;
  const seq = cfg.simon[Math.min(round, SIMON_ROUNDS - 1)];
  const [flash, setFlash] = useState<SimonColor | null>(null);
  const [watching, setWatching] = useState(false);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    if (done || !seq) {
      setWatching(false);
      return;
    }
    setWatching(true);
    const timers: number[] = [];
    seq.forEach((c, i) => {
      timers.push(window.setTimeout(() => setFlash(c), 700 + i * 750));
      timers.push(window.setTimeout(() => setFlash(null), 700 + i * 750 + 480));
    });
    timers.push(window.setTimeout(() => setWatching(false), 700 + seq.length * 750 + 100));
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, done, replay]);

  const press = (c: SimonColor) => {
    if (done || watching) return;
    sounds.typewriterClick();
    const expected = simonExpected(seq, keyStrikes)[input.length];
    if (c === expected) {
      const next = [...input, c];
      if (next.length === seq.length) {
        const nr = round + 1;
        patch(room, {
          simonRound: nr,
          simonInput: [],
          simonKeyStrikes: gs.strikes ?? 0,
        });
        if (nr >= SIMON_ROUNDS) sounds.stampThud();
        else sounds.xpTick();
      } else {
        patch(room, { simonInput: next });
      }
    } else {
      patch(room, { simonInput: [] });
      onStrike();
    }
  };

  return (
    <ModuleCard title="Simon Lights" icon="💡" done={done}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-[var(--gk-ink-dim)]">
          Round {Math.min(round + 1, SIMON_ROUNDS)}/{SIMON_ROUNDS} — watch the
          flashes, then press the RESPONSE colors your Expert dictates.
        </p>
        {!done && !watching && (
          <GameButton size="sm" variant="ghost" onClick={() => setReplay((r) => r + 1)}>
            ↻ Replay
          </GameButton>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {SIMON_COLORS.map((c) => (
          <motion.button
            key={c}
            whileTap={done || watching ? undefined : { scale: 0.9 }}
            onClick={() => press(c)}
            disabled={done || watching}
            className="bd-simon flex items-center justify-center"
            style={{
              borderColor: 'var(--glass-border)',
              background: flash === c ? SIMON_CSS[c] : 'rgba(255,255,255,0.05)',
              boxShadow: flash === c ? `0 0 28px ${SIMON_CSS[c]}` : 'none',
              opacity: input.includes(c) && !done ? 0.9 : 1,
            }}
            title={SIMON_NAMES[c]}
          >
            <span className="font-type text-xs text-[var(--gk-ink-dim)]">
              {SIMON_NAMES[c].toUpperCase()}
            </span>
          </motion.button>
        ))}
      </div>
      <div className="mt-2 font-type text-xs text-[var(--gk-ink-dim)]">
        {watching ? '👁 WATCH…' : `Input: ${input.length}/${seq.length}`}
      </div>
    </ModuleCard>
  );
}

function PasswordModule({
  room, gs, cfg, done, onStrike,
}: {
  room: RoomApi; gs: BombShared; cfg: ReturnType<typeof generateBomb>; done: boolean; onStrike: () => void;
}) {
  const idx = gs.wheelIdx ?? [0, 0, 0];
  const wheels = cfg.password.wheels;
  const spin = (w: number, d: number) => {
    if (done) return;
    sounds.typewriterClick();
    const next = [...idx];
    next[w] = (next[w] + d + PASSWORD_WHEEL_SIZE) % PASSWORD_WHEEL_SIZE;
    patch(room, { wheelIdx: next });
  };
  const submit = () => {
    if (done) return;
    const word = wheelLetters(wheels, idx).join('');
    if (PASSWORD_WORDS.includes(word)) {
      sounds.stampThud();
    } else {
      onStrike();
    }
  };
  return (
    <ModuleCard title="Password Wheels" icon="🎡" done={done}>
      <p className="mb-3 text-xs text-[var(--gk-ink-dim)]">
        Spin each wheel and read the letters to your Expert. Submit when the
        three letters form a manual word.
      </p>
      <div className="flex items-center justify-center gap-4">
        {wheels.map((letters, w) => (
          <div key={w} className="flex flex-col items-center gap-1">
            <GameButton size="sm" variant="ghost" onClick={() => spin(w, -1)} disabled={done} ariaLabel="Spin wheel down">
              ▲
            </GameButton>
            <div className="bd-wheel flex h-20 w-16 items-center justify-center font-type text-4xl">
              {letters[idx[w] ?? 0]}
            </div>
            <GameButton size="sm" variant="ghost" onClick={() => spin(w, 1)} disabled={done} ariaLabel="Spin wheel up">
              ▼
            </GameButton>
          </div>
        ))}
        <GameButton onClick={submit} disabled={done} className="ml-2">
          SUBMIT
        </GameButton>
      </div>
    </ModuleCard>
  );
}

/* ---------------- expert ---------------- */

function ExpertView({ room }: { room: RoomApi }) {
  const [page, setPage] = useState(0);
  const p = MANUAL_PAGES[page];
  return (
    <div className="space-y-4">
      <div className="manila-folder p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="eyebrow">📖 Defusal manual — expert eyes only</span>
          <span className="font-type text-xs text-[var(--gk-ink-dim)]">
            {page + 1}/{MANUAL_PAGES.length}
          </span>
        </div>
        <h3 className="type-heading text-xl">{p.title}</h3>
        <div className="paper-strip mt-3 space-y-2 p-4 font-type text-sm leading-relaxed">
          {p.body.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <GameButton
            variant="ghost"
            onClick={() => { setPage((x) => Math.max(0, x - 1)); sounds.paperShuffle(); }}
            disabled={page === 0}
          >
            ← Prev
          </GameButton>
          <GameButton
            variant="ghost"
            onClick={() => { setPage((x) => Math.min(MANUAL_PAGES.length - 1, x + 1)); sounds.paperShuffle(); }}
            disabled={page === MANUAL_PAGES.length - 1}
          >
            Next →
          </GameButton>
        </div>
      </div>
      <div className="glass-card !rounded-2xl p-4">
        <span className="eyebrow">Field notes</span>
        <ul className="mt-2 space-y-1 text-xs text-[var(--gk-ink-dim)]">
          {MANUAL_TIPS.map((t, i) => (
            <li key={i}>• {t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- end ---------------- */

function EndView({
  status,
  strikes,
  remaining,
  onReset,
  partnerName,
}: {
  status: BombStatus;
  strikes: number;
  remaining: number;
  onReset: () => void;
  partnerName?: string | null;
}) {
  const won = status === 'defused';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-strong mx-auto mt-4 max-w-xl p-10 text-center"
    >
      <div className="text-6xl">{won ? '🏆' : '💥'}</div>
      <h3 className="type-heading mt-4 text-3xl">
        {won ? 'DEVICE DEFUSED' : 'DETONATION'}
      </h3>
      <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
        {won
          ? `Case closed with ${fmt(remaining)} to spare and ${strikes} strike${strikes === 1 ? '' : 's'}. Flawless teamwork, detectives.`
          : strikes >= MAX_STRIKES
            ? `Three strikes — the device blew. ${partnerName ? `Debrief with ${partnerName} and go again.` : 'Regroup and go again.'}`
            : 'The timer hit zero. The evidence room will need a new carpet.'}
      </p>
      {won && (
        <div className="eyebrow mt-3 text-[var(--amber-glow)]">
          +{XP_AWARDS.coopWin} XP each · love-notes surprise unlocked 💌
        </div>
      )}
      <GameButton onClick={onReset} className="mt-6">
        {won ? 'New device' : 'Try again'}
      </GameButton>
    </motion.div>
  );
}
