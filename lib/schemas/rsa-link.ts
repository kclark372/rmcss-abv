import { z } from 'zod';

import { RSA_QUESTION_KEYS } from './rsa-questions';
import { WAVES } from './rsa-timeframe';

/**
 * Validation for the staff-run self-assessment link (`/rsa`).
 *
 * Staff pick their organization and name, type the PID and pick the meeting
 * number; the participant supplies the
 * answers. The server re-validates everything — client checks are for feedback.
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
  /** Meeting number; written to `rsa::XOBS`. */
  wave: z.enum(WAVES, { message: 'Meeting number is required' }),
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
 * `found` / `not_found` come from FileMaker. `unknown` means the lookup could
 * not be done (layout not readable, server unreachable…). All but `found` stop
 * staff from continuing: a PID that cannot be verified is not a valid PID.
 */
export type PidCheckResult = 'found' | 'not_found' | 'unknown';
