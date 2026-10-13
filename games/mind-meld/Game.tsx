'use client';

/* Mind Meld — co-op telepathy.
 * Both detectives type ONE word per round around a theme and submit at the
 * same time. Words reveal simultaneously; a match advances the meld (+XP),
 * a miss turns the next round's theme into "WORD_A + WORD_B" — the next
 * words must relate to BOTH. Five matches wins the meld.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './mind-meld.css';
import {
  GameButton,
  ScoreHUD,
  ResultModal,
  SectionTitle,
  LetterTile,
} from '../ui-kit';
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
      <div className="gk-root mx-auto max-w-xl">
        <GlassCard className="p-10 text-center">
          <div className="text-5xl">🔮</div>
          <h2 className="type-heading mt-4 text-2xl">Mind Meld</h2>
          <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
            A meld needs two minds. Create a room from the hub and invite your
            partner — then try to think the same word at the same instant.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-3xl">
      <div className="mb-4">
        <SectionTitle
          eyebrow={`ROUND ${round} · ${room.me.name} × ${room.peer.name}`}
          title="🔮 Mind Meld"
        />
      </div>
      <div className="mb-4">
        <ScoreHUD
          leftLabel="MATCHES"
          leftValue={matches}
          rightLabel="TO GO"
          rightValue={Math.max(0, MIND_WIN_MATCHES - matches)}
        />
      </div>

      {/* theme card */}
      <div className="mm-theme">
        <div className="mm-theme__eyebrow">
          {theme ? `🎲 Theme ${themeIdx + 1}/${MIND_THEMES.length} — ${theme.label}` : '🌀 Aftermath round'}
        </div>
        <div className="mm-theme__title">
          {theme ? theme.prompt : (gs.customTheme || `${(gs.prevA ?? '').toUpperCase()} + ${(gs.prevB ?? '').toUpperCase()}`)}
        </div>
        <p className="mm-theme__hint">
          {theme
            ? theme.hint
            : 'No match last round — your word must relate to BOTH of these.'}
        </p>
      </div>

      {/* the two minds */}
      <div className="mm-table mt-4">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
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
                <GameButton type="submit" disabled={!draft.trim()}>
                  Seal
                </GameButton>
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
      </div>

      {/* reveal — the two thoughts merge */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mm-merge mt-4 ${match ? 'mm-merge--match' : ''}`}
        >
          <div className="text-4xl" aria-hidden>{match ? '⚡' : '🌫️'}</div>
          <div className="mm-theme__eyebrow mt-2">
            {match ? 'Meld!' : 'Not quite'}
          </div>
          <div className="mm-merge__words">
            <WordTiles word={myWord ?? ''} />
            <span className="mm-vs" aria-hidden>{match ? '=' : '≠'}</span>
            <WordTiles word={peerWord ?? ''} />
          </div>
          <p className="mt-3 text-sm text-[#6b6355]">
            {match
              ? `Same wavelength. +${XP_AWARDS.clueSolved} XP each · ${MIND_WIN_MATCHES - matches - 1} to go.`
              : 'So close. Next round your words must bridge both of these.'}
          </p>
          <GameButton onClick={nextRound} className="mt-4">
            {match && matches + 1 >= MIND_WIN_MATCHES ? '✨ Complete the meld' : '▶ Next round'}
          </GameButton>
        </motion.div>
      )}

      {!revealed && myWord && (
        <p className="mt-4 text-center font-type text-sm text-[var(--gk-ink-dim)]">
          🔒 Your word is sealed… waiting for {room.peer.name}.
        </p>
      )}
      {!revealed && !myWord && (
        <p className="mt-4 text-center font-type text-sm text-[var(--gk-ink-dim)]">
          Type one word and seal it — neither of you sees the other's until both are in.
        </p>
      )}

      <ResultModal
        open={!!gs.won}
        eyebrow="MELD COMPLETE"
        headline="Minds melded"
        tone="win"
        stat={`${MIND_WIN_MATCHES} MATCHES IN ${round - 1} ROUNDS · +${XP_AWARDS.coopWin} XP EACH`}
        primaryLabel="Meld again"
        onPrimary={reset}
      />
    </div>
  );
}

function WordTiles({ word }: { word: string }) {
  const letters = normalizeWord(word).toUpperCase().split('');
  return (
    <div className="mm-tiles" role="img" aria-label={`Word: ${letters.join('')}`}>
      {letters.map((ch, i) => (
        <LetterTile key={i} letter={ch} size="sm" />
      ))}
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
    <div className="mm-bubble">
      <div className="mm-bubble__label">{label}</div>
      <div className="mm-bubble__word">
        {revealed && word ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <WordTiles word={word} />
          </motion.div>
        ) : state === 'sealed' ? (
          <div className="mm-sealed">
            <span className="mm-sealed__icon" aria-hidden>✉️</span>
            <span>sealed</span>
          </div>
        ) : state === 'waiting' ? (
          <div className="mm-sealed">
            <span className="mm-sealed__icon opacity-40" aria-hidden>💭</span>
            <span>thinking…</span>
          </div>
        ) : (
          <span className="text-xs text-[#8a8474]">your mind, below</span>
        )}
      </div>
      {children}
    </div>
  );
}
