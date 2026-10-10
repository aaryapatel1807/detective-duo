'use client';

/* FLAGSHIP — The Crime Mystery, noir evidence-board edition.
 *
 * Co-op asymmetric deduction: both detectives get the same case file, but
 * different clues (split 'a' / 'b' / 'both'). They MUST talk. Evidence board
 * with draggable polaroids + red strings (synced via room.shared), scripted
 * suspect interrogations, Field Intel hint tokens (fed by Cipher Breaker),
 * and a secret dual vote on the culprit.
 *
 * State lives in room.shared.games['crime-mystery'] (see types.ts).
 * framer-motion v10: animate wrapper divs only, never motion(Component).
 * Theme is scoped under .cm-root (noir.css) — the rest of the app is untouched.
 */

import { useState } from 'react';
import { Cinzel, Inter, JetBrains_Mono, Caveat } from 'next/font/google';
import './noir.css';
import type { GameProps } from '../types';
import { getMysteryCase, ALL_CASES } from './cases';
import {
  assignSides,
  sideOf,
  defaultPins,
  visibleClues,
} from './logic';
import type { MysteryShared, Side } from './types';
import type { CaseFile } from '../../lib/content/cases';
import { sounds } from '../../lib/sound';
import { TopNav, type MysteryTab } from './components/TopNav';
import { CaseSelect } from './components/CaseSelect';
import { BoardView } from './components/board/BoardView';
import { HypothesesView } from './components/HypothesesView';
import { NotesView } from './components/NotesView';
import { ProfileView } from './components/ProfileView';
import { AccuseView, SolvedView, FailedView } from './components/VerdictViews';

const SLUG = 'crime-mystery';

