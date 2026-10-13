'use client';

/* Spot the Liar — tiny LOCAL in-game chat (not a shared component).
 * Messages travel via room.send('stl-chat', ...) and live only in tab state.
 */

import { useEffect, useRef, useState } from 'react';
import type { RoomApi } from '../../lib/realtime/useRoom';
import type { ChatMessage } from './types';
import { sounds } from '../../lib/sound';

interface Props {
  room: RoomApi;
  /** local phase label, e.g. "Cross-examination" */
  label: string;
}

export default function ChatBox({ room, label }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = room.onAction('stl-chat', (payload: any) => {
      if (payload.from === room.me.id) return; // we already appended our own
      sounds.typewriterClick();
      setMessages((m) => [...m, { from: payload.from, name: payload.name, text: payload.text, at: Date.now() }]);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMessages((m) => [...m, { from: room.me.id, name: room.me.name, text, at: Date.now() }]);
    room.send('stl-chat', { from: room.me.id, name: room.me.name, text });
  };

  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.25)]">
      <div className="border-b border-[var(--glass-border)] px-4 py-2">
        <span className="eyebrow">💬 {label}</span>
      </div>
      <div className="h-44 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs italic text-[var(--gk-ink-faint)]">The wire is live. Ask anything — the liar is sweating.</p>
        )}
        {messages.map((m, i) => {
          const mine = m.from === room.me.id;
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${
                  mine
                    ? 'bg-[rgba(232,163,61,0.18)] text-[var(--gk-ink)]'
                    : 'bg-[rgba(255,255,255,0.06)] text-[var(--gk-ink)]'
                }`}
              >
                <span className="mr-2 text-[0.65rem] uppercase tracking-wider text-[var(--gk-ink-faint)]">{m.name}</span>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-[var(--glass-border)] p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type to interrogate…"
          className="noir-input flex-1 !py-1.5 !text-sm"
          maxLength={240}
        />
        <button onClick={send} className="noir-btn !px-4 !py-1.5 !text-sm" disabled={!draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
