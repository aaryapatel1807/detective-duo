'use client';

/* Accusation + verdict views: secret dual vote, case closed, case cold. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileCheck2, Gavel, RotateCcw, Snowflake, Vote } from 'lucide-react';
import type { GameProps } from '../../types';
import type { CaseFile } from '../../../lib/content/cases';
import {
  MAX_ATTEMPTS,
  attemptsLeft,
  castVote,
  tallyVotes,
  writeProgress,
} from '../logic';
import type { MysteryShared } from '../types';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../../lib/xp';
import { recordCoopWin } from '../../../lib/lovenotes';
import { Typewriter } from '../../../components/Typewriter';
import { sounds } from '../../../lib/sound';

/* ---------------- accusation ---------------- */

export function AccuseView({
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
    <div className="cm-section mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h2 className="cm-font-display text-2xl tracking-[0.15em] text-[var(--cm-gold)]">
          NAME THE CULPRIT
        </h2>
        <p className="cm-font-mono mt-2 text-xs text-[var(--cm-ink-dim)]">
          {room.peer
            ? 'Both detectives vote in secret. The file closes only if you BOTH name the same guilty party — and you\'re right.'
            : 'Solo practice: your vote alone decides.'}
        </p>
        {(gs.attempts ?? 0) > 0 && (
          <p className="cm-font-mono mt-2 text-xs text-[var(--cm-red)]">
            ⚠ {attemptsLeft(gs.attempts ?? 0)}{' '}
            {attemptsLeft(gs.attempts ?? 0) === 1 ? 'try' : 'tries'} remaining — the
            captain is watching.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {caseFile.suspects.map((s) => (
          <button
            key={s.name}
            onClick={() => !meVoted && setPick(s.name)}
            disabled={meVoted}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              pick === s.name
                ? 'border-[var(--cm-red)] bg-[rgba(179,38,30,0.14)]'
                : 'border-[var(--cm-border)] hover:border-[var(--cm-red)]'
            } ${meVoted ? 'opacity-60' : ''}`}
          >
            {s.portrait && (
              <img
                src={s.portrait}
                alt={s.name}
                className="h-14 w-14 rounded-lg object-cover object-top"
                style={{ filter: 'grayscale(1) contrast(1.05)' }}
              />
            )}
            <div className="min-w-0">
              <div className="cm-font-display text-[0.95rem]">{s.name}</div>
              <div className="cm-font-mono mt-0.5 text-[0.6rem] tracking-[0.12em] text-[var(--cm-ink-dim)]">
                {s.descriptor ?? ''}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {!meVoted ? (
          <button onClick={vote} disabled={!pick} className="cm-btn-red">
            <Vote size={15} /> CAST SECRET VOTE{pick ? `: ${pick.toUpperCase()}` : ''}
          </button>
        ) : (
          <div className="text-center">
            <div className="cm-font-mono text-sm text-[var(--cm-gold)]">
              🗳 Your vote is sealed.
            </div>
            <div className="cm-font-mono mt-1 text-xs text-[var(--cm-ink-dim)]">
              {peerVoted
                ? 'Both votes are in — opening the envelopes…'
                : `Waiting for ${room.peer?.name ?? 'partner'}…`}
            </div>
          </div>
        )}
        <button onClick={() => patch({ phase: 'board', votes: {} })} className="cm-btn-ghost">
          ← Back to the board
        </button>
      </div>
    </div>
  );
}

/* ---------------- solved ---------------- */

export function SolvedView({
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
    awardXP(XP_AWARDS.mysterySolved);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    recordCoopWin();
    writeProgress(caseFile.id, 'solved');
    sounds.xpTick();
    patch({ awarded: { ...awarded, [room.me.id]: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cm-section mx-auto max-w-2xl text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        className="cm-panel"
      >
        <div className="mb-4 flex justify-center">
          <span className="cm-rank-ring">
            <FileCheck2 size={44} className="text-[var(--cm-green)]" />
          </span>
        </div>
        <h2 className="cm-font-display text-3xl tracking-[0.2em] text-[var(--cm-green)]">
          CASE CLOSED
        </h2>
        <p className="cm-font-mono mt-3 text-sm text-[var(--cm-ink-dim)]">
          Both detectives named{' '}
          <span className="font-bold text-[var(--cm-gold)]">{caseFile.culprit}</span> — and
          the evidence agreed.
        </p>
        <div className="mx-auto mt-5 max-w-xl rounded-lg border border-[var(--cm-border)] bg-black/30 p-4 text-left">
          <div className="cm-font-mono mb-2 text-xs tracking-[0.25em] text-[var(--cm-gold)]">
            THE CAPTAIN&apos;S SUMMARY
          </div>
          <Typewriter text={caseFile.solution} as="p" animate speed={12} className="text-sm leading-relaxed" />
        </div>
        <div className="cm-font-mono mt-5 text-sm">
          <span className="text-[var(--cm-gold)]">+{XP_AWARDS.mysterySolved} XP</span>
          <span className="text-[var(--cm-ink-dim)]"> · co-op win recorded</span>
        </div>
        <div className="mx-auto mt-6 max-w-xs">
          <button onClick={onNext} className="cm-btn-gold">
            📁 FILE THE NEXT CASE
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- failed ---------------- */

export function FailedView({
  caseFile,
  patch,
  onNext,
}: {
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  onNext: () => void;
}) {
  return (
    <div className="cm-section mx-auto max-w-2xl text-center">
      <div className="cm-panel">
        <div className="mb-4 flex justify-center text-[var(--cm-red)]">
          <Snowflake size={56} />
        </div>
        <h2 className="cm-font-display text-3xl tracking-[0.2em] text-[var(--cm-red)]">
          CASE GONE COLD
        </h2>
        <p className="mt-3 text-sm text-[var(--cm-ink-dim)]">
          Two wrong accusations. The captain shelved the file — the real culprit walked
          free… this time.
        </p>
        <div className="mx-auto mt-5 max-w-xl rounded-lg border border-[var(--cm-border)] bg-black/30 p-4 text-left">
          <div className="cm-font-mono mb-2 text-xs tracking-[0.25em] text-[var(--cm-gold)]">
            WHAT REALLY HAPPENED
          </div>
          <p className="text-sm leading-relaxed">
            The culprit was{' '}
            <span className="font-bold text-[var(--cm-gold)]">{caseFile.culprit}</span>.{' '}
            {caseFile.solution}
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              sounds.paperShuffle();
              patch({ phase: 'board', attempts: 0, votes: {}, doubted: false });
            }}
            className="cm-btn-red"
          >
            <RotateCcw size={14} /> REOPEN THE FILE
          </button>
          <button onClick={onNext} className="cm-btn-ghost">
            📁 Case files
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoubtBanner({ attempts }: { attempts: number }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-l-4 border-[var(--cm-red)] bg-[rgba(179,38,30,0.12)] px-4 py-2">
      <Gavel size={15} className="shrink-0 text-[var(--cm-red)]" />
      <p className="cm-font-mono text-xs text-[var(--cm-ink)]">
        The captain doubts you. One wrong accusation on the record — make the next one
        count. ({attemptsLeft(attempts)} {attemptsLeft(attempts) === 1 ? 'try' : 'tries'}{' '}
        left)
      </p>
    </div>
  );
}
