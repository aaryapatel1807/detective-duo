'use client';

/* Wordle — solo file. Six tries to crack the 5-letter code word.
 * Physical keyboard + on-screen keyboard. Streak persists locally.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { readJSON, writeJSON } from '../../lib/store';
import { sounds } from '../../lib/sound';
import {
  MAX_TRIES,
  WORD_LEN,
  evaluateGuess,
  isFiveLetters,
  mergeMark,
  pickAnswer,
  type LetterMark,
} from './logic';
import type { WordleRow, WordleStats } from './types';
import '../ui-kit/kit.css';
import { GameButton, ProgressBar, ResultModal, SectionTitle, type GameCardState } from '../ui-kit';

const STATS_KEY = 'dd-solo-wordle';

const MARK_BG: Record<LetterMark, string> = {
  correct: 'rgba(106,170,100,0.85)',
  present: 'rgba(232,163,61,0.8)',
  absent: 'rgba(90,90,100,0.55)',
};

const MARK_STATE: Record<LetterMark, GameCardState> = {
  correct: 'correct',
  present: 'misplaced',
  absent: 'absent',
};

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const blankStats: WordleStats = { played: 0, won: 0, streak: 0 };

export default function WordleGame({ room }: GameProps) {
  const [answer, setAnswer] = useState(() => pickAnswer());
  const [rows, setRows] = useState<WordleRow[]>([]);
  const [current, setCurrent] = useState('');
  const [keyMarks, setKeyMarks] = useState<Record<string, LetterMark>>({});
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [stats, setStats] = useState<WordleStats>(() => readJSON<WordleStats>(STATS_KEY, blankStats));
  const [error, setError] = useState('');
  const awardedRef = useRef(false);
  const answerRef = useRef(answer);
  answerRef.current = answer;

  const finishGame = useCallback(
    (wonGame: boolean) => {
      setStatus(wonGame ? 'won' : 'lost');
      setStats((s) => {
        const next: WordleStats = {
          played: s.played + 1,
          won: s.won + (wonGame ? 1 : 0),
          streak: wonGame ? s.streak + 1 : 0,
        };
        writeJSON(STATS_KEY, next);
        return next;
      });
      if (wonGame && !awardedRef.current) {
        awardedRef.current = true;
        awardXP(XP_AWARDS.soloWin);
        syncXpToRoom(room.setShared, room.me.id, room.me.name);
        sounds.xpTick();
      }
      if (wonGame) sounds.stampThud();
    },
    [room],
  );

  const submit = useCallback(() => {
    if (status !== 'playing') return;
    if (current.length !== WORD_LEN) {
      setError('Not enough letters');
      return;
    }
    if (!isFiveLetters(current)) {
      setError('Letters only, detective');
      return;
    }
    const word = current.toUpperCase();
    const marks = evaluateGuess(answerRef.current, word);
    sounds.typewriterClick();
    setRows((r) => [...r, { word, marks }]);
    setKeyMarks((km) => {
      const next = { ...km };
      word.split('').forEach((ch, i) => {
        next[ch] = mergeMark(next[ch], marks[i]);
      });
      return next;
    });
    setCurrent('');
    setError('');
    if (word === answerRef.current) {
      finishGame(true);
    } else if (rows.length + 1 >= MAX_TRIES) {
      finishGame(false);
    }
  }, [current, status, rows.length, finishGame]);

  const press = useCallback(
    (key: string) => {
      if (status !== 'playing') return;
      if (key === 'ENTER') {
        submit();
        return;
      }
      if (key === 'BACK') {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(key) && current.length < WORD_LEN) {
        setCurrent((c) => c + key.toUpperCase());
        sounds.pinTap();
      }
    },
    [current, status, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') press('ENTER');
      else if (e.key === 'Backspace') press('BACK');
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const newCase = () => {
    awardedRef.current = false;
    setAnswer(pickAnswer());
    setRows([]);
    setCurrent('');
    setKeyMarks({});
    setStatus('playing');
    setError('');
    sounds.paperShuffle();
  };

  const gridRows: (WordleRow | null)[] = [...rows];
  while (gridRows.length < MAX_TRIES) gridRows.push(null);

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-md">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="CODE WORD" title="Wordle" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Guess the 5-letter code word in {MAX_TRIES} tries. Streak: {stats.streak} 🔥
        </p>
      </div>

      <div className="mb-4">
        <ProgressBar label="ATTEMPTS" value={rows.length} max={MAX_TRIES} showNumbers={false} />
      </div>

      <GlassCard className="p-4">
        <div className="grid gap-1.5">
          {gridRows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: WORD_LEN }, (_, ci) => {
                const letter = row ? row.word[ci] : ri === rows.length ? current[ci] ?? '' : '';
                const mark = row ? row.marks[ci] : null;
                const gkState: GameCardState = mark
                  ? MARK_STATE[mark]
                  : letter
                    ? 'active'
                    : 'empty';
                return (
                  <motion.div
                    key={ci}
                    initial={row ? { rotateX: 90 } : false}
                    animate={{ rotateX: 0 }}
                    transition={{ delay: row ? ci * 0.08 : 0, duration: 0.3 }}
                    className={`gk-card gk-card--${gkState} aspect-square !text-2xl`}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {error && status === 'playing' && (
          <p className="mt-2 text-center text-sm text-[var(--blood-bright)]">{error}</p>
        )}
      </GlassCard>

      <div className="mt-4 space-y-1.5">
        {KEY_ROWS.map((kr) => (
          <div key={kr} className="flex justify-center gap-1.5">
            {kr === 'ZXCVBNM' && (
              <GameButton
                variant="ghost"
                size="sm"
                onClick={() => press('ENTER')}
                ariaLabel="Enter"
                className="flex-none !px-2.5 !min-h-[44px]"
              >
                ⏎
              </GameButton>
            )}
            {kr.split('').map((ch) => (
              <button
                key={ch}
                onClick={() => press(ch)}
                className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold"
                style={{
                  background: keyMarks[ch] ? MARK_BG[keyMarks[ch]] : 'rgba(255,255,255,0.06)',
                  color: keyMarks[ch] ? '#14100c' : 'var(--ink)',
                }}
              >
                {ch}
              </button>
            ))}
            {kr === 'ZXCVBNM' && (
              <GameButton
                variant="ghost"
                size="sm"
                onClick={() => press('BACK')}
                ariaLabel="Backspace"
                className="flex-none !px-2.5 !min-h-[44px]"
              >
                ⌫
              </GameButton>
            )}
          </div>
        ))}
      </div>

      <ResultModal
        open={status === 'won'}
        eyebrow="CODE WORD"
        headline="Code Cracked"
        tone="win"
        stat={`CRACKED IN ${rows.length} ${rows.length === 1 ? 'TRY' : 'TRIES'} · STREAK ${stats.streak} · +${XP_AWARDS.soloWin} XP`}
        primaryLabel="New code word"
        onPrimary={newCase}
      />

      <ResultModal
        open={status === 'lost'}
        eyebrow="CODE WORD"
        headline="Trail Cold"
        tone="lose"
        stat={`THE WORD WAS ${answer}`}
        primaryLabel="New code word"
        onPrimary={newCase}
      />
    </div>
  );
}
