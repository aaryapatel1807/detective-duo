'use client';

/**
 * Co-op game views.
 *
 * Case Files co-op: each side sees only its own clues and its own
 * suspects' statements; red herrings are shared flavour. Pins,
 * accusations and hints live in the shared session state.
 *
 * Escape Rooms co-op: one side sees the room (objects + locks), the
 * other sees the notebook (every object's detail + each lock's
 * derivation). Roles swap with one tap.
 */
import { useState } from 'react';
import { BookOpen, Footprints, Pin, Search, Users } from 'lucide-react';
import type { CaseFile } from '@/lib/cases/types';
import type { CaseSide } from '@/lib/together/split';
import type { EscapeRoom, RoomLock } from '@/lib/generators/escapeRoom';

type CaseTab = 'story' | 'evidence' | 'suspects' | 'accuse';

export function CaseCoopView({
  c,
  side,
  partnerName,
  pinned,
  onTogglePin,
  accused,
  solved,
  solvedByName,
  wrongAccused,
  mistakes,
  revealedSteps,
  onHint,
  onAccuse,
  disabled,
}: {
  c: CaseFile;
  side: CaseSide;
  partnerName: string;
  pinned: string[];
  onTogglePin: (id: string) => void;
  accused: string | null;
  solved: boolean;
  solvedByName: string | null;
  wrongAccused: string[];
  mistakes: number;
  revealedSteps: number;
  onHint: () => void;
  onAccuse: (id: string) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<CaseTab>('story');
  const [asked, setAsked] = useState<string[]>([]);
  const myClues = c.clues.filter((cl) => side.clueIds.includes(cl.id));
  const mySuspects = new Set(side.suspectIds);

  const tabs: { id: CaseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'story', label: 'Story', icon: <BookOpen size={16} aria-hidden /> },
    { id: 'evidence', label: 'Your clues', icon: <Search size={16} aria-hidden /> },
    { id: 'suspects', label: 'Suspects', icon: <Users size={16} aria-hidden /> },
    { id: 'accuse', label: 'Accuse', icon: <Footprints size={16} aria-hidden /> },
  ];

  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        You see {myClues.length} of {c.clues.length} clues. {partnerName} sees the rest —
        talk to each other; neither side alone can prove it.
      </p>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Case sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? 'btn-primary' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {tab === 'story' && (
        <section className="paper mt-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold">{c.title}</h2>
          <p className="mt-1 text-sm opacity-70">{c.setting}</p>
          <p className="mt-3 leading-relaxed">{c.narrative}</p>
        </section>
      )}

      {tab === 'evidence' && (
        <section className="mt-4 space-y-2">
          <p className="text-sm text-[var(--ink-dim)]">
            Your clues (tap to pin — pins sync to your partner). Suspicious details are
            shared flavour, not proof.
          </p>
          {[...myClues.map((cl) => ({ id: cl.id, text: cl.text, kind: cl.kind, real: true })),
            ...c.redHerrings.map((h) => ({ id: h.id, text: h.text, kind: 'detail', real: false })),
          ].map((item) => {
            const isPinned = pinned.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className="card block w-full p-4 text-left"
                style={isPinned ? { outline: '2px solid var(--accent)' } : undefined}
                onClick={() => onTogglePin(item.id)}
                disabled={disabled}
                aria-pressed={isPinned}
              >
                <span className="flex items-start gap-2">
                  <Pin size={18} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <span className="text-sm font-semibold capitalize">{item.kind}</span>
                    <span className="mt-1 block">{item.text}</span>
                    {isPinned && <span className="text-sm font-semibold">Pinned</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {tab === 'suspects' && (
        <section className="mt-4 space-y-2">
          {c.suspects.map((s) => {
            const mine = mySuspects.has(s.id);
            const isAsked = asked.includes(s.id);
            return (
              <article key={s.id} className="card p-4">
                <h3 className="font-display text-lg font-bold">{s.name}</h3>
                <p className="text-sm text-[var(--ink-dim)]">{s.role}</p>
                {mine ? (
                  <>
                    <p className="mt-2"><span className="font-semibold">Alibi: </span>{s.alibi}</p>
                    {isAsked ? (
                      <p className="mt-2"><span className="font-semibold">Keeps quiet: </span>{s.secret}</p>
                    ) : (
                      <button type="button" className="btn mt-3" disabled={disabled} onClick={() => setAsked((a) => [...a, s.id])}>
                        Ask {s.name.split(' ')[0]}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--ink-dim)]">
                    Only {partnerName} can see this alibi — ask them about {s.name.split(' ')[0]}.
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}

      {tab === 'accuse' && (
        <section className="mt-4 space-y-2">
          <p className="text-sm text-[var(--ink-dim)]">
            Accusations are shared. A wrong name costs one mistake and nothing else.
          </p>
          {c.suspects.map((s) => (
            <button
              key={s.id}
              type="button"
              className="card block w-full p-4 text-left"
              disabled={disabled || solved}
              onClick={() => onAccuse(s.id)}
            >
              <span className="font-display text-lg font-bold">{s.name}</span>
              <span className="block text-sm text-[var(--ink-dim)]">{s.role}</span>
              {wrongAccused.includes(s.id) && (
                <span className="block text-sm font-semibold">Ruled out by accusation</span>
              )}
            </button>
          ))}
          {accused && !solved && (
            <p className="pt-1 text-sm font-semibold">
              That name does not fit the clues — keep talking, keep pinning.
            </p>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          onClick={onHint}
          disabled={disabled || solved || revealedSteps >= c.deductionPath.length}
        >
          Hint (free)
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Mistakes: {mistakes} · Pinned: {pinned.length}
      </p>
      {revealedSteps > 0 && (
        <section className="paper mt-4 p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold">Deduction so far</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            {c.deductionPath.slice(0, revealedSteps).map((step, i) => (
              <li key={`${step.clueId}-${i}`}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}
      {solved && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Case closed — together.</p>
          <p className="mt-1">
            The culprit was{' '}
            <strong>{c.suspects.find((s) => s.id === c.solution.culpritId)?.name}</strong>
            {solvedByName ? `, named by ${solvedByName}.` : '.'}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">{c.solution.explanation}</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-left">
            {c.deductionPath.map((step, i) => (
              <li key={`${step.clueId}-${i}`}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function EscapeCoopView({
  room,
  myRole,
  onSwapRole,
  inventory,
  openedLocks,
  inspected,
  onInspect,
  onTakeItem,
  onTryLock,
  escaped,
  disabled,
}: {
  room: EscapeRoom;
  myRole: 'room' | 'notebook';
  onSwapRole: () => void;
  inventory: string[];
  openedLocks: string[];
  inspected: string[];
  onInspect: (id: string) => void;
  onTakeItem: (item: 'key' | 'key2') => void;
  onTryLock: (lock: RoomLock, value: string) => void;
  escaped: boolean;
  disabled?: boolean;
}) {
  const [codeDraft, setCodeDraft] = useState<Record<string, string>>({});
  const [patternDraft, setPatternDraft] = useState<Record<string, string[]>>({});
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const tryLock = (lock: RoomLock) => {
    const value =
      lock.kind === 'pattern'
        ? (patternDraft[lock.id] ?? []).join(',')
        : codeDraft[lock.id] ?? '';
    const ok = Array.isArray(lock.solution)
      ? lock.solution.join(',') === value
      : lock.solution === value;
    setLockMsg(ok ? `${lock.label} opens.` : `That does not open ${lock.label}.`);
    if (ok) onTryLock(lock, value);
  };

  if (myRole === 'notebook') {
    return (
      <div>
        <p className="text-sm text-[var(--ink-dim)]">
          You hold the notebook: every object detail and every lock's derivation. Your
          partner sees the room itself. Read things out to each other.
        </p>
        <button type="button" className="btn mt-3" onClick={onSwapRole} disabled={disabled}>
          Swap roles
        </button>
        <section className="mt-4 space-y-2">
          {room.objects.map((o) => (
            <article key={o.id} className="card p-4">
              <h3 className="font-display text-lg font-bold">{o.name}</h3>
              <p className="mt-1">{o.detail}</p>
              {o.hidesItem && (
                <p className="mt-1 text-sm font-semibold">
                  This hides the {o.hidesItem === 'key' ? 'key' : 'second key'}.
                </p>
              )}
            </article>
          ))}
          <article className="card p-4">
            <h3 className="font-display text-lg font-bold">Wall symbols</h3>
            <p className="mt-1">{room.wallSymbols.join(' · ')}</p>
          </article>
          {room.locks.map((lock) => (
            <article key={lock.id} className="card p-4">
              <h3 className="font-display text-lg font-bold">{lock.label}</h3>
              <p className="mt-1 text-sm">{lock.derivation}</p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                {openedLocks.includes(lock.id) ? 'Opened.' : 'Still locked.'}
              </p>
            </article>
          ))}
        </section>
      </div>
    );
  }

  const selectedObj = room.objects.find((o) => o.id === selected);
  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        You see the room. Your partner holds the notebook with the derivations — ask
        them what each lock needs.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={onSwapRole} disabled={disabled}>
          Swap roles
        </button>
        <span className="chip">Carrying: {inventory.length ? inventory.join(', ') : 'nothing yet'}</span>
      </div>
      {escaped ? (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">You escaped — together.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Every lock opened, and the door swung wide.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-4 grid gap-2 sm:grid-cols-2">
            {room.objects.map((o) => (
              <button
                key={o.id}
                type="button"
                className="card p-4 text-left"
                style={inspected.includes(o.id) ? { outline: '2px solid var(--accent)' } : undefined}
                onClick={() => {
                  setSelected(o.id);
                  onInspect(o.id);
                }}
                disabled={disabled}
              >
                <span className="font-display text-lg font-bold">{o.label}</span>
                <span className="block text-sm text-[var(--ink-dim)]">
                  {inspected.includes(o.id) ? 'Inspected' : 'Tap to inspect'}
                </span>
              </button>
            ))}
          </section>
          {selectedObj && (
            <section className="panel mt-3 p-4">
              <h3 className="font-display text-lg font-bold">{selectedObj.name}</h3>
              <p className="mt-1">{selectedObj.detail}</p>
              {selectedObj.hidesItem && !inventory.includes(selectedObj.hidesItem) && (
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  disabled={disabled}
                  onClick={() => onTakeItem(selectedObj.hidesItem as 'key' | 'key2')}
                >
                  Take the {selectedObj.hidesItem === 'key' ? 'key' : 'second key'}
                </button>
              )}
            </section>
          )}
          <section className="mt-4 space-y-2">
            {room.locks.map((lock) => {
              if (openedLocks.includes(lock.id)) {
                return (
                  <p key={lock.id} className="panel p-4 text-sm font-semibold">
                    {lock.label} — open.
                  </p>
                );
              }
              if (lock.kind === 'key') {
                const need = lock.requiresItem ?? 'key';
                return (
                  <div key={lock.id} className="panel flex items-center justify-between gap-2 p-4">
                    <span className="font-semibold">{lock.label}</span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={disabled || !inventory.includes(need)}
                      onClick={() => onTryLock(lock, need)}
                    >
                      {inventory.includes(need) ? 'Use the key' : 'Needs a key'}
                    </button>
                  </div>
                );
              }
              if (lock.kind === 'door') {
                const othersOpen = room.locks
                  .filter((l) => l.kind !== 'door')
                  .every((l) => openedLocks.includes(l.id));
                return (
                  <div key={lock.id} className="panel flex items-center justify-between gap-2 p-4">
                    <span className="font-semibold">{lock.label}</span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={disabled || !othersOpen}
                      onClick={() => onTryLock(lock, 'door')}
                    >
                      {othersOpen ? 'Open the door' : 'Other locks first'}
                    </button>
                  </div>
                );
              }
              if (lock.kind === 'pattern') {
                const seq = patternDraft[lock.id] ?? [];
                return (
                  <div key={lock.id} className="panel p-4">
                    <p className="font-semibold">{lock.label}</p>
                    <p className="mt-1 text-sm text-[var(--ink-dim)]">
                      Pick the symbols in order: {seq.length ? seq.join(' → ') : 'none yet'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {room.wallSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          className="btn !px-2 !py-1 text-sm"
                          disabled={disabled}
                          onClick={() => setPatternDraft((d) => ({ ...d, [lock.id]: [...seq, sym] }))}
                        >
                          {sym}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn !px-2 !py-1 text-sm"
                        onClick={() => setPatternDraft((d) => ({ ...d, [lock.id]: [] }))}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary !px-2 !py-1 text-sm"
                        disabled={disabled || seq.length === 0}
                        onClick={() => tryLock(lock)}
                      >
                        Try
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={lock.id} className="panel p-4">
                  <p className="font-semibold">{lock.label}</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input flex-1"
                      value={codeDraft[lock.id] ?? ''}
                      onChange={(e) => setCodeDraft((d) => ({ ...d, [lock.id]: e.target.value }))}
                      inputMode="numeric"
                      placeholder="Enter the code"
                      aria-label={`${lock.label} code`}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={disabled || !(codeDraft[lock.id] ?? '').trim()}
                      onClick={() => tryLock(lock)}
                    >
                      Try
                    </button>
                  </div>
                </div>
              );
            })}
            {lockMsg && <p className="text-sm font-semibold">{lockMsg}</p>}
          </section>
        </>
      )}
    </div>
  );
}
