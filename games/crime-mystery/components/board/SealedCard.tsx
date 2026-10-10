'use client';

/* Sealed card: a partner's clue I can't see. Lock icon + one clearly
 * readable line on the dark card — strong contrast, text wraps, never clips. */

import { Lock } from 'lucide-react';

export function SealedVisual() {
  return (
    <div className="cm-card-sealed">
      <div className="cm-card-inner">
        <div className="cm-sealed-lock">
          <Lock size={20} />
          <span>SEALED</span>
        </div>
        <p className="cm-sealed-text">Partner&rsquo;s evidence &mdash; ask them about it</p>
      </div>
    </div>
  );
}
