'use client';

/* Floating toolbar, centered at the top of the board. */

import { Maximize2, RotateCcw, Spline, StickyNote } from 'lucide-react';
import { sounds } from '../../../../lib/sound';

export function Toolbar({
  linkMode,
  linkSel,
  linksCount,
  onToggleLinkMode,
  onAddSticky,
  onFit,
  onReset,
}: {
  linkMode: boolean;
  linkSel: boolean;
  linksCount: number;
  onToggleLinkMode: () => void;
  onAddSticky: () => void;
  onFit: () => void;
  onReset: () => void;
}) {
  return (
    <div className="cm-toolbar" role="toolbar" aria-label="Board tools">
      <button
        onClick={() => {
          sounds.typewriterClick();
          onToggleLinkMode();
        }}
        className={linkMode ? 'cm-tool-btn active' : 'cm-tool-btn'}
        title="Link two cards with red string"
      >
        <Spline size={15} className="cm-string-icon" />
        <span>
          {linkMode ? (linkSel ? 'Tap another card…' : 'Linking… tap a card') : 'Link with red string'}
        </span>
        {linksCount > 0 && <span className="cm-tool-count">{linksCount}</span>}
      </button>
      <button
        onClick={() => {
          sounds.pinTap();
          onAddSticky();
        }}
        className="cm-tool-btn"
        title="Pin a sticky note"
      >
        <StickyNote size={15} />
        <span>Sticky note</span>
      </button>
      <button onClick={onFit} className="cm-tool-btn" title="Fit the whole board in view">
        <Maximize2 size={15} />
        <span>Fit to view</span>
      </button>
      <button
        onClick={() => {
          sounds.paperShuffle();
          onReset();
        }}
        className="cm-tool-btn"
        title="Reset card positions to the case default"
      >
        <RotateCcw size={15} />
        <span>Reset</span>
      </button>
    </div>
  );
}
