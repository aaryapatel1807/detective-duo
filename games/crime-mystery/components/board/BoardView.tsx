'use client';

/* Full-page board view: case drawer | pannable canvas | suspect dock.
 * Replaces the old two-column CasePanel/EvidenceBoard/SuspectCarousel trio. */

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import type { GameProps } from '../../../types';
import type { CaseFile, Clue } from '../../../../lib/content/cases';
import type { MysteryShared, Side } from '../../types';
import { sounds } from '../../../../lib/sound';
import { BoardCanvas } from './BoardCanvas';
import { CaseDrawer } from './CaseDrawer';
import { SuspectDock } from './SuspectDock';
import { DoubtBanner } from '../VerdictViews';

export function BoardView({
  room,
  gs,
  caseFile,
  patch,
  mySide,
  mine,
  sealedIds,
  caseIndex,
  practiceSide,
  setPracticeSide,
  onOpenSuspect,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  mySide: Side;
  mine: Clue[];
  sealedIds: string[];
  caseIndex: number;
  practiceSide: Side | null;
  setPracticeSide: (s: Side | null) => void;
  onOpenSuspect: (name: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(
    () => typeof window === 'undefined' || window.innerWidth >= 1024,
  );

  const addSticky = () => {
    const stickies = gs.stickies ?? [];
    sounds.pinTap();
    patch({
      stickies: [
        ...stickies,
        {
          id: `sticky-${Date.now()}`,
          text: '',
          pos: { x: 38 + Math.random() * 24, y: 40 + Math.random() * 16 },
          rotate: Math.random() * 6 - 3,
        },
      ],
    });
  };

  return (
    <div className="cm-boardview">
      <CaseDrawer
        caseFile={caseFile}
        caseIndex={caseIndex}
        clues={mine}
        sealedCount={sealedIds.length}
        stickiesCount={(gs.stickies ?? []).length}
        mySide={mySide}
        practiceSide={practiceSide}
        setPracticeSide={setPracticeSide}
        solo={room.peer === null}
        open={drawerOpen}
        onToggle={() => {
          sounds.typewriterClick();
          setDrawerOpen(!drawerOpen);
        }}
        onAddClue={addSticky}
      />

      <div className="cm-canvas-zone">
        {gs.doubted && (
          <div className="cm-doubt-float">
            <DoubtBanner attempts={gs.attempts ?? 0} />
          </div>
        )}
        <BoardCanvas
          caseFile={caseFile}
          gs={gs}
          patch={patch}
          mine={mine}
          onOpenSuspect={onOpenSuspect}
          onAddSticky={addSticky}
        />
        <SuspectDock suspects={caseFile.suspects} onInterrogate={onOpenSuspect} />
        {!drawerOpen && (
          <button
            className="cm-fab lg:hidden"
            onClick={() => {
              sounds.typewriterClick();
              setDrawerOpen(true);
            }}
            aria-label="Open case file"
            title="Case file"
          >
            <FolderOpen size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
