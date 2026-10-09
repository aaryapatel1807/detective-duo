'use client';

/* Mind Meld — co-op telepathy.
 * Both detectives type ONE word per round around a theme and submit at the
 * same time. Words reveal simultaneously; a match advances the meld (+XP),
 * a miss turns the next round's theme into "WORD_A + WORD_B" — the next
 * words must relate to BOTH. Five matches wins the meld.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { RoomApi } from '../../lib/realtime/useRoom';
import type { MindShared } from './types';
import { MIND_THEMES } from './content';
import {
  MIND_WIN_MATCHES,
  advanceRound,
  freshMeld,
  normalizeWord,
  wordsMatch,
} from './logic';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

const SLUG = 'mind-meld';

function patch(room: RoomApi, p: Partial<MindShared>) {
  room.setShared({ games: { [SLUG]: p } });
}

export default function MindMeldGame({ room }: GameProps) {
  const gs: MindShared = room.shared?.games?.[SLUG] ?? {};
  const round = gs.round ?? 1;
  const matches = gs.matches ?? 0;
  const submissions = gs.submissions ?? {};
  const [draft, setDraft] = useState('');
  const winAwardedRef = useRef(false);

  const themeIdx = gs.themeIdx ?? 0;
  const theme = themeIdx >= 0 ? MIND_THEMES[themeIdx % MIND_THEMES.length] : null;

  const myWord = submissions[room.me.id];
  const peerWord = room.peer ? submissions[room.peer.id] : undefined;
  const revealed = !!room.peer && !!myWord && !!peerWord;
  const match = revealed && wordsMatch(myWord, peerWord);

  /* match XP — each tab awards its own player once per round (shared marker = rejoin-safe) */
  useEffect(() => {
    if (!revealed || !match) return;
    if ((gs.matchXp?.[room.me.id] ?? 0) >= round) return;
    awardXP(XP_AWARDS.clueSolved);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    sounds.stampThud();
    patch(room, { matchXp: { ...(gs.matchXp ?? {}), [room.me.id]: round } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, match, round, room.me.id]);

  /* co-op win awards */
  useEffect(() => {
    if (!gs.won || winAwardedRef.current) return;
    if (gs.awarded?.[room.me.id]) return;
    winAwardedRef.current = true;
    awardXP(XP_AWARDS.coopWin);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    recordCoopWin();
    sounds.stampThud();
    patch(room, { awarded: { ...(gs.awarded ?? {}), [room.me.id]: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.won, room.me.id]);

  const submit = () => {
    const w = draft.trim();
    if (!w || revealed || myWord) return;
    sounds.typewriterClick();
    patch(room, { submissions: { ...submissions, [room.me.id]: w } });
    setDraft('');
  };

  const nextRound = () => {
    // Deterministic from shared state — a double-fire from both tabs is idempotent.
    const cur = (room.shared?.games?.[SLUG] ?? {}) as MindShared;
    const subs = cur.submissions ?? {};
    const ids = Object.keys(subs);
    if (ids.length < 2) return;
    const a = subs[ids[0]];
    const b = subs[ids[1]];
    const adv = advanceRound(
      cur.round ?? 1,
      cur.matches ?? 0,
      cur.themeIdx ?? 0,
      MIND_THEMES.length,
      a,
      b,
    );
    sounds.paperShuffle();
    patch(room, {
      round: adv.round,
      matches: adv.matches,
      themeIdx: adv.themeIdx,
      customTheme: adv.customTheme,
      prevA: adv.prevA,
      prevB: adv.prevB,
      submissions: {},
      won: adv.won,
    });
  };

  const reset = () => {
    winAwardedRef.current = false;
    setDraft('');
    sounds.paperShuffle();
    patch(room, freshMeld());
  };

  if (!room.peer) {
    return (
      <div className="mx-auto max-w-xl">
        <GlassCard className="p-10 text-center">
          <div className="text-5xl">🔮</div>
          <h2 className="type-heading mt-4 text-2xl">Mind Meld</h2>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            A meld needs two minds. Create a room from the hub and invite your
            partner — then try to think the same word at the same instant.
          </p>
        </GlassCard>
      </div>
    );
  }

  if (gs.won) {
    return (
      <WinView
        rounds={round - 1}
        partnerName={room.peer.name}
        onReplay={reset}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="type-heading text-2xl">🔮 Mind Meld</h2>
          <p className="text-sm text-[var(--ink-dim)]">
            Round {round} · {room.me.name} × {room.peer.name}
          </p>
        </div>
        <div className="flex gap-1.5" title={`${matches}/${MIND_WIN_MATCHES} matches`}>
          {Array.from({ length: MIND_WIN_MATCHES }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border ${
                i < matches
                  ? 'border-[var(--amber-glow)] bg-[var(--amber-glow)] shadow-[0_0_10px_rgba(232,163,61,0.7)]'
                  : 'border-[var(--glass-border)] bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* theme card */}
      <div className="manila-folder p-6 text-center">
        <span className="eyebrow">
          {theme ? `🎲 Theme ${themeIdx + 1}/${MIND_THEMES.length} — ${theme.label}` : '🌀 Aftermath round'}
        </span>
        {theme ? (
          <>
            <div className="type-heading mt-2 text-5xl tracking-[0.15em]">{theme.prompt}</div>
            <p className="mt-2 text-sm italic text-[var(--ink-dim)]">{theme.hint}</p>
          </>
        ) : (
          <>
            <div className="type-heading mt-2 text-3xl tracking-wide">
              {gs.customTheme || `${(gs.prevA ?? '').toUpperCase()} + ${(gs.prevB ?? '').toUpperCase()}`}
            </div>
            <p className="mt-2 text-sm italic text-[var(--ink-dim)]">
              No match last round — your word must relate to <b>BOTH</b> of these.
            </p>
          </>
        )}
      </div>

      {/* the two minds */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MindCard
          label={`🧠 ${room.me.name} (you)`}
          state={myWord ? 'sealed' : 'input'}
          word={myWord}
          revealed={revealed}
        >
          {!myWord && !revealed && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mt-3 flex gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="One word…"
                maxLength={24}
                autoFocus
                className="noir-input min-w-0 flex-1 text-center font-type text-lg tracking-[0.2em]"
              />
              <button type="submit" className="noir-btn !px-5" disabled={!draft.trim()}>
                Seal
              </button>
            </form>
          )}
        </MindCard>
        <MindCard
          label={`🧠 ${room.peer.name}`}
          state={peerWord ? 'sealed' : 'waiting'}
          word={peerWord}
          revealed={revealed}
        />
      </div>

      {/* reveal */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card-strong mt-4 p-6 text-center ${
            match ? '!border-[var(--amber-glow)]' : ''
          }`}
        >
          {match ? (
            <>
              <div className="text-4xl">⚡</div>
              <div className="type-heading mt-2 text-3xl text-[var(--amber-glow)]">
                MELD! “{normalizeWord(myWord).toUpperCase()}”
              </div>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                Same wavelength. +{XP_AWARDS.clueSolved} XP each · {MIND_WIN_MATCHES - matches - 1} to
                go.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">🌫️</div>
              <div className="type-heading mt-2 text-2xl">
                “{normalizeWord(myWord).toUpperCase()}” ≠ “{normalizeWord(peerWord!).toUpperCase()}”
              </div>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                So close. Next round your words must bridge both of these.
              </p>
            </>
          )}
          <button onClick={nextRound} className="noir-btn mt-4 !px-10 !py-3">
            {match && matches + 1 >= MIND_WIN_MATCHES ? '✨ Complete the meld' : '▶ Next round'}
          </button>
        </motion.div>
      )}

      {!revealed && myWord && (
        <p className="mt-4 text-center font-type text-sm text-[var(--ink-dim)]">
          🔒 Your word is sealed… waiting for {room.peer.name}.
        </p>
      )}
      {!revealed && !myWord && (
        <p className="mt-4 text-center font-type text-sm text-[var(--ink-dim)]">
          Type one word and seal it — neither of you sees the other's until both are in.
        </p>
      )}
    </div>
  );
}

function MindCard({
  label,
  state,
  word,
  revealed,
  children,
}: {
  label: string;
  state: 'input' | 'sealed' | 'waiting';
  word?: string;
  revealed: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-card !rounded-2xl p-5 text-center">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 flex min-h-[4.5rem] items-center justify-center">
        {revealed && word ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="type-heading text-4xl tracking-[0.12em] text-[var(--amber-glow)]"
          >
            {normalizeWord(word).toUpperCase()}
          </motion.div>
        ) : state === 'sealed' ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">✉️</span>
            <span className="font-type text-xs text-[var(--ink-dim)]">sealed</span>
          </div>
        ) : state === 'waiting' ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl opacity-40">💭</span>
            <span className="font-type text-xs text-[var(--ink-faint)]">thinking…</span>
          </div>
        ) : (
          <span className="font-type text-xs text-[var(--ink-faint)]">your mind, below</span>
        )}
      </div>
      {children}
    </div>
  );
}

function WinView({
  rounds,
  partnerName,
  onReplay,
}: {
  rounds: number;
  partnerName: string;
  onReplay: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-strong mx-auto max-w-xl p-10 text-center"
    >
      <div className="text-6xl">🔮⚡</div>
      <h3 className="type-heading mt-4 text-3xl">MINDS MELDED</h3>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        {MIND_WIN_MATCHES} matches in {rounds} rounds — you and {partnerName} are
        officially sharing one brain cell. A detective-grade one.
      </p>
      <div className="eyebrow mt-3 text-[var(--amber-glow)]">
        +{XP_AWARDS.coopWin} XP each · love-notes surprise unlocked 💌
      </div>
      <button onClick={onReplay} className="noir-btn mt-6 !px-10 !py-3">
        Meld again
      </button>
    </motion.div>
  );
}
