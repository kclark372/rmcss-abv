/**
 * Value coercion for the FileMaker Data API.
 *
 * Requests are sent with the default `dateformats` (0 = US), so date, time and
 * timestamp fields must be handed over as MM/DD/YYYY and HH:MM:SS. HTML inputs
 * produce ISO strings, so they are converted here rather than at each call site.
 *
 * Only fields whose FileMaker result type is date/time/timestamp need this.
 * On these three layouts that is:
 *   abv_RSA  timestamp_beginRSA (timestamp)
 *   abv_RMC  date_RMC, date_RSA, recording_upload_date (date);
 *            time_RMC_begin, time_RMC_end (time)
 * `XADT` on abv_RSA and every date/time field on abv_tx are text fields, so
 * their ISO values are stored verbatim.
 */

/** `YYYY-MM-DD` (an `<input type="date">` value) -> `MM/DD/YYYY`. Empty in, empty out. */
export function toFMDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

/** `HH:MM` or `HH:MM:SS` (an `<input type="time">` value) -> `HH:MM:SS`. */
export function toFMTime(isoTime: string | null | undefined): string {
  if (!isoTime) return '';
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(isoTime);
  if (!match) return '';
  const [, hours, minutes, seconds] = match;
  return `${hours}:${minutes}:${seconds ?? '00'}`;
}

/** A `Date` -> `MM/DD/YYYY HH:MM:SS` in the server's local time. */
export function toFMTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${datePart} ${timePart}`;
}

/** A `Date` -> `MM/DD/YYYY`. */
export function toFMDateFromDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

/** A `Date` -> `HH:MM:SS`. */
export function toFMTimeFromDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Checkbox -> the "1"/"0" text these layouts store.
 * All of the s1..s8, ref_* and alt_* fields are plain text fields, not
 * checkbox-set fields, so they hold the literal characters 1 and 0.
 */
export function toFMBool(checked: boolean): '1' | '0' {
  return checked ? '1' : '0';
}

/** Reads a "1"/"0" text field back as a boolean. */
export function fromFMBool(value: string | undefined): boolean {
  return value === '1';
}
