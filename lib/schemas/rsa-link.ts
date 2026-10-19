import { z } from 'zod';

import { RSA_QUESTION_KEYS } from './rsa-questions';
import { WAVES } from './rsa-timeframe';

/**
 * Validation for the staff-run self-assessment link (`/rsa`).
 *
 * Staff supply Staff ID, PID and meeting number; the participant supplies the
 * answers. The server re-validates everything — client checks are for feedback.
 */

export const staffEntrySchema = z.object({
  /** Free text; written to `rsa::XSID`. */
  xsid: z.string().trim().min(1, 'Staff ID is required').max(50),
  /** Written to `rsa::_PID` (a text field). */
  pid: z.string().trim().regex(/^\d{1,9}$/, 'PID must be numbers only'),
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
    timestamp_beginRSA: z.string().datetime({ offset: true }).nullable(),
  })
  .merge(answers);

export type RSALinkSubmission = z.infer<typeof rsaLinkSubmissionSchema>;

export type RSALinkSubmitResult =
  | { ok: true }
  | { ok: false; error: string; locked?: boolean };

/**
 * `found` / `not_found` come from FileMaker. `unknown` means the lookup could
 * not be done (layout missing, server unreachable…) — staff are never blocked
 * on it.
 */
export type PidCheckResult = 'found' | 'not_found' | 'unknown';
