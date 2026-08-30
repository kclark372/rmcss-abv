'use server';

import { randomUUID } from 'node:crypto';

import { LAYOUTS, withSession, type FMSession } from '@/lib/fm/client';
import { FMError, type FMFieldData } from '@/lib/fm/types';
import {
  fromFMBool,
  toFMBool,
  toFMDate,
  toFMDateFromDate,
  toFMTimeFromDate,
} from '@/lib/fm/format';
import { concatSectionRecap, RSA_QUESTION_KEYS } from '@/lib/schemas/rsa-questions';
import {
  ALT_OPTIONS,
  REFERRAL_TYPES,
  rmcSubmissionSchema,
  type RMCSubmitResult,
  type RSAContext,
  type RSALookupResult,
} from '@/lib/schemas/rmc';

/**
 * Looks up the self-assessment an RMC meeting follows up on.
 *
 * The RMC form needs it for two reasons: to play the participant's own answers
 * back to them during the conversation, and to carry identity plus the
 * concatenated legal/housing status onto the `abv_RMC` record.
 */
export async function lookupRSA(uuidInput: unknown): Promise<RSALookupResult> {
  const uuid = typeof uuidInput === 'string' ? uuidInput.trim() : '';
  if (!uuid) return { ok: false, error: 'Enter an assessment ID.' };

  try {
    const records = await withSession((session) =>
      // "==" is an exact match in FileMaker find syntax; "=" alone means "begins with".
      session.find(LAYOUTS.rsa, [{ __UUID: `==${uuid}` }], 1),
    );

    const record = records[0];
    if (!record) {
      return { ok: false, error: `No assessment found with ID ${uuid}.` };
    }

    return { ok: true, rsa: toRSAContext(record.fieldData, uuid) };
  } catch (error) {
    return { ok: false, error: describeError(error, 'look up that assessment') };
  }
}

/**
 * Creates one `abv_RMC` record, plus one child `abv_tx` record when the
 * participant asked for a treatment referral.
 *
 * Both writes share a single Data API session. The RMC record is created first
 * because `abv_tx::_UUID_RMC` points back at it.
 */
export async function submitRMC(input: unknown): Promise<RMCSubmitResult> {
  const parsed = rmcSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Some answers are missing or invalid.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  try {
    return await withSession(async (session) => {
      // Re-read the assessment inside this session: the browser has been
      // holding it for the length of a meeting and it may have moved on.
      const rsa = await loadRSAForSubmit(session, data.rsaUuid);
      if (!rsa) {
        return {
          ok: false as const,
          error: `No assessment found with ID ${data.rsaUuid}.`,
        };
      }

      const now = new Date();
      const rmcUuid = randomUUID();

      const rmcFields: FMFieldData = {
        __UUID: rmcUuid,
        _UUID_RSA: rsa.uuid,

        // Identity carried forward from the assessment.
        name_legal_full: rsa.name_legal_full,
        agency: rsa.agency,
        name_pref_full_staff: rsa.staffName,

        // date_RSA and date_RMC are true date fields, so MM/DD/YYYY.
        date_RSA: toFMDate(rsa.XADT),
        date_RMC: toFMDateFromDate(now),
        time_RMC_begin: toFMTimeFromDate(now),
        time_RMC_end: toFMTimeFromDate(now),

        legalStatus: concatSectionRecap(rsa.answers, 7),
        housingStatus: concatSectionRecap(rsa.answers, 8),
        RSA_discuss_te: rsa.discuss_te,

        otherProblems_te: data.otherProblems_te,
        helpwithUse_te: data.helpwithUse_te,
        reasonChange_te: data.reasonChange_te,
        reasonTxGo_te: data.reasonTxGo_te,
        reason_TxStay_te: data.reason_TxStay_te,

        goal: data.goal,
        goal_te: data.goal_te,
        important: data.important === null ? '' : String(data.important),
        confident: data.confident === null ? '' : String(data.confident),

        wantReferral: data.wantReferral,

        recording: data.recording,
        recording_upload_date: toFMDate(data.recording_upload_date),
        recording_reason: data.recording_reason,

        alt_other_te: data.wantReferral === 'no' ? data.alt_other_te : '',
      };

      // Alternative actions only apply when no referral was requested.
      for (const option of ALT_OPTIONS) {
        rmcFields[option.key] = toFMBool(
          data.wantReferral === 'no' && data[option.key],
        );
      }

      const createdRMC = await session.createRecord(LAYOUTS.rmc, rmcFields);

      let treatmentUuid: string | null = null;
      if (data.wantReferral === 'yes') {
        treatmentUuid = randomUUID();

        const txFields: FMFieldData = {
          // abv_tx::__UUID has no auto-enter, so it must be supplied here.
          __UUID: treatmentUuid,
          _UUID_RMC: rmcUuid,

          name_legal_full: rsa.name_legal_full,
          agency: rsa.agency,
          name_pref_full_staff: rsa.staffName,

          ref_other_te: data.ref_other_te,
          // ref_agency / ref_agency_details are the newer pair on abv_tx;
          // the older _agency / agency_details fields are left untouched.
          ref_agency: data.ref_agency,
          agency_other: data.ref_agency === 'Other' ? data.agency_other : '',
          ref_agency_details: data.ref_agency_details,

          // Every date and time on abv_tx is a text field, so the ISO values
          // from the form are stored verbatim.
          intake_date: data.intake_date,
          intake_time: data.intake_time,
          travel_date: data.travel_date,
          travel_time: data.travel_time,

          transport: data.transport,
          transportOther_te:
            data.transport === 'other' ? data.transportOther_te : '',

          travel_addy: data.travel_addy,
          travel_phone: data.travel_phone,
          travel_return: data.travel_return,
          travel_notes: data.travel_notes,
        };

        for (const type of REFERRAL_TYPES) {
          txFields[type.key] = toFMBool(data[type.key]);
        }

        await session.createRecord(LAYOUTS.tx, txFields);
      }

      return {
        ok: true as const,
        uuid: rmcUuid,
        recordId: createdRMC.recordId,
        treatmentUuid,
      };
    });
  } catch (error) {
    return { ok: false, error: describeError(error, 'save this meeting') };
  }
}

async function loadRSAForSubmit(
  session: FMSession,
  uuid: string,
): Promise<RSAContext | null> {
  const records = await session.find(LAYOUTS.rsa, [{ __UUID: `==${uuid}` }], 1);
  const record = records[0];
  return record ? toRSAContext(record.fieldData, uuid) : null;
}

/** Shapes one `abv_RSA` record into the context both the lookup and the write use. */
function toRSAContext(fields: Record<string, string>, fallbackUuid: string): RSAContext {
  const answers: Record<string, boolean> = {};
  for (const key of RSA_QUESTION_KEYS) {
    answers[key] = fromFMBool(fields[key]);
  }

  return {
    uuid: fields.__UUID ?? fallbackUuid,
    name_legal_full: fields.name_legal_full ?? '',
    agency: fields.agency ?? '',
    staffName: fields.name_pref_full_staff ?? '',
    XADT: fields.XADT ?? '',
    discuss_te: fields.discuss_te ?? '',
    answers,
  };
}

function describeError(error: unknown, action: string): string {
  if (error instanceof FMError) {
    console.error(`[submit-rmc] FileMaker ${error.code}: ${error.message}`);
    return `FileMaker could not ${action} (error ${error.code}: ${error.message}).`;
  }
  console.error('[submit-rmc]', error);
  return `Could not ${action}. Check the server connection and try again.`;
}
