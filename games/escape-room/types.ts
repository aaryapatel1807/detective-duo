/* Escape Room — shared types.
 * Both detectives see the same room; every action syncs through
 * shared.games['escape-room'] so a picked-up key is gone for both.
 */

export interface HotspotItem {
  id: string;
  name: string;
  icon: string;
  /** picking this up wins the room */
  exitKey?: boolean;
}

export interface HotspotNote {
  id: string;
  title: string;
  text: string;
}

export interface Hotspot {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** journal note added on first examine */
  note?: HotspotNote;
  /** item lying here for the taking */
  item?: HotspotItem;
  /** item id required to interact */
  requires?: string;
  requiresHint?: string;
  /** 4-digit combination lock */
  lock?: { code: string; hint: string };
  /** item found inside once unlocked */
  inside?: HotspotItem;
  /** hotspot ids revealed after a successful interaction */
  reveals?: string[];
  /** hidden until revealed via `reveals` */
  hidden?: boolean;
  /** pin position on the room illustration (percent) */
  pos: { x: number; y: number };
}

export interface EscapeRoomDef {
  id: string;
  title: string;
  blurb: string;
  intro: string;
  /** soft flavor timer */
  timeMs: number;
  hotspots: Hotspot[];
}

export interface EscapeShared {
  roomId?: string;
  startedAt?: number;
  /** hotspot id -> its item/inside item has been taken */
  taken?: Record<string, boolean>;
  /** hotspot id -> lock opened */
  unlocked?: Record<string, boolean>;
  /** note ids in the clue journal */
  notes?: string[];
  /** extra hotspot ids revealed */
  revealed?: string[];
  won?: boolean;
  awarded?: Record<string, boolean>;
}
