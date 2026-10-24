/**
 * Time-of-day greeting for the dashboard masthead, shown before "Sachi".
 * Just the greeting itself — no "Welcome" in front of it.
 *
 * Boundaries (local hour, like a morning/afternoon/evening/night split):
 *  5:00–11:59 morning, 12:00–16:59 afternoon, 17:00–20:59 evening,
 *  otherwise night. Computed on the visitor's device clock, on mount.
 */
export type DayGreeting = 'Good morning' | 'Good afternoon' | 'Good evening' | 'Good night';

export function greetingForHour(hour: number): DayGreeting {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}
