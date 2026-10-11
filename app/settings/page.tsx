'use client';

/* Settings — both names, accent colors, photo uploads (dataURL in
 * localStorage), custom trivia questions ("about each other").
 * Noir defaults. No code changes needed.
 */

import { useEffect, useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { Pin } from '../../components/Pin';
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
import '../../components/hub-noir.css';

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
      <div className="hub-eyebrow mb-2">{label}</div>
      <div className="flex items-center gap-4">
        <div className="hub-avatar !h-20 !w-20" aria-hidden>
          {photo ? <img src={photo} alt="" /> : <span className="text-3xl">🕵️</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="hub-btn-ghost cursor-pointer text-center">
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
              className="hub-mono text-[0.68rem] tracking-[0.14em] uppercase text-[var(--hub-ink-dim)] hover:text-[var(--hub-red)]"
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

function DetectiveField({
  eyebrow,
  name,
  setName,
  namePlaceholder,
  accent,
  setAccent,
  photoLabel,
  photoKey,
}: {
  eyebrow: string;
  name: string;
  setName: (v: string) => void;
  namePlaceholder: string;
  accent: string;
  setAccent: (v: string) => void;
  photoLabel: string;
  photoKey: string;
}) {
  return (
    <div>
      <div className="hub-eyebrow mb-2">{eyebrow}</div>
      <input
        className="hub-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={namePlaceholder}
        maxLength={24}
        aria-label={namePlaceholder}
      />
      <div className="mt-3 flex items-center gap-3">
        <span className="hub-mono text-[0.72rem] tracking-[0.14em] uppercase text-[var(--hub-ink-dim)]">
          Accent
        </span>
        <input
          type="color"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border border-[var(--hub-border)] bg-transparent"
          aria-label="Accent color"
        />
        <span className="hub-mono text-xs text-[var(--hub-ink-dim)]">{accent}</span>
      </div>
      <div className="mt-4">
        <PhotoField label={photoLabel} storageKey={photoKey} />
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
    <div className="hub-page">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <Typewriter text="Detective Profiles" as="h1" className="hub-page-title" />
          <p className="hub-sub">Names, colors, photos — no code changes needed.</p>
        </div>

        <GlassCard className="relative grid gap-6 p-6 md:grid-cols-2">
          <Pin className="absolute -top-2 right-10" />
          <DetectiveField
            eyebrow="Detective one — you"
            name={name}
            setName={setName}
            namePlaceholder="Your detective name"
            accent={accentMe}
            setAccent={setAccentMe}
            photoLabel="Your photo"
            photoKey={PHOTO_ME_KEY}
          />
          <DetectiveField
            eyebrow="Detective two — partner"
            name={partnerName}
            setName={setPartnerName}
            namePlaceholder="Partner's name"
            accent={accentPartner}
            setAccent={setAccentPartner}
            photoLabel="Partner's photo"
            photoKey={PHOTO_PARTNER_KEY}
          />
        </GlassCard>

        <GlassCard className="p-6">
          <div className="hub-eyebrow mb-1">Trivia Battle — about each other</div>
          <p className="mb-4 text-sm text-[var(--hub-ink-dim)]">
            Write questions only the two of you could answer. They join the Trivia Battle deck.
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              className="hub-input"
              placeholder="Question…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Custom trivia question"
            />
            <input
              className="hub-input"
              placeholder="Answer…"
              value={a}
              onChange={(e) => setA(e.target.value)}
              aria-label="Custom trivia answer"
            />
            <button onClick={addTrivia} className="hub-btn whitespace-nowrap">
              + Add
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {custom.map((c, i) => (
              <li key={i} className="hub-row">
                <div className="min-w-0">
                  <div className="text-sm">{c.question}</div>
                  <div className="text-xs text-[var(--hub-ink-dim)]">→ {c.answer}</div>
                </div>
                <button
                  onClick={() => setCustom(custom.filter((_, j) => j !== i))}
                  className="hub-icon-btn"
                  title="Delete"
                  aria-label="Delete question"
                >
                  ✕
                </button>
              </li>
            ))}
            {custom.length === 0 && (
              <li className="hub-mono text-[0.72rem] tracking-[0.16em] uppercase text-[var(--hub-ink-dim)]">
                No custom questions yet.
              </li>
            )}
          </ul>
        </GlassCard>

        <button onClick={saveAll} className="hub-btn w-full !py-4">
          {saved ? '✓ Filed away' : 'File it — save everything'}
        </button>
      </div>
    </div>
  );
}
