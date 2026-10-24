/**
 * Shared bits for Duo Corner solo pages: level navigation header and
 * the win panel. Same look and copy shape as the Phase 1-4 games, so
 * the six new games feel like part of the same app.
 */
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { tierName } from '@/lib/generators/rng';

export function PlayHeader({
  title,
  intro,
  level,
  unlocked,
  onLevel,
  bestStars,
}: {
  title: string;
  intro: string;
  level: number;
  unlocked: number;
  onLevel: (l: number) => void;
  bestStars: number;
}) {
  return (
    <>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn !px-2 !py-2"
            disabled={level <= 1}
            onClick={() => onLevel(level - 1)}
            aria-label="Previous level"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span className="chip">
            Level {level} · {tierName(level)}
          </span>
          <button
            type="button"
            className="btn !px-2 !py-2"
            disabled={level >= unlocked}
            onClick={() => onLevel(level + 1)}
            aria-label="Next level"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-[var(--ink-dim)]">{intro}</p>
      {bestStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(bestStars)}
          {'☆'.repeat(3 - bestStars)}
        </p>
      )}
    </>
  );
}

export function WinPanel({
  stars,
  line,
  onNext,
}: {
  stars: number;
  line: string;
  onNext: () => void;
}) {
  return (
    <section className="card mt-4 p-5 text-center">
      <p className="font-display text-2xl font-bold">Lovely round.</p>
      <p className="mt-1 text-lg" aria-label={`${stars} of 3 stars`}>
        {'★'.repeat(stars)}
        <span className="opacity-40">{'★'.repeat(3 - stars)}</span>
      </p>
      <p className="text-sm text-[var(--ink-dim)]">{line}</p>
      <div className="mt-3 flex justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Next level
        </button>
        <Link href="/" className="btn">Home</Link>
      </div>
    </section>
  );
}
