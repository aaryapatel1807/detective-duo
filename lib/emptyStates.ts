/**
 * Empty / error states, Phase 4: every dead end in the app is one of
 * these objects — a plain human sentence plus a next action (a button
 * or link). Components render them with <EmptyState/>; the objects
 * themselves are pure data so they are testable without a browser.
 */
export interface EmptyStateData {
  /** Short heading. */
  title: string;
  /** One plain sentence saying what happened. */
  body: string;
  /** Label for the next action. */
  actionLabel: string;
  /** Where the action goes. */
  actionHref: string;
}

export function roomNotFound(code: string): EmptyStateData {
  return {
    title: `No room ${code} yet`,
    body: 'Nobody has created this room. Create it and share the code with your partner, or check the letters and try again.',
    actionLabel: 'Back to together',
    actionHref: '/together',
  };
}

export function wrongRoomCode(code: string): EmptyStateData {
  return {
    title: `No room with code ${code}`,
    body: 'That code does not match a room anyone has made. Check the letters your partner sent, or create a room of your own.',
    actionLabel: 'Create a room instead',
    actionHref: '/together',
  };
}

export function emptyInbox(): EmptyStateData {
  return {
    title: 'Left for you',
    body: 'Nothing here yet. When your partner leaves you a case, it will wait in this spot.',
    actionLabel: 'Leave one for your partner',
    actionHref: '/together/leave',
  };
}

export function noLastRoom(): EmptyStateData {
  return {
    title: 'No recent room yet',
    body: 'You have not joined a room on this device before. Create one and share its code, or join with a code your partner shared.',
    actionLabel: 'Go to together',
    actionHref: '/together',
  };
}

export function gameLoadFailed(gameName: string): EmptyStateData {
  return {
    title: `${gameName} could not open`,
    body: 'Something went wrong loading this game. Your progress is safe — try opening it again.',
    actionLabel: 'Try again',
    actionHref: '/games',
  };
}

export function unknownCase(caseId: string): EmptyStateData {
  return {
    title: 'That case is not in the book',
    body: `There is no case called ${caseId} here. It may have come from an old link — pick a case from the start instead.`,
    actionLabel: 'Browse Case Files',
    actionHref: '/play/case-files',
  };
}

export function signedOutMidSession(): EmptyStateData {
  return {
    title: 'You were signed out',
    body: 'Your progress is saved on this device. Sign in again to pick up where you left off and sync across devices.',
    actionLabel: 'Sign in',
    actionHref: '/login',
  };
}

export function emptyDaily(): EmptyStateData {
  return {
    title: 'Nothing ticked off yet today',
    body: 'That is fine — even one of the three counts. Start with whichever looks easiest.',
    actionLabel: 'Back home',
    actionHref: '/',
  };
}

export function dailyAllDone(): EmptyStateData {
  return {
    title: 'All three done today',
    body: 'Lovely work. Tomorrow brings three fresh ones — nothing here needs doing until then.',
    actionLabel: 'Play a game instead',
    actionHref: '/play/logic-grids',
  };
}

/**
 * Case-bank cycle note: levels are unbounded but each tier's case bank
 * is finite, so a tier cycles once every case in it has been played.
 * Returns the note when the current level has wrapped past its tier's
 * bank, otherwise null.
 */
export function tierCycleNote(level: number, tierStart: number, tierSize: number): string | null {
  if (tierSize <= 0) return null;
  if (level - tierStart < tierSize) return null;
  return 'You have played every case in this tier, so the book cycles back to the start — this one may look familiar.';
}
