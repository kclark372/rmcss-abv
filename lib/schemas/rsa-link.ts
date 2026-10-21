import { z } from 'zod';

import { RSA_QUESTION_KEYS } from './rsa-questions';
import type { Wave } from './rsa-timeframe';

/**
 * Validation for the staff-run self-assessment link (`/rsa`).
 *
 * Staff pick their organization and name and type the PID; the meeting comes
 * from FileMaker (`participants::wave_now_rmc`), never from the browser. The
 * participant supplies the answers. The server re-validates everything — client checks are for feedback.
 */

export const staffEntrySchema = z.object({
  /** Written to `rsa::agency`. Must match the chosen staff member's agency. */
  agency: z.string().trim().min(1, 'Organization is required').max(100),
  /** The chosen staff member's `staff::xsid`; written to `rsa::XSID`. */
  xsid: z
    .string()
    .trim()
    .regex(/^[\w.-]{1,50}$/, 'Staff name is required'),
  /** Written to `rsa::_PID` (a text field), without leading zeros. */
  pid: z
    .string()
    .trim()
    .min(1, 'PID is required')
    .regex(/^\d{1,9}$/, 'PID must be numbers only')
    .transform((value) => String(Number(value))),
});

export type StaffEntry = z.infer<typeof staffEntrySchema>;

const answers = z.object(
  Object.fromEntries(RSA_QUESTION_KEYS.map((key) => [key, z.boolean()])) as {
    [K in (typeof RSA_QUESTION_KEYS)[number]]: z.ZodBoolean;
  },
);

export const rsaLinkSubmissionSchema = staffEntrySchema
  .extend({
    discuss_te: z.string().trim().max(5000).default(''),
    /** Browser-local `YYYY-MM-DDTHH:MM:SS`, with no timezone on purpose. */
    timestamp_beginRSA: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
      .nullable(),
  })
  .merge(answers);

export type RSALinkSubmission = z.infer<typeof rsaLinkSubmissionSchema>;

export type RSALinkSubmitResult =
  | { ok: true }
  | { ok: false; error: string; locked?: boolean };

/** One person in the staff dropdowns, from `staff` (layout `api_staff`). */
export interface StaffMember {
  agency: string;
  name: string;
  xsid: string;
}

export type RosterResult =
  | { ok: true; roster: StaffMember[] }
  | { ok: false; error: string };

/**
 * The PID check. Only `found` lets staff continue; every other status is a hard
 * stop. `found` also carries the meeting read from `wave_now_rmc`: `waveLabel` is
 * the value as FileMaker holds it and `wave` is the meeting number it means.
 */
export type PidCheckResult =
  | { status: 'found'; wave: Wave; waveLabel: string }
  /** No participant has this PID. */
  | { status: 'not_found' }
  /** The participant exists but `wave_now_rmc` is empty: no meeting is open. */
  | { status: 'no_wave' }
  /** `wave_now_rmc` holds a label this form does not recognise. */
  | { status: 'bad_wave'; waveLabel: string }
  /** The lookup itself failed (layout not readable, server unreachable…). */
  | { status: 'unknown' };
