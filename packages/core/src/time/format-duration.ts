/**
 * Duration formatters for prepaid call time.
 *
 * Balances are stored in seconds because billing is per-second, but people
 * think in minutes — so every surface that shows a balance formats through
 * here rather than dividing by 60 inline and rounding differently each time.
 */

/**
 * Clock form: `4:07`, `1:02:30`. For live countdowns and call durations, where
 * the exact remaining second is the point.
 */
export function formatSecondsAsClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Prose form: `45 secs`, `12 mins`, `1 hr 5 mins`. For balances and summaries,
 * where "about how much" beats to-the-second precision.
 *
 * Rounds DOWN throughout: showing 5 mins on a balance that buys 4:59 of talk
 * time would promise time the caller cannot spend.
 */
export function formatSecondsAsDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe < 60) return `${safe} ${safe === 1 ? 'sec' : 'secs'}`;

  const totalMinutes = Math.floor(safe / 60);
  if (totalMinutes < 60) return `${totalMinutes} ${totalMinutes === 1 ? 'min' : 'mins'}`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourPart = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  if (minutes === 0) return hourPart;
  return `${hourPart} ${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
}

/**
 * What a given spend buys at a per-minute rate, in seconds.
 *
 * Floors, so a balance never claims a second the escrow does not cover. Mirrors
 * the backend's purchase math — keep the two in step.
 */
export function secondsForKobo(amountKobo: number, perMinuteKobo: number): number {
  if (perMinuteKobo <= 0) return 0;
  return Math.floor((amountKobo * 60) / perMinuteKobo);
}

/**
 * What a stretch of talk time costs at a per-minute rate.
 *
 * Rounds half-up once for the whole span, matching how the backend settles a
 * call. Rounding each second instead would drift against whoever the remainder
 * favours.
 */
export function koboForSeconds(seconds: number, perMinuteKobo: number): number {
  if (seconds <= 0 || perMinuteKobo <= 0) return 0;
  return Math.round((perMinuteKobo * seconds) / 60);
}
