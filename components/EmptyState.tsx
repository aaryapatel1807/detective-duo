'use client';

import Link from 'next/link';
import type { EmptyStateData } from '@/lib/emptyStates';

/** Renders an EmptyStateData object: heading, plain sentence, one action. Never a dead end. */
export default function EmptyState({ state, action }: { state: EmptyStateData; action?: React.ReactNode }) {
  return (
    <section className="panel p-4 sm:p-5">
      <p className="font-display text-lg font-bold">{state.title}</p>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">{state.body}</p>
      <div className="mt-3">
        {action ?? (
          <Link href={state.actionHref} className="btn btn-primary">
            {state.actionLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
