/**
 * "Leave her a case": one player picks a case from the bank, attaches
 * an optional short note, and sends it. It appears in the OTHER
 * account's home "Left for you" slot — addressed to everyone except
 * the sender, with no names hardcoded anywhere (the label shown is
 * the generic "from your partner").
 *
 * Storage: Supabase `left_cases` when configured, localStorage mirror
 * otherwise (see the migration file for the table + RLS).
 */
import { getSupabase } from '../supabase/client';

export interface LeftCase {
  id: string;
  fromUid: string;
  caseId: string;
  note: string;
  createdAt: string;
  seenAt: string | null;
}

/** Inbox for one user: everyone else's cases, unopened first, newest first. */
export function inboxFor(cases: LeftCase[], uid: string): LeftCase[] {
  return cases
    .filter((c) => c.fromUid !== uid)
    .sort((a, b) => {
      const aOpen = a.seenAt ? 1 : 0;
      const bOpen = b.seenAt ? 1 : 0;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function markSeen(cases: LeftCase[], id: string, at = new Date().toISOString()): LeftCase[] {
  return cases.map((c) => (c.id === id ? { ...c, seenAt: at } : c));
}

const LOCAL_KEY = 'dd-v2-left-cases';

function readLocal(): LeftCase[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as LeftCase[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(cases: LeftCase[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cases));
  } catch {
    /* ignore */
  }
}

export async function leaveCase(fromUid: string, caseId: string, note: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    const uid = data.session?.user.id ?? fromUid;
    await sb.from('left_cases').insert({
      from_user: uid,
      case_id: caseId,
      note: note.slice(0, 280),
    });
    return;
  }
  const cases = readLocal();
  cases.push({
    id: `local-${Date.now()}`,
    fromUid,
    caseId,
    note: note.slice(0, 280),
    createdAt: new Date().toISOString(),
    seenAt: null,
  });
  writeLocal(cases);
}

export async function listLeftCases(uid: string): Promise<LeftCase[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('left_cases')
      .select('id,from_user,case_id,note,created_at,seen_at')
      .neq('from_user', uid)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as never[]).map((r) => {
      const row = r as unknown as Record<string, unknown>;
      return {
        id: String(row.id),
        fromUid: String(row.from_user),
        caseId: String(row.case_id),
        note: String(row.note ?? ''),
        createdAt: String(row.created_at),
        seenAt: row.seen_at ? String(row.seen_at) : null,
      };
    });
  }
  return inboxFor(readLocal(), uid);
}

export async function markLeftCaseSeen(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('left_cases').update({ seen_at: new Date().toISOString() }).eq('id', id);
    return;
  }
  writeLocal(markSeen(readLocal(), id));
}
