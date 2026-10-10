'use client';

/* Left case drawer: file header, tags, evidence progress, clue checklist,
 * add-clue button, A-eyes/B-eyes practice toggle.
 * Desktop: pinned in-flow panel (~320px), collapsible. Mobile: bottom sheet. */

import {
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  MapPin,
  Plus,
  ScrollText,
  StickyNote,
  Users,
  X,
} from 'lucide-react';
import type { CaseFile, Clue } from '../../../../lib/content/cases';
import type { Side } from '../../types';
import { sounds } from '../../../../lib/sound';

const CARD_ICON: Record<string, typeof FileText> = {
  polaroid: ImageIcon,
  note: StickyNote,
  report: ScrollText,
};

function DrawerBody({
  caseFile,
  caseIndex,
  clues,
  sealedCount,
  stickiesCount,
  mySide,
  practiceSide,
  setPracticeSide,
  solo,
  onAddClue,
}: {
  caseFile: CaseFile;
  caseIndex: number;
  clues: Clue[];
  sealedCount: number;
  stickiesCount: number;
  mySide: Side;
  practiceSide: Side | null;
  setPracticeSide: (s: Side | null) => void;
  solo: boolean;
  onAddClue: () => void;
}) {
  const total = clues.length + sealedCount;
  const pct = total === 0 ? 0 : Math.round((clues.length / total) * 100);

  return (
    <>
      <div className="cm-case-no">CASE FILE № {String(caseIndex + 1).padStart(2, '0')}</div>
      <h2 className="cm-case-title">{caseFile.title}</h2>
      {caseFile.location && (
        <div className="cm-loc">
          <MapPin size={14} />
          <span>{caseFile.location}</span>
        </div>
      )}

      <div className="cm-badges">
        <span className="cm-badge gold">
          <Users size={12} /> 2 PLAYERS
        </span>
        <span className="cm-badge">{caseFile.difficulty.toUpperCase()}</span>
        <span className="cm-badge">{caseFile.suspects.length} SUSPECTS</span>
      </div>

      <div className="cm-progress">
        <div className="cm-progress-label">
          <span>EVIDENCE GATHERED</span>
          <span>{pct}%</span>
        </div>
        <div className="cm-progress-track">
          <div className="cm-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {solo && (
        <div className="mb-3">
          <div className="cm-font-mono mb-1.5 text-[0.62rem] tracking-[0.2em] text-[var(--cm-ink-dim)]">
            SOLO PRACTICE — VIEWING {mySide === 'a' ? 'A' : 'B'}-CLUES
          </div>
          <div className="flex overflow-hidden rounded-lg border border-[var(--cm-border)]">
            {(['a', 'b'] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  sounds.typewriterClick();
                  setPracticeSide(practiceSide === s ? null : s);
                }}
                className={`cm-font-mono flex-1 px-3 py-1.5 text-xs ${
                  mySide === s ? 'bg-[var(--cm-gold)] text-black' : 'text-[var(--cm-ink-dim)]'
                }`}
              >
                {s === 'a' ? 'A-eyes' : 'B-eyes'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cm-clue-list">
        {clues.map((c) => {
          const Icon = CARD_ICON[c.card ?? 'note'] ?? FileText;
          return (
            <div key={c.id} className="cm-clue-row">
              <Icon size={15} />
              <span className="lbl">{c.label ?? c.id.toUpperCase()}</span>
            </div>
          );
        })}
        {sealedCount > 0 && (
          <div className="cm-clue-row sealed">
            <FileText size={15} />
            <span className="lbl">{sealedCount} SEALED — ASK YOUR PARTNER</span>
          </div>
        )}
        {stickiesCount > 0 && (
          <div className="cm-clue-row">
            <StickyNote size={15} />
            <span className="lbl">
              {stickiesCount} FIELD NOTE{stickiesCount === 1 ? '' : 'S'}
            </span>
          </div>
        )}
      </div>

      <button
        className="cm-btn-gold"
        onClick={() => {
          sounds.pinTap();
          onAddClue();
        }}
      >
        <Plus size={15} /> ADD NEW CLUE
      </button>
    </>
  );
}

export function CaseDrawer({
  open,
  onToggle,
  caseFile,
  caseIndex,
  clues,
  sealedCount,
  stickiesCount,
  mySide,
  practiceSide,
  setPracticeSide,
  solo,
  onAddClue,
}: {
  caseFile: CaseFile;
  caseIndex: number;
  clues: Clue[];
  sealedCount: number;
  stickiesCount: number;
  mySide: Side;
  practiceSide: Side | null;
  setPracticeSide: (s: Side | null) => void;
  solo: boolean;
  open: boolean;
  onToggle: () => void;
  onAddClue: () => void;
}) {
  const body = (
    <DrawerBody
      caseFile={caseFile}
      caseIndex={caseIndex}
      clues={clues}
      sealedCount={sealedCount}
      stickiesCount={stickiesCount}
      mySide={mySide}
      practiceSide={practiceSide}
      setPracticeSide={setPracticeSide}
      solo={solo}
      onAddClue={onAddClue}
    />
  );

  return (
    <>
      {/* Desktop: pinned in-flow panel */}
      <aside className={`cm-drawer max-lg:hidden ${open ? '' : 'cm-drawer-shut'}`}>
        {open ? (
          <div className="cm-panel cm-drawer-inner">
            <button
              className="cm-drawer-x"
              onClick={onToggle}
              aria-label="Collapse case file panel"
              title="Collapse panel"
            >
              <ChevronLeft size={16} />
            </button>
            {body}
          </div>
        ) : null}
      </aside>
      {!open && (
        <button
          className="cm-drawer-rail max-lg:hidden"
          onClick={onToggle}
          title="Open case file panel"
        >
          <span className="cm-font-mono">CASE FILE</span>
        </button>
      )}

      {/* Mobile: bottom sheet */}
      {open && (
        <div className="cm-sheet-backdrop lg:hidden" onClick={onToggle}>
          <div
            className="cm-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Case file"
          >
            <div className="cm-sheet-handle" />
            <button className="cm-sheet-x" onClick={onToggle} aria-label="Close case file">
              <X size={16} />
            </button>
            <div className="cm-panel cm-sheet-body">{body}</div>
          </div>
        </div>
      )}
    </>
  );
}
