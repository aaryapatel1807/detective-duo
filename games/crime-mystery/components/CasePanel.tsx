'use client';

/* Left case panel: title, location, badges, progress, clue checklist,
 * ADD NEW CLUE button, and the suspect-lineup mini card. */

import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  MapPin,
  Plus,
  ScrollText,
  StickyNote,
  Target,
  Users,
} from 'lucide-react';
import type { CaseFile, Clue } from '../../../lib/content/cases';

const CARD_ICON: Record<string, typeof FileText> = {
  polaroid: ImageIcon,
  note: StickyNote,
  report: ScrollText,
};

export function CasePanel({
  caseFile,
  clues,
  sealedCount,
  stickiesCount,
  onAddClue,
  onViewLineup,
  caseIndex,
}: {
  caseFile: CaseFile;
  /** clues visible to me (checklist rows) */
  clues: Clue[];
  /** how many clues are sealed (partner's) */
  sealedCount: number;
  stickiesCount: number;
  onAddClue: () => void;
  onViewLineup: () => void;
  caseIndex: number;
}) {
  const total = clues.length + sealedCount;
  const pct = total === 0 ? 0 : Math.round((clues.length / total) * 100);

  return (
    <aside className="cm-panel">
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
            <span className="lbl">{stickiesCount} FIELD NOTE{stickiesCount === 1 ? '' : 'S'}</span>
          </div>
        )}
      </div>

      <button className="cm-btn-gold" onClick={onAddClue}>
        <Plus size={15} /> ADD NEW CLUE
      </button>

      <button className="cm-lineup" onClick={onViewLineup}>
        <span className="target">
          <Target size={17} />
        </span>
        <div>
          <div className="cm-font-display text-[0.8rem] tracking-[0.12em]">SUSPECT LINEUP</div>
          <div className="cm-avatars mt-1">
            {caseFile.suspects.map((s) =>
              s.portrait ? (
                <img key={s.name} src={s.portrait} alt={s.name} loading="lazy" />
              ) : null,
            )}
          </div>
        </div>
        <ChevronRight size={18} className="chev" />
      </button>
    </aside>
  );
}
