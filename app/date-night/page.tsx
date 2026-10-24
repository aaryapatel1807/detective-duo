'use client';

/**
 * Roll a date night: one dice roll picks Dinner + Activity + Treat +
 * Entertainment from lists you can edit. Lists save per account (or
 * per browser as a guest). Solo roll here; a shared roll lives in the
 * room lobby, where both players see it.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Dices, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import {
  DATE_LIST_META,
  loadDateLists,
  rollDateNight,
  saveDateLists,
  DEFAULT_DATE_LISTS,
  type DateListId,
  type DateLists,
  type DateRoll,
} from '@/lib/datenight';

export default function DateNightPage() {
  const { userId } = useTheme();
  const [lists, setLists] = useState<DateLists>(DEFAULT_DATE_LISTS);
  const [roll, setRoll] = useState<DateRoll | null>(null);
  const [drafts, setDrafts] = useState<Record<DateListId, string>>({
    dinner: '',
    activity: '',
    treat: '',
    entertainment: '',
  });

  useEffect(() => {
    setLists(loadDateLists(userId));
  }, [userId]);

  const persist = (next: DateLists) => {
    setLists(next);
    saveDateLists(userId, next);
  };

  const add = (id: DateListId) => {
    const v = drafts[id].trim();
    if (!v) return;
    persist({ ...lists, [id]: [...lists[id], v] });
    setDrafts((d) => ({ ...d, [id]: '' }));
  };

  const remove = (id: DateListId, i: number) => {
    persist({ ...lists, [id]: lists[id].filter((_, x) => x !== i) });
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <Link href="/" className="btn !px-3 !py-2 text-sm">
        <ArrowLeft size={16} aria-hidden /> Home
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Roll a date night</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        One roll, four picks. Edit the lists below and the dice follows them.
      </p>

      <section className="card mt-6 p-5 text-center">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setRoll(rollDateNight(lists))}
        >
          <Dices size={18} aria-hidden /> Roll the dice
        </button>
        {roll && (
          <ul className="mx-auto mt-4 max-w-md space-y-2 text-left">
            <li className="panel p-3 text-sm">Dinner: <strong>{roll.dinner}</strong></li>
            <li className="panel p-3 text-sm">Activity: <strong>{roll.activity}</strong></li>
            <li className="panel p-3 text-sm">Treat: <strong>{roll.treat}</strong></li>
            <li className="panel p-3 text-sm">Entertainment: <strong>{roll.entertainment}</strong></li>
          </ul>
        )}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {DATE_LIST_META.map((meta) => (
          <div key={meta.id} className="card p-4">
            <h2 className="font-display text-lg font-bold">{meta.name}</h2>
            <p className="text-sm text-[var(--ink-dim)]">{meta.hint}</p>
            <ul className="mt-2 space-y-1">
              {lists[meta.id].map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                  <span>{item}</span>
                  <button
                    type="button"
                    className="btn !px-2 !py-1 text-xs"
                    aria-label={`Remove ${item}`}
                    onClick={() => remove(meta.id, i)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                className="input flex-1"
                value={drafts[meta.id]}
                onChange={(e) => setDrafts((d) => ({ ...d, [meta.id]: e.target.value }))}
                placeholder={`Add a ${meta.name.toLowerCase()} idea`}
                aria-label={`Add to ${meta.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add(meta.id);
                }}
              />
              <button type="button" className="btn" aria-label={`Add to ${meta.name}`} onClick={() => add(meta.id)}>
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </section>

      <button
        type="button"
        className="btn mt-4"
        onClick={() => persist(DEFAULT_DATE_LISTS)}
      >
        <RotateCcw size={16} aria-hidden /> Reset to the default lists
      </button>
    </main>
  );
}
