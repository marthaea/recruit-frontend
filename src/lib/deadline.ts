// Deadline helpers — applications close at 5:00pm on the closing date.

/** Whole days from now until the 5pm deadline on `closesAt` (YYYY-MM-DD). Negative = past. */
export function daysUntilClose(closesAt: string): number {
  const deadline = new Date(`${closesAt}T17:00:00`);
  const ms = deadline.getTime() - Date.now();
  return Math.floor(ms / 86_400_000);
}

/** Human label for the countdown, or null once closed. */
export function closingLabel(closesAt: string): string | null {
  const d = daysUntilClose(closesAt);
  if (d < 0) return null;
  if (d === 0) return "Closes today at 5:00pm";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

export function isClosingSoon(closesAt: string, closingSoonDays: number): boolean {
  const d = daysUntilClose(closesAt);
  return d >= 0 && d <= closingSoonDays;
}
