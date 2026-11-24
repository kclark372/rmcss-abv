import { z } from 'zod';

import { RSA_QUESTION_KEYS } from './rsa-questions';
import type { Wave } from './rsa-timeframe';

/**
 * Validation for the staff-run self-assessment link (`/rsa`).
 *
 * Staff pick their organization and name and type the PID; the meeting comes
 * from FileMaker (`participants::date_enrolled`), never from the browser. The
 * participant supplies the answers. The server re-validates everything — client checks are for feedback.
 */

export const staffEntrySchema = z.object({
  /** Written to `rsa::agency`. Must match the chosen staff member's agency. */
  agency: z.string().trim().min(1, 'Organization is required').max(100),
  /** The chosen staff member's `staff::xsid`; written to `rsa::xsid`. */
  xsid: z
    .string()
    .trim()
    .regex(/^[\w.-]{1,50}$/, 'Staff name is required'),
  /** Written to `rsa::_pid` (a text field), without leading zeros. */
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
 * stop. `found` also carries the meeting worked out from `date_enrolled`: `wave` is
 * the meeting number and `waveLabel` its name ("Enrollment", "M1", …).
 */
export type PidCheckResult =
  | { status: 'found'; wave: Wave; waveLabel: string }
  /** No participant has this PID. */
  | { status: 'not_found' }
  /** No meeting is open: no enrollment date, not enrolled yet, or past day 353. */
  | { status: 'no_wave' }
  /** The lookup itself failed (layout not readable, server unreachable…). */
  | { status: 'unknown' };
