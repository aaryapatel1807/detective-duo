/* Escape Room — pure helpers: visibility, inventory, locks, and room
 * validation. No React. */

import type { EscapeRoomDef, EscapeShared, Hotspot, HotspotItem } from './types';

export function hotspotById(def: EscapeRoomDef, id: string): Hotspot | undefined {
  return def.hotspots.find((h) => h.id === id);
}

/** Hotspots currently visible (hidden ones need revealing). */
export function visibleHotspots(def: EscapeRoomDef, shared: EscapeShared): Hotspot[] {
  const revealed = new Set(shared.revealed ?? []);
  return def.hotspots.filter((h) => !h.hidden || revealed.has(h.id));
}

/** Items currently in the shared inventory. */
export function inventoryItems(def: EscapeRoomDef, shared: EscapeShared): HotspotItem[] {
  const items: HotspotItem[] = [];
  for (const h of def.hotspots) {
    if (shared.taken?.[h.id]) {
      if (h.item) items.push(h.item);
      else if (h.inside && shared.unlocked?.[h.id]) items.push(h.inside);
    }
  }
  return items;
}

export function hasItem(def: EscapeRoomDef, shared: EscapeShared, itemId: string): boolean {
  return inventoryItems(def, shared).some((i) => i.id === itemId);
}

export function hasExitKey(def: EscapeRoomDef, shared: EscapeShared): boolean {
  return inventoryItems(def, shared).some((i) => i.exitKey);
}

/** Check a 4-digit code against a hotspot's lock. */
export function tryCode(hotspot: Hotspot, code: string): boolean {
  return !!hotspot.lock && hotspot.lock.code === code.trim();
}

/** All journal notes found so far (in hotspot order). */
export function journalNotes(def: EscapeRoomDef, shared: EscapeShared) {
  const found = new Set(shared.notes ?? []);
  return def.hotspots
    .map((h) => h.note)
    .filter((n): n is NonNullable<typeof n> => !!n && found.has(n.id));
}

/**
 * Validate that a room is solvable: every hidden hotspot is revealed by
 * some other hotspot, every `requires` item exists somewhere, every lock
 * guards an item, and exactly one exit key exists.
 */
export function validateRoom(def: EscapeRoomDef): string[] {
  const errs: string[] = [];
  const ids = new Set(def.hotspots.map((h) => h.id));
  const revealedBy = new Set<string>();
  const itemIds = new Set<string>();
  let exitKeys = 0;

  for (const h of def.hotspots) {
    for (const r of h.reveals ?? []) {
      if (!ids.has(r)) errs.push(`${h.id} reveals unknown hotspot ${r}`);
      revealedBy.add(r);
    }
    if (h.requires && !def.hotspots.some((o) => o.item?.id === h.requires || o.inside?.id === h.requires)) {
      errs.push(`${h.id} requires unknown item ${h.requires}`);
    }
    for (const it of [h.item, h.inside]) {
      if (it) {
        if (itemIds.has(it.id)) errs.push(`duplicate item id ${it.id}`);
        itemIds.add(it.id);
        if (it.exitKey) exitKeys++;
      }
    }
    if (h.lock && !h.inside) errs.push(`${h.id} has a lock but nothing inside`);
    if (h.hidden && !revealedBy.has(h.id)) errs.push(`${h.id} is hidden but never revealed`);
  }
  if (exitKeys !== 1) errs.push(`expected exactly 1 exit key, found ${exitKeys}`);
  if (def.hotspots.length < 4) errs.push('room needs at least 4 hotspots');
  return errs;
}

/** Fresh shared state for a room. */
export function freshEscape(roomId: string): EscapeShared {
  return {
    roomId,
    startedAt: Date.now(),
    taken: {},
    unlocked: {},
    notes: [],
    revealed: [],
    won: false,
    awarded: {},
  };
}
