import { z } from 'zod';

/**
 * Validation for the RMC meeting form, which writes one `abv_RMC` record and,
 * when the participant wants a referral, one child `abv_tx` record.
 */

export const GOALS = [
  { value: 'recovery', label: 'Staying in recovery', phrase: 'stay in recovery' },
  { value: 'checkup', label: 'Just staying in touch for the next checkup meeting', phrase: 'stay in touch for the next checkup meeting' },
  { value: 'safer', label: 'Getting help to be safer when using', phrase: 'get help to be safer when using' },
  { value: 'treatment', label: 'Staying in treatment', phrase: 'stay in treatment' },
  { value: 'into-treatment', label: 'Getting into treatment', phrase: 'get into treatment' },
  { value: 'other', label: 'Something else', phrase: '' },
] as const;

export const GOAL_VALUES = GOALS.map((g) => g.value) as unknown as [string, ...string[]];

/** Referral types — each is a "1"/"0" field on abv_tx. */
export const REFERRAL_TYPES = [
  { key: 'ref_central', label: 'Central intake/not sure' },
  { key: 'ref_outpt', label: 'Outpatient' },
  { key: 'ref_intOutpt', label: 'Intensive Outpatient' },
  { key: 'ref_resident', label: 'Residential' },
  { key: 'ref_detox', label: 'Detox' },
  { key: 'ref_bupe', label: 'Buprenorphine' },
  { key: 'ref_mdone', label: 'Methadone' },
  { key: 'ref_naltrex', label: 'Naltrexone' },
  { key: 'ref_other', label: 'Other, please specify' },
] as const;

export type ReferralTypeKey = (typeof REFERRAL_TYPES)[number]['key'];

/** Alternative actions when no referral is wanted — "1"/"0" fields on abv_RMC. */
export const ALT_OPTIONS = [
  { key: 'alt_reduce', label: 'Reduce use' },
  { key: 'alt_ssp', label: 'Use syringe exchange / overdose prevention services' },
  { key: 'alt_nar', label: 'Take Narcan/fentanyl test strips' },
  { key: 'alt_counselor', label: 'Talk to your counselor' },
  { key: 'alt_selfHelp', label: 'Attend self-help meetings' },
  { key: 'alt_sponsor', label: 'Get a sponsor' },
  { key: 'alt_reconnect', label: 'Re-connect with sober family and friends' },
  { key: 'alt_job', label: 'Look for a job' },
  { key: 'alt_faith', label: 'Attend faith-based program (e.g., church, synagogue, mosque, temple, etc.)' },
  { key: 'alt_school', label: 'Attend school' },
  { key: 'alt_other', label: 'Something else, please specify' },
  { key: 'alt_none', label: 'None of above' },
] as const;

export type AltOptionKey = (typeof ALT_OPTIONS)[number]['key'];

/** Participant status at the end of the meeting — stored in `lm_ptStatus`. */
export const PARTICIPANT_STATUS_OPTIONS = [
  'No current substance use',
  'Substance use and not interested in any behavior change or recovery services',
  'Currently in treatment',
  'Referred to harm reduction services',
  'Agreed to other behavior change',
  'Referred to treatment',
] as const;

export const TRANSPORT_OPTIONS = [
  { value: 'self', label: 'Self-transport (skip pickup)' },
  { value: 'bus', label: 'Bus card (skip pickup)' },
  { value: 'lyft', label: 'Lyft' },
  { value: 'uber', label: 'Uber' },
  { value: 'lic', label: 'LI-C' },
  { value: 'other', label: 'Other, please specify' },
] as const;

/** Transport methods that need pickup details collected. */
export const TRANSPORT_NEEDING_PICKUP: readonly string[] = ['lyft', 'uber', 'lic'];

export const REFERRAL_AGENCIES = [
  'ACHN (Access Community Health Network)',
  'Above and Beyond',
  'Above and Beyond Family Recovery Center',
  'Break the Cycle Foundation',
  'CCJ/Cermak',
  'Chicago Treatment and Counseling Center III',
  'Christian Community Health',
  'Christian Community Health Center',
  'Cook County Health',
  'Cook County Health Austin Health Center',
  'Drexel Counseling Inc',
  'El Rincon',
  'Eva Mae-67th Halsted',
  'Family Friend Health Center',
  'Family Guidance Center',
  'Family Guidance Centers Inc',
  'Family Guidance-Chicago Ave',
  'Family Guidance-Wabash',
  'FGC Brandon House',
  'Garfield Counseling Center',
  'Gateway',
  'Gateway Foundation',
  'Haymarket Center',
  'HAS (Healthcare Alternative Systems)',
  'Heartland Alliance',
  'HIS',
  'Holy Cross',
  'HRDI',
  'ICI Clinic',
  'LSSI (Lutheran Social Services of Illinois)',
  'Methodist Hospital',
  'Methodist/Thorek New Vision Detox',
  'Miles Square',
  'New Age',
  'New Hope',
  'Olatoye Clinic',
  'PCC Wellness',
  'Rosecrance Health',
  'Roseland Hospital',
  'Rush Presbyterian Hospital',
  'Southwood Interventions',
  'Sundance Methadone Treatment Center',
  'Thresholds',
  'UIC / COIP MOUD',
  'Other',
] as const;

