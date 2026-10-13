'use client';

/* Alibi — tiny LOCAL in-game chat (not a shared component).
 * Messages travel via room.send('alibi-chat', ...) and live only in tab state.
 */

import { useEffect, useRef, useState } from 'react';
import type { RoomApi } from '../../lib/realtime/useRoom';
import { sounds } from '../../lib/sound';

interface ChatMessage {
  from: string;
  name: string;
  text: string;
  timed?: boolean;
}

export default function ChatBox({ room, label }: { room: RoomApi; label: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = room.onAction('alibi-chat', (payload: any) => {
      if (payload.from === room.me.id) return;
      sounds.typewriterClick();
      setMessages((m) => [...m, { from: payload.from, name: payload.name, text: payload.text, timed: !!payload.timed }]);
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
    setMessages((m) => [...m, { from: room.me.id, name: room.me.name, text }]);
    room.send('alibi-chat', { from: room.me.id, name: room.me.name, text });
  };

  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.25)]">
      <div className="border-b border-[var(--glass-border)] px-4 py-2">
        <span className="eyebrow">💬 {label}</span>
      </div>
      <div className="h-44 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs italic text-[var(--gk-ink-faint)]">The wire is live. Every word is on the record.</p>
        )}
        {messages.map((m, i) => {
          const mine = m.from === room.me.id;
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${
                  m.timed
                    ? 'border border-[var(--blood-bright)] bg-[rgba(211,58,44,0.15)]'
                    : mine
                      ? 'bg-[rgba(232,163,61,0.18)]'
                      : 'bg-[rgba(255,255,255,0.06)]'
                } text-[var(--gk-ink)]`}
              >
                {m.timed && <span className="mr-1 text-xs">⏱️</span>}
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
          placeholder="On the record…"
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
