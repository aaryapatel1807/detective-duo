'use client';

/* Love Notes — sealed notes with wax-seal UI.
 * Notes unlock after co-op wins (localStorage 'dd-coop-wins').
 * A note with unlockWins: 0 opens immediately; otherwise it stays sealed
 * until the duo's co-op win count reaches the threshold.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { WaxSeal } from '../../components/WaxSeal';
import {
  getCoopWins,
  readNotes,
  saveNotes,
  readSurprises,
  openSurprise,
  type LoveNote,
  type UnlockedSurprise,
} from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

export default function LoveNotesPage() {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [surprises, setSurprises] = useState<UnlockedSurprise[]>([]);
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [unlockWins, setUnlockWins] = useState(1);
  const wins = getCoopWins();

  useEffect(() => {
    setNotes(readNotes());
    setSurprises(readSurprises());
  }, []);

  const save = (next: LoveNote[]) => {
    setNotes(next);
    saveNotes(next);
  };

  const sealNote = () => {
    if (!text.trim()) return;
    sounds.stampThud();
    const note: LoveNote = {
      id: Math.random().toString(36).slice(2, 10),
      to: to.trim() || 'Partner',
      text: text.trim(),
      createdAt: Date.now(),
      unlockWins,
      opened: false,
    };
    save([note, ...notes]);
    setTo('');
    setText('');
    setUnlockWins(1);
  };

  const breakSeal = (id: string) => {
    sounds.paperShuffle();
    save(notes.map((n) => (n.id === id ? { ...n, opened: true } : n)));
  };

  const openSurpriseSeal = (id: string) => {
    sounds.stampThud();
    openSurprise(id);
    setSurprises(readSurprises());
  };

  const remove = (id: string) => save(notes.filter((n) => n.id !== id));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Typewriter text="Love Notes" as="h1" className="text-2xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Sealed with wax. Notes unlock after co-op victories —{' '}
          <span className="font-type text-[var(--amber-glow)]">{wins} won so far</span>.
        </p>
      </div>

      <GlassCard className="p-6">
        <div className="eyebrow mb-3">Write a sealed note</div>
        <div className="grid gap-3">
          <input
            className="noir-input"
            placeholder="To… (partner's name)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <textarea
            className="noir-input min-h-[110px] resize-y"
            placeholder="Pour your heart out, detective…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-type text-[0.72rem] tracking-[0.14em] uppercase text-[var(--ink-dim)]">
              Unlock after
              <select
                className="noir-input ml-2 !w-auto"
                value={unlockWins}
                onChange={(e) => setUnlockWins(Number(e.target.value))}
              >
                <option value={0}>0 co-op wins (now)</option>
                <option value={1}>1 co-op win</option>
                <option value={3}>3 co-op wins</option>
                <option value={5}>5 co-op wins</option>
              </select>
            </label>
            <button onClick={sealNote} className="noir-btn ml-auto">
              Seal it 💌
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {notes.map((n) => {
            const unlocked = wins >= n.unlockWins;
            const sealed = !n.opened;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <GlassCard className="relative min-h-[190px] p-5">
                  <button
                    onClick={() => remove(n.id)}
                    className="absolute right-3 top-3 text-[var(--ink-faint)] hover:text-[var(--blood-bright)]"
                    title="Discard note"
                  >
                    ✕
                  </button>
                  <div className="eyebrow">To: {n.to}</div>
                  {sealed ? (
                    <div className="flex flex-col items-center py-4">
                      <WaxSeal size={64} />
                      <div className="font-type mt-3 text-[0.72rem] tracking-[0.18em] uppercase text-[var(--ink-dim)]">
                        {unlocked ? 'Sealed — tap to open' : `Sealed · unlocks at ${n.unlockWins} co-op win${n.unlockWins === 1 ? '' : 's'}`}
                      </div>
                      {unlocked && (
                        <button onClick={() => breakSeal(n.id)} className="noir-btn-ghost mt-3 !py-2">
                          Break the seal
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="font-type mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                      {n.text}
                    </p>
                  )}
                  <div className="mt-3 font-type text-[0.62rem] text-[var(--ink-faint)]">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {notes.length === 0 && (
        <p className="text-center font-type text-[0.72rem] tracking-[0.2em] uppercase text-[var(--ink-faint)]">
          No notes yet — seal the first one above.
        </p>
      )}

      {/* Wax-sealed surprises — one unlocked per co-op win */}
      <div className="pt-2">
        <Typewriter text="Sealed Surprises" as="h2" className="text-xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Every co-op victory unlocks a wax-sealed surprise. Break the seal, detective.
        </p>
      </div>
      {surprises.length === 0 ? (
        <p className="text-center font-type text-[0.72rem] tracking-[0.2em] uppercase text-[var(--ink-faint)]">
          No surprises yet — win a co-op case together to earn one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence>
            {surprises.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <GlassCard className="relative min-h-[150px] p-5">
                  <div className="eyebrow">Field reward</div>
                  {s.opened ? (
                    <p className="font-type mt-3 text-sm leading-relaxed">{s.text}</p>
                  ) : (
                    <div className="flex flex-col items-center py-3">
                      <WaxSeal size={56} />
                      <button
                        onClick={() => openSurpriseSeal(s.id)}
                        className="noir-btn-ghost mt-3 !py-2"
                      >
                        Break the seal
                      </button>
                    </div>
                  )}
                  <div className="mt-3 font-type text-[0.62rem] text-[var(--ink-faint)]">
                    {new Date(s.unlockedAt).toLocaleDateString()}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
