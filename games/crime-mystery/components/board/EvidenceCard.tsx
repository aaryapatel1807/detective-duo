'use client';

/* Presentational card bodies for the evidence board canvas. The parent
 * (BoardCanvas) owns positioning + pointer drag; this only renders the
 * paper. Text always wraps inside the card and never overflows. */

import { Pencil, X } from 'lucide-react';
import type { CaseFile, Clue } from '../../../../lib/content/cases';
import type { BoardSticky, MysteryShared } from '../../types';

export type CardKind = 'clue' | 'suspect' | 'sticky';

export function CardVisual({
  kind,
  caseFile,
  clue,
  suspectName,
  sticky,
  stickies,
  mine,
  editing,
  setEditing,
  onDeleteSticky,
  patch,
}: {
  kind: CardKind;
  caseFile: CaseFile;
  clue?: Clue;
  suspectName?: string;
  sticky?: BoardSticky;
  stickies: BoardSticky[];
  /** whether this clue belongs to my side (false -> sealed handled elsewhere) */
  mine: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onDeleteSticky: () => void;
  patch: (p: MysteryShared) => void;
}) {
  if (kind === 'suspect') {
    const s = caseFile.suspects.find((x) => x.name === suspectName);
    if (!s) return null;
    return (
      <div className="cm-card-suspect">
        <div className="cm-card-inner cm-card-tilt">
          {s.portrait && <img src={s.portrait} alt={s.name} draggable={false} />}
          <div className="who">{s.name.toUpperCase()}</div>
        </div>
      </div>
    );
  }

  if (kind === 'sticky') {
    if (!sticky) return null;
    return (
      <div className="cm-card-sticky">
        <div className="cm-card-inner cm-card-tilt">
          {editing ? (
            <div onPointerDown={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={sticky.text}
                rows={3}
                onChange={(e) =>
                  patch({
                    stickies: stickies.map((x) =>
                      x.id === sticky.id ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
                className="cm-font-hand w-full bg-transparent text-[1.3rem] leading-tight text-[#3d3413] outline-none"
              />
              <button
                onClick={onDeleteSticky}
                className="mt-1 inline-flex items-center gap-1 text-xs text-red-800"
              >
                <X size={12} /> remove
              </button>
            </div>
          ) : (
            <div className="hand-text">
              <Pencil size={12} className="mb-1 opacity-50" />
              <div>{sticky.text || 'New lead…'}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // clue (mine — sealed clues render SealedVisual instead)
  const card = clue?.card ?? 'note';
  if (card === 'polaroid' && clue?.art) {
    return (
      <div className="cm-card-polaroid">
        <div className="cm-card-inner cm-card-tilt">
          <img
            className="evidence"
            src={clue.art}
            alt={clue.label ?? 'evidence'}
            draggable={false}
          />
          <div className="caption">{clue.label ?? ''}</div>
        </div>
      </div>
    );
  }
  if (card === 'report') {
    return (
      <div className="cm-card-report">
        <div className="cm-card-inner cm-card-tilt">
          <div className="cm-exhibit-tag">
            EXHIBIT · {(clue?.label ?? clue?.id ?? '').toUpperCase()}
          </div>
          <p className="cm-report-text">{clue?.text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="cm-card-note">
      <div className="cm-card-inner cm-card-tilt">
        <div className="cm-exhibit-tag">
          {(clue?.label ?? clue?.id ?? '').toUpperCase()}
        </div>
        <p className="hand-text">{clue?.text}</p>
      </div>
    </div>
  );
}
