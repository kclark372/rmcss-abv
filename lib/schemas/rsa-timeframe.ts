/**
 * The look-back window the self-assessment asks about, which depends on which
 * meeting (wave) the participant is at.
 *
 * Questions are written with a `{timeframe}` placeholder; `applyTimeframe`
 * fills it in. Waves 0, 6 and 9 look back over the past 90 days; waves 1 and 3
 * look back to the participant's last assessment.
 */

export const WAVES = ['0', '1', '3', '6', '9'] as const;
export type Wave = (typeof WAVES)[number];

export const TIMEFRAME_90_DAYS = 'During the past 90 days';
export const TIMEFRAME_SINCE_LAST = 'Since your last assessment';

const SINCE_LAST_WAVES: readonly Wave[] = ['1', '3'];

/** The capitalised phrase, as it is also saved to FileMaker `timeframe`. */
export function timeframeForWave(wave: Wave): string {
  return SINCE_LAST_WAVES.includes(wave) ? TIMEFRAME_SINCE_LAST : TIMEFRAME_90_DAYS;
}

/**
 * Replaces every `{timeframe}` in `text`. At the start of the text or of a
 * sentence the phrase keeps its capital; mid-sentence it is lower-cased so
 * "…when you were using {timeframe}:" reads naturally.
 */
export function applyTimeframe(text: string, timeframe: string): string {
  return text.replace(/\{timeframe\}/g, (_placeholder, offset: number) => {
    const before = text.slice(0, offset);
    const startsSentence = before.trim() === '' || /[.!?]\s*$/.test(before);
    return startsSentence ? timeframe : timeframe.charAt(0).toLowerCase() + timeframe.slice(1);
  });
}

/** The meeting labels staff and FileMaker use, keyed by meeting number. */
export const WAVE_LABELS: Record<Wave, string> = {
  '0': 'Enrollment',
  '1': 'M1',
  '3': 'M3',
  '6': 'M6',
  '9': 'M9',
};

/**
 * When each meeting is open, in whole days since `participants::date_enrolled`
 * (inclusive). The same windows the RMCSS app uses (`RMC_WINDOW_DAYS`).
 * After the last window, or before enrollment, no meeting is open.
 */
const WAVE_WINDOWS: readonly { wave: Wave; from: number; to: number }[] = [
  { wave: '0', from: 0, to: 23 },
  { wave: '1', from: 24, to: 83 },
  { wave: '3', from: 84, to: 173 },
  { wave: '6', from: 174, to: 263 },
  { wave: '9', from: 264, to: 353 },
];

/** The time zone "today" is read in, so the meeting does not change at 7 pm local time. */
export const MEETING_TIME_ZONE = 'America/Chicago';

/** A calendar date with no time of day. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Today's date in `MEETING_TIME_ZONE`. */
export function todayInMeetingZone(now: Date = new Date()): DateParts {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEETING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  return { year, month, day };
}

/**
 * Reads a FileMaker date: "MM/DD/YYYY" (the Data API's format) or "YYYY-MM-DD".
 * Returns null for blank or unreadable values and for dates that do not exist.
 */
export function parseFMDate(value: string | null | undefined): DateParts | null {
  const text = (value ?? '').trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const parts: DateParts | null = us
    ? { year: Number(us[3]), month: Number(us[1]), day: Number(us[2]) }
    : iso
      ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
      : null;
  if (!parts) return null;
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const real =
    check.getUTCFullYear() === parts.year &&
    check.getUTCMonth() === parts.month - 1 &&
    check.getUTCDate() === parts.day;
  return real ? parts : null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
function daysBetween(from: DateParts, to: DateParts): number {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * The meeting open today, worked out from `participants::date_enrolled`.
 * Returns null when there is no readable date, the participant is not enrolled
 * yet, or the last window (day 353) has passed.
 */
export function waveFromEnrollmentDate(
  dateEnrolled: string | null | undefined,
  today: DateParts = todayInMeetingZone(),
): Wave | null {
  const enrolled = parseFMDate(dateEnrolled);
  if (!enrolled) return null;
  const days = daysBetween(enrolled, today);
  return WAVE_WINDOWS.find((window) => days >= window.from && days <= window.to)?.wave ?? null;
}
