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
import { CasePanel } from './components/CasePanel';
import { EvidenceBoard } from './components/EvidenceBoard';
import { SuspectCarousel } from './components/SuspectCarousel';
import { HypothesesView } from './components/HypothesesView';
import { NotesView } from './components/NotesView';
import { ProfileView } from './components/ProfileView';
import { AccuseView, SolvedView, FailedView, DoubtBanner } from './components/VerdictViews';

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
      className={`cm-root ${cinzel.variable} ${inter.variable} ${jetbrains.variable} ${caveat.variable}`}
    >
      <TopNav
        tab={tab}
        setTab={(t) => {
          sounds.typewriterClick();
          setTab(t);
        }}
        online={room.peer !== null}
        caseTitle={activeCase?.title}
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

  const addSticky = () => {
    const stickies = gs.stickies ?? [];
    sounds.pinTap();
    patch({
      stickies: [
        ...stickies,
        {
          id: `sticky-${Date.now()}`,
          text: '',
          pos: { x: 30 + Math.random() * 30, y: 35 + Math.random() * 20 },
          rotate: Math.random() * 6 - 3,
        },
      ],
    });
  };

  const scrollToLineup = () => {
    sounds.typewriterClick();
    document.getElementById('cm-lineup')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="cm-shell">
      {tab === 'cases' && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {room.peer === null && (
              <div className="flex overflow-hidden rounded-lg border border-[var(--cm-border)]">
                {(['a', 'b'] as Side[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPracticeSide(practiceSide === s ? null : s)}
                    className={`cm-font-mono px-3 py-1.5 text-xs ${
                      mySide === s
                        ? 'bg-[var(--cm-gold)] text-black'
                        : 'text-[var(--cm-ink-dim)]'
                    }`}
                    title="Practice: preview a side's deal"
                  >
                    {s === 'a' ? 'A-eyes' : 'B-eyes'}
                  </button>
                ))}
              </div>
            )}
            <span className="cm-font-mono text-xs text-[var(--cm-ink-dim)]">
              {room.peer
                ? `${room.me.name} sees ${mySide === 'a' ? 'A' : 'B'}-clues`
                : 'Solo practice'}
            </span>
            <span className="cm-font-mono ml-auto hidden text-xs italic text-[var(--cm-ink-dim)] sm:inline">
              “{caseFile.intro.split('.')[0]}.”
            </span>
          </div>

          {gs.doubted && <DoubtBanner attempts={gs.attempts ?? 0} />}

          <div className="cm-case-grid">
            <CasePanel
              caseFile={caseFile}
              clues={mine}
              sealedCount={sealedIds.length}
              stickiesCount={(gs.stickies ?? []).length}
              onAddClue={addSticky}
              onViewLineup={scrollToLineup}
              caseIndex={caseIndex}
            />
            <div className="min-w-0">
              <EvidenceBoard
                caseFile={caseFile}
                gs={gs}
                patch={patch}
                mySide={mySide}
                mine={mine}
                onOpenSuspect={onOpenSuspect}
                onAddClue={addSticky}
              />
              <SuspectCarousel
                caseFile={caseFile}
                onViewProfile={onOpenSuspect}
                id="cm-lineup"
              />
            </div>
          </div>
        </>
      )}

      {tab === 'hypotheses' && (
        <HypothesesView caseFile={caseFile} focusSuspect={focusSuspect} onAccuse={onAccuse} />
      )}

      {tab === 'notes' && (
        <NotesView room={room} gs={gs} caseFile={caseFile} patch={patch} />
      )}

      {tab === 'profile' && (
        <ProfileView roomLog={gs.log ?? {}} meName={room.me.name} />
      )}
    </div>
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
