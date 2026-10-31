'use client';

/**
 * StickyActionBar: the ONE pattern for primary controls that must stay
 * reachable without scrolling. Pinned to the bottom of the viewport
 * (safe-area aware), showing the current primary action(s) for the
 * game's current phase plus a short status line. It never owns game
 * logic: every action calls a handler the page already has, with the
 * page's own disabled state, so the in-page button and the bar can
 * never disagree. Pages render it as the last element inside <main>;
 * the spacer it renders keeps the bar from covering the last content,
 * buttons, or win panel. No animation, so prefers-reduced-motion needs
 * no special case.
 */
import type { ReactNode } from 'react';

export interface StickyAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

export default function StickyActionBar({
  status,
  actions,
  children,
  spacerPx = 92,
}: {
  status?: string;
  actions: StickyAction[];
  children?: ReactNode;
  spacerPx?: number;
}) {
  if (actions.length === 0 && !children) return null;
  return (
    <>
      <div aria-hidden style={{ height: spacerPx }} />
      <div
        className="fixed inset-x-0 bottom-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 pb-3">
          <div className="panel flex flex-col gap-2 p-2 shadow-xl">
            {status && (
              <p className="px-1 text-center text-sm font-semibold">{status}</p>
            )}
            {children}
            {actions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className={`btn min-h-[48px] flex-1 ${a.primary ? 'btn-primary' : ''}`}
                    disabled={a.disabled}
                    onClick={a.onClick}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
