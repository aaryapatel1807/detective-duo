/* Escape Room logic + content tests. */
import { describe, expect, it } from 'vitest';
import { ESCAPE_ROOMS, getRoomDef } from './content';
import {
  freshEscape,
  hasExitKey,
  hasItem,
  hotspotById,
  inventoryItems,
  journalNotes,
  tryCode,
  validateRoom,
  visibleHotspots,
} from './logic';
import type { EscapeShared } from './types';

describe('authored rooms', () => {
  it('ships 2 rooms: Office and Archive', () => {
    expect(ESCAPE_ROOMS.map((r) => r.id)).toEqual(['office', 'archive']);
  });
  it('all rooms validate (solvable, one exit key, hidden spots revealed)', () => {
    for (const def of ESCAPE_ROOMS) {
      expect(validateRoom(def)).toEqual([]);
    }
  });
  it('office safe code is derivable from the certificate note', () => {
    const def = getRoomDef('office');
    const safe = hotspotById(def, 'safe')!;
    const notes = def.hotspots.map((h) => h.note?.text ?? '').join(' ');
    expect(notes).toContain('1951');
    expect(safe.lock?.code).toBe('1951');
  });
  it('archive strongbox code matches the drawer count in the catalog note', () => {
    const def = getRoomDef('archive');
    const box = hotspotById(def, 'strongbox')!;
    expect(box.lock?.code).toBe('0012');
    const catalog = hotspotById(def, 'catalog')!;
    expect(catalog.desc.toLowerCase()).toContain('twelve');
  });
  it('archive chain: reel -> microfilm -> third drawer -> exit key', () => {
    const def = getRoomDef('archive');
    const box = hotspotById(def, 'strongbox')!;
    expect(box.inside?.id).toBe('reel');
    const reader = hotspotById(def, 'microfilm')!;
    expect(reader.requires).toBe('reel');
    expect(reader.reveals).toContain('drawer3');
    const drawer = hotspotById(def, 'drawer3')!;
    expect(drawer.hidden).toBe(true);
    expect(drawer.item?.exitKey).toBe(true);
  });
  it('office chain: painting reveals safe, safe holds the exit key', () => {
    const def = getRoomDef('office');
    expect(hotspotById(def, 'painting')!.reveals).toContain('safe');
    const safe = hotspotById(def, 'safe')!;
    expect(safe.hidden).toBe(true);
    expect(safe.inside?.exitKey).toBe(true);
  });
});

describe('tryCode', () => {
  it('accepts the exact code, rejects others', () => {
    const def = getRoomDef('office');
    const safe = hotspotById(def, 'safe')!;
    expect(tryCode(safe, '1951')).toBe(true);
    expect(tryCode(safe, '1234')).toBe(false);
    expect(tryCode(safe, '')).toBe(false);
  });
});

describe('shared-state helpers', () => {
  const def = getRoomDef('office');
  const mk = (over: Partial<EscapeShared> = {}): EscapeShared => ({
    ...freshEscape('office'),
    ...over,
  });

  it('hidden hotspots stay invisible until revealed', () => {
    expect(visibleHotspots(def, mk()).some((h) => h.id === 'safe')).toBe(false);
    expect(
      visibleHotspots(def, mk({ revealed: ['safe'] })).some((h) => h.id === 'safe'),
    ).toBe(true);
  });

  it('inventory reflects taken items (synced for both players)', () => {
    const s = mk({ taken: { drawer: true } });
    // drawer has no item -> inventory empty; add a fake take on safe's inside
    const s2 = mk({ taken: { safe: true }, unlocked: { safe: true } });
    expect(inventoryItems(def, s)).toEqual([]);
    const inv = inventoryItems(def, s2);
    expect(inv).toHaveLength(1);
    expect(inv[0].exitKey).toBe(true);
    expect(hasExitKey(def, s2)).toBe(true);
    expect(hasExitKey(def, s)).toBe(false);
  });

  it('requires-items resolve from inventory', () => {
    const arc = getRoomDef('archive');
    const s = mk({ taken: { strongbox: true }, unlocked: { strongbox: true } });
    expect(hasItem(arc, s, 'reel')).toBe(true);
    expect(hasItem(arc, mk(), 'reel')).toBe(false);
  });

  it('journal returns found notes in hotspot order', () => {
    const s = mk({ notes: ['sticky', 'memo'] });
    const notes = journalNotes(def, s);
    expect(notes.map((n) => n.id)).toEqual(['memo', 'sticky']); // hotspot order, not insert order
  });

  it('freshEscape initializes every field', () => {
    const f = freshEscape('archive');
    expect(f.roomId).toBe('archive');
    expect(f.taken).toEqual({});
    expect(f.won).toBe(false);
    expect(typeof f.startedAt).toBe('number');
  });
});