const cinzel = Cinzel({ subsets: ['latin'], variable: '--cm-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--cm-body', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--cm-mono', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], variable: '--cm-hand', display: 'swap' });

export default function CrimeMysteryGame({ room }: GameProps) {
  const gs: MysteryShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.caseId ? gs.phase ?? 'board' : 'select';
  const activeCase = gs.caseId ? getMysteryCase(gs.caseId) : undefined;

  const [tab, setTab] = useState<MysteryTab>('cases');
  const [focusSuspect, setFocusSuspect] = useState<string | null>(null);
  const boardFullbleed = phase === 'board' && tab === 'cases' && !!activeCase;
  const lobbyHref = room.roomCode ? `/room/${room.roomCode}` : '/';

  const patch = (p: MysteryShared) =>
    room.setShared({ games: { [SLUG]: p } } as Record<string, unknown>);

  const startCase = (c: CaseFile) => {
    const partnerId = room.peer ? room.peer.id : null;
    const sides = assignSides(room.me.id, partnerId);
    const pins = defaultPins(c.clues);
    sounds.paperShuffle();
    setTab('cases');
    setFocusSuspect(null);
    patch({
      caseId: c.id,
      phase: 'board',
      sides,
      pins,
      links: [],
      votes: {},
      attempts: 0,
      doubted: false,
      hintsUsed: 0,
      bonusRevealed: false,
      nudgesShown: [],
      awarded: {},
      stickies: [],
      notepad: '',
    });
  };

  const backToFiles = () => {
    sounds.paperShuffle();
    setTab('cases');
    patch({
      caseId: null,
      phase: 'select',
      votes: {},
      links: [],
      pins: {},
      attempts: 0,
      doubted: false,
      hintsUsed: 0,
      bonusRevealed: false,
      nudgesShown: [],
      awarded: {},
      stickies: [],
    });
  };

  const openSuspect = (name: string) => {
    setFocusSuspect(name);
    setTab('hypotheses');
  };

  return (
    <div
      className={`cm-root ${boardFullbleed ? 'cm-fullbleed' : ''} ${cinzel.variable} ${inter.variable} ${jetbrains.variable} ${caveat.variable}`}
    >
      <TopNav
        tab={tab}
        setTab={(t) => {
          sounds.typewriterClick();
          setTab(t);
        }}
        online={room.peer !== null}
        caseTitle={activeCase?.title}
        lobbyHref={lobbyHref}
      />

      {phase === 'select' && (
        <CaseSelect
          onStart={startCase}
          roomLog={gs.log ?? {}}
          peerName={room.peer?.name ?? null}
        />
      )}

      {phase === 'board' && activeCase && (
        <CaseWorkspace
          room={room}
          gs={gs}
          caseFile={activeCase}
          patch={patch}
          tab={tab}
          focusSuspect={focusSuspect}
          onOpenSuspect={openSuspect}
          onAccuse={() => {
            sounds.paperShuffle();
            patch({ phase: 'accuse', votes: {} });
          }}
        />
      )}

      {phase === 'board' && !activeCase && (
        <EmptyTabState onBrowse={backToFiles} />
      )}

      {phase === 'accuse' && activeCase && (
        <AccuseView room={room} gs={gs} caseFile={activeCase} patch={patch} />
      )}

      {phase === 'solved' && activeCase && (
        <SolvedView room={room} gs={gs} caseFile={activeCase} patch={patch} onNext={backToFiles} />
      )}

      {phase === 'failed' && activeCase && (
        <FailedView caseFile={activeCase} patch={patch} onNext={backToFiles} />
      )}
    </div>
  );
}

/* ============================ CASE WORKSPACE ============================ */

function CaseWorkspace({
  room,
  gs,
  caseFile,
  patch,
  tab,
  focusSuspect,
  onOpenSuspect,
  onAccuse,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
  tab: MysteryTab;
  focusSuspect: string | null;
  onOpenSuspect: (name: string) => void;
  onAccuse: () => void;
}) {
  // Solo practice: let one player flip sides to see the partner's deal.
  const [practiceSide, setPracticeSide] = useState<Side | null>(null);
  const mySide: Side = practiceSide ?? sideOf(gs.sides, room.me.id);
  const mine = visibleClues(caseFile, mySide, gs.bonusRevealed ?? false);
  const mineIds = new Set(mine.map((c) => c.id));
  const sealedIds = caseFile.clues.filter((c) => !mineIds.has(c.id)).map((c) => c.id);
  const caseIndex = Math.max(0, ALL_CASES.findIndex((c) => c.id === caseFile.id));

  return (
    <>
      {tab === 'cases' && (
        <BoardView
          room={room}
          gs={gs}
          caseFile={caseFile}
          patch={patch}
          mySide={mySide}
          mine={mine}
          sealedIds={sealedIds}
          caseIndex={caseIndex}
          practiceSide={practiceSide}
          setPracticeSide={setPracticeSide}
          onOpenSuspect={onOpenSuspect}
        />
      )}

      {tab === 'hypotheses' && (
        <div className="cm-shell">
          <HypothesesView caseFile={caseFile} focusSuspect={focusSuspect} onAccuse={onAccuse} />
        </div>
      )}

      {tab === 'notes' && (
        <div className="cm-shell">
          <NotesView room={room} gs={gs} caseFile={caseFile} patch={patch} />
        </div>
      )}

      {tab === 'profile' && (
        <div className="cm-shell">
          <ProfileView roomLog={gs.log ?? {}} meName={room.me.name} />
        </div>
      )}
    </>
  );
}

function EmptyTabState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="cm-section mx-auto max-w-md text-center">
      <div className="cm-panel">
        <div className="cm-font-display text-lg tracking-[0.12em] text-[var(--cm-gold)]">
          NO OPEN FILE
        </div>
        <p className="mt-2 text-sm text-[var(--cm-ink-dim)]">
          Open a case file first — the precinct keeps everything else under lock and key.
        </p>
        <div className="mx-auto mt-4 max-w-xs">
          <button className="cm-btn-gold" onClick={onBrowse}>
            📁 BROWSE CASE FILES
          </button>
        </div>
      </div>
    </div>
  );
}
