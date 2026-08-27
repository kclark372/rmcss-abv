'use server';

import { randomUUID } from 'node:crypto';

import { LAYOUTS, withSession } from '@/lib/fm/client';
import { FMError, type FMFieldData } from '@/lib/fm/types';
import { toFMBool, toFMTimestamp } from '@/lib/fm/format';
import { RSA_QUESTION_KEYS } from '@/lib/schemas/rsa-questions';
import { rsaSubmissionSchema, type RSASubmitResult } from '@/lib/schemas/rsa';

/**
 * Creates one `abv_RSA` record from a completed self-assessment.
 *
 * Runs only on the server: FileMaker credentials never reach the browser.
 * The generated `__UUID` is returned so staff can quote it on the RMC form.
 */
export async function submitRSA(input: unknown): Promise<RSASubmitResult> {
  const parsed = rsaSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Some answers are missing or invalid.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const uuid = randomUUID();

  const fieldData: FMFieldData = {
    __UUID: uuid,
    agency: data.agency,
    XSID: data.XSID,
    name_legal_full: data.name_legal_full,
    // XADT is a text field on abv_RSA, so the ISO date is stored verbatim.
    XADT: data.XADT,
    timestamp_beginRSA: data.timestamp_beginRSA
      ? toFMTimestamp(new Date(data.timestamp_beginRSA))
      : '',
  };

  for (const key of RSA_QUESTION_KEYS) {
    fieldData[key] = toFMBool(data[key]);
  }

  try {
    const created = await withSession((session) =>
      session.createRecord(LAYOUTS.rsa, fieldData),
    );
    return { ok: true, uuid, recordId: created.recordId };
  } catch (error) {
    return { ok: false, error: describeError(error, 'save this assessment') };
  }
}

/** Turns a thrown value into something safe and useful to show a staff member. */
function describeError(error: unknown, action: string): string {
  if (error instanceof FMError) {
    console.error(`[submit-rsa] FileMaker ${error.code}: ${error.message}`);
    return `FileMaker could not ${action} (error ${error.code}: ${error.message}).`;
  }
  console.error('[submit-rsa]', error);
  return `Could not ${action}. Check the server connection and try again.`;
}
