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

/**
 * Reads the participant's current meeting from `participants::wave_now_rmc`,
 * which holds a label such as "Enrollment", "Month 3" or "M3".
 * "Enrollment" (or "baseline") is meeting 0; otherwise the first number in the
 * label is the meeting. Anything that is not one of `WAVES` returns null, so an
 * unfamiliar label stops the form instead of being guessed at.
 */
export function waveFromLabel(label: string | null | undefined): Wave | null {
  const text = (label ?? '').trim().toLowerCase();
  if (!text) return null;
  if (/^(enrol+ment|baseline)$/.test(text)) return '0';
  const number = /\d+/.exec(text)?.[0];
  if (number === undefined) return null;
  const wave = String(Number(number));
  return (WAVES as readonly string[]).includes(wave) ? (wave as Wave) : null;
}
