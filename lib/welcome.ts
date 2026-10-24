/**
 * Welcome intro (the "hey Sachi" screen).
 *
 * Built from the verified reference page (handwriting mask-reveal,
 * code-motion portrait, canvas petals) — no video, per the owner's
 * order. The portrait is the transparent cutout at /sachi/portrait.webp.
 *
 * Privacy note (the prompt's open question, still unanswered): the
 * portrait currently shows to everyone (scope 'everyone'). The
 * portrait is an illustration, not a photograph. To show it only to
 * signed-in Sachi/Aarya later, flip WELCOME_PORTRAIT_SCOPE and gate
 * on the signed-in user in app/page.tsx.
 */

export const GREETING_NAME = 'Sachi';

/** sessionStorage flag set when the visitor taps "Come in". */
export const WELCOME_SEEN_KEY = 'dd-welcome-seen';

export const WELCOME_PORTRAIT = '/sachi/portrait.webp';

/** Who sees the welcome portrait: 'everyone' (current) or 'signed-in'. */
export const WELCOME_PORTRAIT_SCOPE = 'everyone' as const;

export function isWelcomeSeen(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): boolean {
  try {
    return storage?.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen(
  storage: Pick<Storage, 'setItem'> | null | undefined,
): void {
  try {
    storage?.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearWelcomeSeen(
  storage: Pick<Storage, 'removeItem'> | null | undefined,
): void {
  try {
    storage?.removeItem(WELCOME_SEEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Letter-by-letter timing for "hey Sachi" (seconds). Slight speed
 * changes between strokes so the writing feels handwritten, not
 * mechanical. Total is ~2.5s, matching the reference page.
 */
export interface LetterStep {
  ch: string;
  t: number;
}

export const GREETING_LETTERS: LetterStep[] = [
  { ch: 'h', t: 0.32 },
  { ch: 'e', t: 0.26 },
  { ch: 'y', t: 0.36 },
  { ch: ' ', t: 0.12 },
  { ch: 'S', t: 0.38 },
  { ch: 'a', t: 0.26 },
  { ch: 'c', t: 0.24 },
  { ch: 'h', t: 0.3 },
  { ch: 'i', t: 0.26 },
];

export function greetingTotalSeconds(): number {
  return GREETING_LETTERS.reduce((s, l) => s + l.t, 0);
}

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

/** Fraction of the greeting revealed after `elapsedMs` (0..1). */
export function greetingProgressAt(elapsedMs: number): number {
  const total = greetingTotalSeconds();
  const t = elapsedMs / 1000;
  if (t >= total) return 1;
  let acc = 0;
  for (let i = 0; i < GREETING_LETTERS.length; i++) {
    const step = GREETING_LETTERS[i];
    if (t < acc + step.t) {
      const local = (t - acc) / step.t;
      const eased = easeInOut(Math.max(0, Math.min(1, local)));
      return (i + eased) / GREETING_LETTERS.length;
    }
    acc += step.t;
  }
  return 1;
}