const optionalText = z.string().trim().max(1000).default('');
const optionalDate = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use a valid date')
  .default('');
/** Like `optionalDate`, but the date can't be in the future. */
const optionalPastDate = optionalDate.refine(
  (value) => !value || value <= new Date().toISOString().slice(0, 10),
  'Cannot select a future date',
);
const optionalTime = z
  .string()
  .regex(/^(\d{2}:\d{2}(:\d{2})?)?$/, 'Use a valid time')
  .default('');

const referralFlags = z.object(
  Object.fromEntries(REFERRAL_TYPES.map((t) => [t.key, z.boolean()])) as {
    [K in ReferralTypeKey]: z.ZodBoolean;
  },
);

const altFlags = z.object(
  Object.fromEntries(ALT_OPTIONS.map((o) => [o.key, z.boolean()])) as {
    [K in AltOptionKey]: z.ZodBoolean;
  },
);

export const rmcSubmissionSchema = z
  .object({
    /** The RSA this meeting follows up on. Becomes abv_RMC::_UUID_RSA. */
    rsaUuid: z.string().trim().min(1, 'Look up an assessment before submitting'),

    /** Narrative responses. */
    otherProblems_te: optionalText,
    helpwithUse_te: optionalText,
    reasonChange_te: optionalText,
    reasonTxGo_te: optionalText,
    reason_TxStay_te: optionalText,

    /** Goal setting. */
    goal: z.enum(GOAL_VALUES).or(z.literal('')).default(''),
    goal_te: optionalText,

    /** Readiness rulers, 1-10. Stored in `important` / `confident`. */
    important: z.number().int().min(1).max(10).nullable().default(null),
    confident: z.number().int().min(1).max(10).nullable().default(null),

    /** Meeting start/end times (HH:MM), staff-entered. Stored as time fields. */
    time_RMC_begin: optionalTime,
    time_RMC_end: optionalTime,

    /**
     * Participant status at end of meeting — a check-all list joined with ", ".
     * Stored in `lm_ptStatus`.
     */
    lm_ptStatus: z.string().trim().max(1000).default(''),

    /** Recording. Stored in `recording`. */
    recording: z.enum(['yes', 'no']).or(z.literal('')).default(''),
    recording_upload_date: optionalPastDate,
    recording_reason: optionalText,

    wantReferral: z.enum(['yes', 'no']).or(z.literal('')).default(''),

    /** Referral detail — only written when wantReferral === 'yes'. */
    ref_other_te: optionalText,
    ref_agency: z.string().trim().max(255).default(''),
    agency_other: optionalText,
    ref_agency_details: optionalText,
    intake_date: optionalDate,
    intake_time: optionalTime,
    transport: z.string().trim().max(50).default(''),
    transportOther_te: optionalText,
    travel_date: optionalDate,
    travel_time: optionalTime,
    travel_addy: optionalText,
    travel_phone: optionalText,
    travel_return: optionalText,
    travel_notes: optionalText,

    alt_other_te: optionalText,
  })
  .merge(referralFlags)
  .merge(altFlags);

export type RMCSubmission = z.infer<typeof rmcSubmissionSchema>;

/** The RSA context the RMC form loads and plays back to the participant. */
export interface RSAContext {
  uuid: string;
  name_legal_full: string;
  agency: string;
  /** "Your name" (staff). From FileMaker `name_pref_full_staff`. */
  staffName: string;
  /** `XADT` from abv_RSA — the assessment date, ISO `YYYY-MM-DD`. */
  XADT: string;
  discuss_te: string;
  /** Every s1..s8 answer, as booleans. */
  answers: Record<string, boolean>;
}

export type RSALookupResult =
  | { ok: true; rsa: RSAContext }
  | { ok: false; error: string };

export type RMCSubmitResult =
  | { ok: true; uuid: string; recordId: string; treatmentUuid: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
