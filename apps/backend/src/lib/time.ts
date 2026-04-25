const VALID_TZ_RE = /^[A-Za-z]+(?:\/[A-Za-z_]+)+$/;

export const isValidIanaTimezone = (tz: string): boolean => {
  if (!VALID_TZ_RE.test(tz)) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const nowUtc = (): Date => new Date();

export const toUtcIso = (d: Date): string => d.toISOString();

export const addSeconds = (d: Date, seconds: number): Date =>
  new Date(d.getTime() + seconds * 1000);

export const addMinutes = (d: Date, minutes: number): Date => addSeconds(d, minutes * 60);
