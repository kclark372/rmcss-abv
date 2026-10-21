'use server';

import { randomUUID } from 'node:crypto';

import { grantAccess, hasAccess, passwordMatches } from '@/lib/access';
import { LAYOUTS, withSession, type FMSession } from '@/lib/fm/client';
import { FMError, type FMFieldData } from '@/lib/fm/types';
import { toFMBool, toFMLocalTimestamp } from '@/lib/fm/format';
import { RSA_QUESTION_KEYS } from '@/lib/schemas/rsa-questions';
import {
  rsaLinkSubmissionSchema,
  type PidCheckResult,
  type RosterResult,
  type RSALinkSubmitResult,
  type StaffMember,
} from '@/lib/schemas/rsa-link';
import { timeframeForWave, waveFromLabel } from '@/lib/schemas/rsa-timeframe';

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

const MAX_ROSTER = 500;

/**
 * A `staff` record as a dropdown entry. Needs an organization, a name and a
 * staff ID; anyone explicitly marked inactive (`is_active` = 0) is left out.
 */
function toStaffMember(fields: Record<string, string>): StaffMember | null {
  const agency = fields.agency?.trim();
  const name = fields.display_name?.trim();
  const xsid = fields.xsid?.trim();
  if (!agency || !name || !xsid || fields.is_active === '0') return null;
  return { agency, name, xsid };
}

function describeConfigError(error: unknown): string | null {
  if (error instanceof Error && error.message.startsWith('Missing FileMaker environment variables')) {
    return `${error.message}. Set them in Vercel for this environment and redeploy.`;
  }
  if (error instanceof TypeError) {
    return 'Could not reach the FileMaker server. Check FM_SERVER_URL and that the server is reachable from Vercel.';
  }
  return null;
}

/** The people for the organization and staff-name dropdowns, from FileMaker. */
export async function loadRoster(): Promise<RosterResult> {
  if (!(await hasAccess())) return { ok: false, error: 'Your session has expired. Sign in again.' };

  try {
    const records = await withSession((session) =>
      session.find(LAYOUTS.staff, [{ agency: '*' }], MAX_ROSTER),
    );
    const roster = records
      .map((record) => toStaffMember(record.fieldData))
      .filter((member): member is StaffMember => member !== null)
      .sort((a, b) => a.agency.localeCompare(b.agency) || a.name.localeCompare(b.name));
    return { ok: true, roster };
  } catch (error) {
    console.error('[rsa-link] could not load staff:', error);
    return {
      ok: false,
      error: describeConfigError(error) ?? 'Could not load the staff list from FileMaker. Try again.',
    };
  }
}

/** Looks the PID up and reads which meeting is open for it (`wave_now_rmc`). */
async function lookupWave(session: FMSession, pid: string): Promise<PidCheckResult> {
  const [participant] = await session.find(LAYOUTS.participants, [{ pid: `==${pid}` }], 1);
  if (!participant) return { status: 'not_found' };

  const waveLabel = participant.fieldData.wave_now_rmc?.trim() ?? '';
  if (!waveLabel) return { status: 'no_wave' };

  const wave = waveFromLabel(waveLabel);
  return wave ? { status: 'found', wave, waveLabel } : { status: 'bad_wave', waveLabel };
}

/**
 * Checks a PID against the participants layout and reads its current meeting.
 * A hard stop: anything other than `found` (including a failed lookup) keeps
 * staff on the entry screen.
 */
export async function checkPid(pid: unknown): Promise<PidCheckResult> {
  if (!(await hasAccess())) return { status: 'unknown' };
  if (typeof pid !== 'string' || !/^\d{1,9}$/.test(pid)) return { status: 'not_found' };

  try {
    return await withSession((session) => lookupWave(session, pid));
  } catch (error) {
    console.error('[rsa-link] PID check failed:', error);
    return { status: 'unknown' };
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
    _PID: data.pid,
    // XADT is set by FileMaker on creation. XOBS and timeframe come from the
    // participant's current meeting, read below.
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
    const outcome = await withSession(async (session) => {
      // Never trust the browser: confirm the staff member and the PID again, and
      // take the staff name from FileMaker rather than from the request.
      const [staffRecord] = await session.find(LAYOUTS.staff, [{ xsid: `==${data.xsid}` }], 1);
      const staff = staffRecord ? toStaffMember(staffRecord.fieldData) : null;
      if (!staff || staff.agency !== data.agency) return 'bad_staff' as const;
      const meeting = await lookupWave(session, data.pid);
      if (meeting.status !== 'found') return meeting;

      await session.createRecord(LAYOUTS.rsaLink, {
        ...fieldData,
        // XOBS holds the meeting number (0, 1, 3, 6 or 9). Staff see it as the
        // label in wave_now_rmc ("Enrollment", "M1", "M3", …).
        XOBS: meeting.wave,
        timeframe: timeframeForWave(meeting.wave),
        agency: staff.agency,
        name_pref_full_staff: staff.name,
        XSID: staff.xsid,
      });
      return 'saved' as const;
    });

    if (outcome === 'bad_staff') {
      return { ok: false, error: 'That staff member was not found. Go back and choose again.' };
    }
    if (outcome === 'saved') return { ok: true };
    if (outcome.status === 'not_found') {
      return { ok: false, error: 'That PID was not found. Go back and check it.' };
    }
    if (outcome.status === 'no_wave') {
      return { ok: false, error: 'No RMC meeting is open for this PID right now.' };
    }
    return {
      ok: false,
      error: `This PID's meeting "${outcome.status === 'bad_wave' ? outcome.waveLabel : ''}" is not one this form recognises.`,
    };
  } catch (error) {
    if (error instanceof FMError) {
      console.error(`[rsa-link] FileMaker ${error.code}: ${error.message}`);
      return {
        ok: false,
        error: `FileMaker could not save this assessment (error ${error.code}: ${error.message}).`,
      };
    }
    console.error('[rsa-link]', error);
    return {
      ok: false,
      error: describeConfigError(error) ?? 'Could not save this assessment. Check the connection and try again.',
    };
  }
}
