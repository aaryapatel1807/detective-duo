'use client';

/* Local in-game chat. Ephemeral by design: messages travel over
 * room.send('chat', ...) / room.onAction('chat', ...). The server
 * rebroadcasts to the whole room INCLUDING the sender, so we dedupe
 * by message id and mark our own messages locally.
 */

import { useEffect, useRef, useState } from 'react';
import type { RoomApi } from '../../lib/realtime/useRoom';
import { sounds } from '../../lib/sound';

interface ChatMsg {
  id: string;
  from: string;
  text: string;
  mine: boolean;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatBox({
  room,
  actionType = 'chat',
  quickPhrases = [],
  title = 'Field radio',
}: {
  room: RoomApi;
  actionType?: string;
  quickPhrases?: string[];
  title?: string;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const seen = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      room.onAction(actionType, (payload: unknown) => {
        const p = payload as { id?: string; from?: string; text?: string } | null;
        if (!p || typeof p.id !== 'string' || seen.current.has(p.id)) return;
        seen.current.add(p.id);
        setMsgs((prev) => [
          ...prev.slice(-49),
          { id: p.id as string, from: String(p.from ?? '???'), text: String(p.text ?? ''), mine: false },
        ]);
        sounds.typewriterClick();
      }),
    [room, actionType],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [msgs.length]);

  const sendText = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const id = makeId(room.me.id);
    seen.current.add(id);
    setMsgs((prev) => [
      ...prev.slice(-49),
      { id, from: room.me.name, text, mine: true },
    ]);
    room.send(actionType, { id, from: room.me.name, text });
    sounds.paperShuffle();
    setDraft('');
  };

  return (
    <div className="glass-card flex !rounded-2xl flex-col overflow-hidden">
      <div className="border-b border-[var(--glass-border)] px-4 py-2">
        <span className="eyebrow">📻 {title}</span>
      </div>
      <div className="flex h-44 flex-col gap-2 overflow-y-auto px-3 py-2">
        {msgs.length === 0 && (
          <p className="text-xs text-[var(--ink-faint)]">
            Radio silence. Coordinate with your partner here.
          </p>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${
              m.mine
                ? 'self-end bg-[rgba(232,163,61,0.18)] text-[var(--ink)]'
                : 'self-start bg-[rgba(255,255,255,0.07)] text-[var(--ink)]'
            }`}
          >
            <span className="mr-1 font-type text-[0.65rem] text-[var(--amber-glow)]">
              {m.mine ? 'YOU' : m.from.toUpperCase()}:
            </span>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {quickPhrases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          {quickPhrases.map((q) => (
            <button
              key={q}
              onClick={() => sendText(q)}
              className="rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-[0.7rem] text-[var(--ink-dim)] transition hover:border-[var(--amber-glow)] hover:text-[var(--ink)]"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-2 border-t border-[var(--glass-border)] p-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendText(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={200}
          className="noir-input min-w-0 flex-1 !py-2 text-sm"
        />
        <button type="submit" className="noir-btn !px-4 !py-2 text-sm">
          Send
        </button>
      </form>
    </div>
  );
}
