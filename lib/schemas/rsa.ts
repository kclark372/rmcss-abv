import { z } from 'zod';

import { AGENCIES, RSA_QUESTION_KEYS } from './rsa-questions';

/**
 * Validation for the RSA self-assessment.
 *
 * The forms are public and unauthenticated, so everything is re-validated here
 * on the server; the client-side checks are only there for fast feedback.
 */

/** Each of the s1..s8 answers arrives as a boolean and is stored as "1"/"0". */
const answers = z.object(
  Object.fromEntries(RSA_QUESTION_KEYS.map((key) => [key, z.boolean()])) as {
    [K in (typeof RSA_QUESTION_KEYS)[number]]: z.ZodBoolean;
  },
);

export const rsaSubmissionSchema = z
  .object({
    agency: z.enum(AGENCIES, { message: 'Organization is required' }),
    /** "Your name" (staff). Stored in FileMaker `name_pref_full_staff`. */
    staffName: z.string().trim().min(1, 'Your name is required'),
    name_legal_full: z.string().trim().min(1, "Participant name is required").max(255),
    /** `XADT` is a text field on abv_RSA, so the ISO value is stored as-is. */
    XADT: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Assessment date is required')
      .refine(
        (value) => value <= new Date().toISOString().slice(0, 10),
        'Cannot select a future date',
      ),
    /** Free-text "anything else you'd like to discuss?" — optional. */
    discuss_te: z.string().trim().max(5000).default(''),
    /** ISO timestamp captured when the participant started the assessment. */
    timestamp_beginRSA: z.string().datetime({ offset: true }).nullable(),
  })
  .merge(answers);

export type RSASubmission = z.infer<typeof rsaSubmissionSchema>;

/** Result handed back to the RSA form. */
export type RSASubmitResult =
  | { ok: true; uuid: string; recordId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
