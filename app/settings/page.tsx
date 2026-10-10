'use client';

/* Settings — both names, accent colors, photo uploads (dataURL in
 * localStorage), custom trivia questions ("about each other").
 * Noir defaults. No code changes needed.
 */

import { useEffect, useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { useRoom } from '../../lib/realtime/useRoom';
import { readStr, writeStr } from '../../lib/store';
import { readCustomTrivia, saveCustomTrivia, type CustomTrivia } from '../../lib/content/trivia';
import {
  ACCENT_ME_KEY,
  ACCENT_PARTNER_KEY,
  DEFAULT_ACCENT,
  PARTNER_NAME_KEY,
  PHOTO_ME_KEY,
  PHOTO_PARTNER_KEY,
} from '../../lib/profile';
import { sounds } from '../../lib/sound';

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Downscale to keep localStorage small.
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoField({
  label,
  storageKey,
}: {
  label: string;
  storageKey: string;
}) {
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    setPhoto(readStr(storageKey));
  }, [storageKey]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await fileToDataURL(f);
      writeStr(storageKey, url);
      setPhoto(url);
      sounds.pinTap();
    } catch {}
  };

  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-black/30 text-3xl">
          {photo ? <img src={photo} alt={label} className="h-full w-full object-cover" /> : '🕵️'}
        </div>
        <div className="flex flex-col gap-2">
          <label className="noir-btn-ghost cursor-pointer !py-2 text-center">
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {photo && (
            <button
              className="font-type text-[0.68rem] tracking-[0.14em] uppercase text-[var(--ink-faint)] hover:text-[var(--blood-bright)]"
              onClick={() => {
                writeStr(storageKey, '');
                setPhoto('');
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const room = useRoom();
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [accentMe, setAccentMe] = useState(DEFAULT_ACCENT);
  const [accentPartner, setAccentPartner] = useState(DEFAULT_ACCENT);
  const [custom, setCustom] = useState<CustomTrivia[]>([]);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(room.me.name);
    setPartnerName(readStr(PARTNER_NAME_KEY, 'Partner'));
    setAccentMe(readStr(ACCENT_ME_KEY, DEFAULT_ACCENT));
    setAccentPartner(readStr(ACCENT_PARTNER_KEY, DEFAULT_ACCENT));
    setCustom(readCustomTrivia());
  }, [room.me.name]);

  const saveAll = () => {
    room.setName(name);
    writeStr(PARTNER_NAME_KEY, partnerName.trim() || 'Partner');
    writeStr(ACCENT_ME_KEY, accentMe);
    writeStr(ACCENT_PARTNER_KEY, accentPartner);
    saveCustomTrivia(custom);
    sounds.stampThud();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const addTrivia = () => {
    if (!q.trim() || !a.trim()) return;
    setCustom([{ question: q.trim(), answer: a.trim() }, ...custom]);
    setQ('');
    setA('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Typewriter text="Detective Profiles" as="h1" className="text-2xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Names, colors, photos — no code changes needed.
        </p>
      </div>

      <GlassCard className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <div className="eyebrow mb-2">Detective one — you</div>
          <input
            className="noir-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your detective name"
            maxLength={24}
          />
          <div className="mt-3 flex items-center gap-3">
            <span className="font-type text-[0.72rem] tracking-[0.14em] uppercase text-[var(--ink-dim)]">
              Accent
            </span>
            <input
              type="color"
              value={accentMe}
              onChange={(e) => setAccentMe(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--glass-border)] bg-transparent"
            />
            <span className="font-type text-xs text-[var(--ink-faint)]">{accentMe}</span>
          </div>
          <div className="mt-4">
            <PhotoField label="Your photo" storageKey={PHOTO_ME_KEY} />
          </div>
        </div>
        <div>
          <div className="eyebrow mb-2">Detective two — partner</div>
          <input
            className="noir-input"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Partner's name"
            maxLength={24}
          />
          <div className="mt-3 flex items-center gap-3">
            <span className="font-type text-[0.72rem] tracking-[0.14em] uppercase text-[var(--ink-dim)]">
              Accent
            </span>
            <input
              type="color"
              value={accentPartner}
              onChange={(e) => setAccentPartner(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--glass-border)] bg-transparent"
            />
            <span className="font-type text-xs text-[var(--ink-faint)]">{accentPartner}</span>
          </div>
          <div className="mt-4">
            <PhotoField label="Partner's photo" storageKey={PHOTO_PARTNER_KEY} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="eyebrow mb-1">Trivia Battle — about each other</div>
        <p className="mb-4 text-sm text-[var(--ink-dim)]">
          Write questions only the two of you could answer. They join the Trivia Battle deck.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="noir-input"
            placeholder="Question…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="noir-input"
            placeholder="Answer…"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
          <button onClick={addTrivia} className="noir-btn whitespace-nowrap">
            + Add
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {custom.map((c, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--glass-border)] p-3"
            >
              <div>
                <div className="font-type text-sm">{c.question}</div>
                <div className="text-xs text-[var(--ink-dim)]">→ {c.answer}</div>
              </div>
              <button
                onClick={() => setCustom(custom.filter((_, j) => j !== i))}
                className="text-[var(--ink-faint)] hover:text-[var(--blood-bright)]"
                title="Delete"
              >
                ✕
              </button>
            </li>
          ))}
          {custom.length === 0 && (
            <li className="font-type text-[0.72rem] tracking-[0.16em] uppercase text-[var(--ink-faint)]">
              No custom questions yet.
            </li>
          )}
        </ul>
      </GlassCard>

      <button onClick={saveAll} className="noir-btn w-full !py-4">
        {saved ? '✓ Filed away' : 'File it — save everything'}
      </button>
    </div>
  );
}
