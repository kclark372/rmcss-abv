'use server';

import { randomUUID } from 'node:crypto';

import { grantAccess, hasAccess, passwordMatches, revokeAccess } from '@/lib/access';
import { LAYOUTS, withSession } from '@/lib/fm/client';
import { FMError, type FMFieldData } from '@/lib/fm/types';
import { toFMBool, toFMLocalTimestamp } from '@/lib/fm/format';
import { RSA_QUESTION_KEYS } from '@/lib/schemas/rsa-questions';
import {
  rsaLinkSubmissionSchema,
  type PidCheckResult,
  type RSALinkSubmitResult,
} from '@/lib/schemas/rsa-link';
import { timeframeForWave } from '@/lib/schemas/rsa-timeframe';

/**
 * Server actions behind the staff-run self-assessment link (`/rsa`).
 *
 * Every action except `unlock` re-checks the access cookie: the password gate
 * in the browser is only a convenience, this is the real one.
 */

/** Checks the shared password and, if right, sets the access cookie. */
export async function unlock(password: unknown): Promise<{ ok: boolean; error?: string }> {
  if (typeof password !== 'string' || !passwordMatches(password)) {
    return { ok: false, error: 'Incorrect password.' };
  }
  await grantAccess();
  return { ok: true };
}

/** Signs this tablet out. */
export async function lock(): Promise<void> {
  await revokeAccess();
}

/**
 * Best-effort PID check against the participants layout.
 *
 * Never throws and never blocks staff: any trouble (layout not available to the
 * API account, server unreachable, …) comes back as `unknown`.
 */
export async function checkPid(pid: unknown): Promise<PidCheckResult> {
  if (!(await hasAccess())) return 'unknown';
  if (typeof pid !== 'string' || !/^\d{1,9}$/.test(pid)) return 'unknown';

  try {
    const matches = await withSession((session) =>
      session.find(LAYOUTS.participants, [{ pid: `==${pid}` }], 1),
    );
    return matches.length > 0 ? 'found' : 'not_found';
  } catch (error) {
    console.error('[rsa-link] PID check skipped:', error);
    return 'unknown';
  }
}

/** Creates one `rsa` record (layout `api_rsa`) from a completed self-assessment. */
export async function submitLinkAssessment(input: unknown): Promise<RSALinkSubmitResult> {
  if (!(await hasAccess())) {
    return { ok: false, error: 'Your session has expired. Sign in again.', locked: true };
  }

  const parsed = rsaLinkSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Some answers are missing or invalid.' };
  }
  const data = parsed.data;

  const fieldData: FMFieldData = {
    __UUID: randomUUID(),
    XSID: data.xsid,
    _PID: data.pid,
    // XOBS holds the meeting number (wave). XADT is not auto-entered on `rsa`.
    XADT: data.XADT,
    XOBS: data.wave,
    timeframe: timeframeForWave(data.wave),
    discuss_te: data.discuss_te,
    timestamp_beginRSA: data.timestamp_beginRSA ? toFMLocalTimestamp(data.timestamp_beginRSA) : '',
  };

  for (const key of RSA_QUESTION_KEYS) {
    fieldData[key] = toFMBool(data[key]);
  }

  // Section 2 is skipped when Q1 is "none", so it can never carry answers.
  if (data.s1z_none) {
    for (const key of RSA_QUESTION_KEYS) {
      if (key.startsWith('s2')) fieldData[key] = '0';
    }
  }

  try {
    await withSession((session) => session.createRecord(LAYOUTS.rsaLink, fieldData));
    return { ok: true };
  } catch (error) {
    if (error instanceof FMError) {
      console.error(`[rsa-link] FileMaker ${error.code}: ${error.message}`);
      return {
        ok: false,
        error: `FileMaker could not save this assessment (error ${error.code}: ${error.message}).`,
      };
    }
    console.error('[rsa-link]', error);

    // Setup problems are worth naming; the messages hold variable names only.
    if (error instanceof Error && error.message.startsWith('Missing FileMaker environment variables')) {
      return { ok: false, error: `${error.message}. Set them in Vercel for this environment and redeploy.` };
    }
    // A failed fetch to FileMaker (wrong host, server down, not reachable from Vercel).
    if (error instanceof TypeError) {
      return {
        ok: false,
        error: 'Could not reach the FileMaker server. Check FM_SERVER_URL and that the server is reachable from Vercel.',
      };
    }
    return { ok: false, error: 'Could not save this assessment. Check the connection and try again.' };
  }
}
