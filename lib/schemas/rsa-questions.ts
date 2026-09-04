/**
 * The RSA self-assessment question set.
 *
 * This is the single source of truth for both forms: the RSA form renders these
 * as checkboxes, and the RMC form reads the same list back to show the
 * participant what they reported. Every `key` is a real field name on the
 * `abv_RSA` layout — keep them in sync with FileMaker.
 *
 * `recap` is the phrasing used when the answer is played back on the RMC form
 * and inside the concatenated legalStatus / housingStatus fields; `label` is the
 * first-person phrasing shown while taking the assessment.
 */

export interface RSAQuestion {
  key: RSAQuestionKey;
  label: string;
  recap: string;
}

export interface RSASection {
  /** 1-8, matching the s1..s8 field prefix. */
  number: number;
  title: string;
  /** Shown once above the checkboxes on the assessment form. */
  intro?: string;
  /** Heading used when this section is recapped on the RMC form. */
  recapTitle: string;
  questions: RSAQuestion[];
}

/** Shown once at the top of the self-assessment, before section 1. */
export const RSA_INTRODUCTION =
  'This is a short self-assessment to help you and your linkage manager review ' +
  'what has been going on in your life during the past 90 days, including today. ' +
  'Your answers are confidential and will only be used to plan for your services. ' +
  'In this assessment, ‘substances’ and ‘using’ refer to alcohol or drugs, ' +
  'including cannabis and the misuse of prescription medications. Please check all that apply.';

export const RSA_SECTIONS: RSASection[] = [
  {
    number: 1,
    title: 'Substance Use/Recovery Feedback',
    intro: 'During the past 90 days, have you used any:',
    recapTitle: 'From your RMC self-assessment you said you\'ve been using:',
    questions: [
      { key: 's1a_alcohol', label: 'Beer, wine, mixed drinks or other alcohol', recap: 'beer, wine, mixed drinks or other alcohol' },
      { key: 's1b_marijuana', label: 'Marijuana or other forms of cannabis', recap: 'marijuana or other forms of cannabis – either medical or non-medical' },
      { key: 's1c_crack', label: 'Crack, cocaine, methamphetamine or other stimulants', recap: 'crack, cocaine, methamphetamine or other types of stimulants' },
      { key: 's1d_opioids', label: 'Heroin, fentanyl or other opioids', recap: 'heroin, fentanyl or other opioids, including painkillers' },
      { key: 's1e_benzo', label: 'Benzodiazepines or other sedatives', recap: 'benzodiazepines or other sedatives' },
      { key: 's1f_other', label: 'Any other kinds of drugs', recap: 'any other kinds of drugs' },
      { key: 's1z_none', label: 'No alcohol or drug use', recap: 'no alcohol or drug use' },
    ],
  },
  {
    number: 2,
    // No category heading in the spreadsheet — the question stands alone.
    title: '',
    intro:
      'Which of the following apply to you when you were using during the past 90 days:',
    recapTitle: 'And that you\'ve experienced:',
    questions: [
      { key: 's2a_weekly', label: 'Used weekly or more often', recap: 'used weekly or more often' },
      { key: 's2b_spentTime', label: 'Spent a lot of time getting, using, or recovering from using', recap: 'spent a lot of time getting, using, or recovering from using' },
      { key: 's2c_cravings', label: 'Had cravings', recap: 'had cravings' },
      { key: 's2d_probFam', label: 'Had problems with family or relationships', recap: 'had problems with family or relationships' },
      { key: 's2e_probFights', label: 'Kept using even though it was causing problems', recap: 'kept using even though it was causing problems' },
      { key: 's2f_gaveUp', label: 'Gave up or reduced activities', recap: 'gave up or reduced activities' },
      { key: 's2g_withdrawal', label: 'Had withdrawal problems', recap: 'had withdrawal problems' },
      { key: 's2h_sick', label: 'Kept using to stop feeling sick', recap: 'kept using to stop feeling sick' },
      { key: 's2i_inject', label: 'Injected any substance', recap: 'injected any substance' },
      { key: 's2j_blackout', label: 'Had a blackout', recap: 'had a blackout' },
      { key: 's2k_overdose', label: 'Had an overdose requiring medical attention', recap: 'had an overdose requiring medical attention' },
      { key: 's2z_none', label: 'No problems reported', recap: 'no problems reported' },
    ],
  },
  {
    number: 3,
    title: 'Treatment participation and recovery support feedback',
    intro: 'Which of the following apply to you during the past 90 days:',
    recapTitle: 'Help you have received for your drug and alcohol use',
    questions: [
      { key: 's3a_selfhelp', label: 'Attended self-help or peer support group', recap: 'attended a self-help, peer support, or other recovery support group meeting' },
      { key: 's3b_sponsor', label: 'Worked with sponsor, mentor, or recovery coach', recap: 'worked with a sponsor, mentor, recovery coach or peer support specialist' },
      { key: 's3c_sutx', label: 'Participated in substance use treatment', recap: 'participated in substance use treatment' },
      { key: 's3d_meds', label: 'Received medication for substance use disorder', recap: 'received medication for substance use disorder' },
      { key: 's3e_detox', label: 'Received detoxification services', recap: 'received detoxification services' },
      { key: 's3f_er', label: 'Gone to emergency room', recap: 'gone to the emergency room' },
      { key: 's3g_nalox', label: 'Carried naloxone/Narcan', recap: 'carried naloxone/Narcan' },
      { key: 's3z_none', label: 'No services reported', recap: 'no services reported' },
    ],
  },
  {
    number: 4,
    title: 'Desire for help',
    intro: 'Which of the following make you want to change or stop your substance use?',
    recapTitle: 'Reasons you mentioned why you did want to change or get help',
    questions: [
      { key: 's4a_balance', label: 'Get more balance or stability', recap: 'get more balance or stability in your life' },
      { key: 's4b_feel', label: "Don't like the way using makes you feel", recap: "don't like the way using makes you feel" },
      { key: 's4c_hurting', label: 'Substances are hurting your body', recap: 'substances are hurting your body' },
      { key: 's4d_quit', label: 'Family wants you to quit', recap: 'family wants you to quit' },
      { key: 's4e_money', label: 'It costs too much money', recap: 'it costs too much money' },
      { key: 's4f_supPeople', label: 'Want support from people in recovery', recap: 'want support from people in recovery' },
      { key: 's4g_problems', label: 'Tired of problems caused by use', recap: 'tired of problems caused by use' },
      { key: 's4h_legal', label: 'Legal pressure', recap: 'legal pressure' },
      { key: 's4i_custody', label: 'Want to keep custody of kids', recap: 'want to keep custody of kids' },
      { key: 's4j_supFriends', label: 'Need support from friends and family', recap: 'need support from friends and family' },
      { key: 's4k_trouble', label: "Don't want trouble at work", recap: "don't want trouble at work" },
      { key: 's4z_none', label: 'No reasons reported', recap: 'no reasons reported' },
    ],
  },
  {
    number: 5,
    title: 'Treatment Expectations',
    intro:
      'Which of the following reflects your current thoughts about participating in treatment?',
    recapTitle: 'Your current thoughts about participating in treatment',
    questions: [
      { key: 's5a_txhelp', label: 'Treatment could help you', recap: 'treatment could help you' },
      { key: 's5b_others', label: 'Family wants you in treatment', recap: 'family members or other people want you to be in treatment' },
      { key: 's5c_chance', label: 'Treatment may be your best chance', recap: 'treatment may be your best chance' },
      { key: 's5d_month', label: 'Plan to stay at least a month', recap: 'plan to stay at least a month' },
      { key: 's5e_needtx', label: 'Need to go back to treatment', recap: 'need to go back to treatment' },
      { key: 's5f_famTogether', label: 'Need treatment to keep family together', recap: 'need treatment to keep your family together' },
      { key: 's5g_comeBack', label: 'Will probably need treatment again', recap: 'will probably need treatment again' },
      { key: 's5h_pressure', label: 'Under pressure to be in treatment', recap: 'are under pressure to be in treatment' },
      { key: 's5z_none', label: 'No reasons given', recap: 'no reasons given' },
    ],
  },
  {
    number: 6,
    title: 'Treatment Barriers',
    intro: 'Which of the following are barriers to you participating in treatment?',
    recapTitle: 'Things that might make it difficult for you to go to or stay in treatment',
    questions: [
      { key: 's6a_friends', label: 'Friends will try to get you to use again', recap: 'friends will try to get you to drink or use again' },
      { key: 's6b_way', label: 'Do not have a way to get to treatment', recap: 'do not have a way to get to treatment' },
      { key: 's6c_tooMany', label: 'Too many responsibilities', recap: 'have too many responsibilities' },
      { key: 's6d_tooFar', label: "It's too far or takes too long", recap: "it's too far or takes too long" },
      { key: 's6e_resist', label: 'Hard to resist using where you live/work', recap: 'it is hard to resist using where you live or work' },
      { key: 's6f_coverage', label: 'No insurance or not enough money', recap: 'no insurance or not enough money' },
      { key: 's6g_hours', label: 'Program hours not convenient', recap: 'program hours are not convenient' },
      { key: 's6h_difficult', label: 'Treatment too difficult to manage', recap: 'treatment is too difficult to manage' },
      { key: 's6i_openings', label: 'No openings in the treatment you want', recap: 'no openings in the treatment you want' },
      { key: 's6j_find', label: 'Could not find the type you wanted', recap: 'could not find the type you wanted' },
      { key: 's6k_exp', label: 'Had negative experiences before', recap: 'had negative experiences before' },
      { key: 's6l_childcare', label: 'Problems getting childcare', recap: 'problems getting childcare' },
      { key: 's6z_none', label: 'No barriers reported', recap: 'no barriers reported' },
    ],
  },
  {
    number: 7,
    title: 'Legal System Status',
    intro: 'Which of the following apply to you during the past 90 days?',
    recapTitle: 'Legal Status',
    questions: [
      { key: 's7a_arrest', label: 'Arrested 1 or more times', recap: 'arrested 1 or more times' },
      { key: 's7b_jail', label: 'Spent time in jail or prison', recap: 'spent 1 or more nights in detention, jail or prison' },
      { key: 's7c_trial', label: 'Awaiting trial currently', recap: 'awaiting trial currently' },
      { key: 's7d_sentence', label: 'Awaiting sentencing currently', recap: 'awaiting sentencing currently' },
      { key: 's7e_prob', label: 'On probation or parole currently', recap: 'on probation, parole or other community supervision currently' },
      { key: 's7f_electric', label: 'Electronic monitoring currently', recap: 'electronic monitoring currently' },
      { key: 's7g_other', label: 'Other legal status', recap: 'other legal status currently' },
      { key: 's7z_none', label: 'No legal issues', recap: 'no legal issues' },
    ],
  },
  {
    number: 8,
    title: 'Housing Status',
    intro: 'Which of the following apply to you during the past 90 days?',
    recapTitle: 'Housing Status',
    // NOTE: abv_RSA has no `s8z_none` field, so section 8 has no "none" option.
    // If one is wanted, add the field in FileMaker and put it on the layout first.
    questions: [
      { key: 's8a_outside', label: 'Slept outside, in a car, or was unhoused', recap: 'slept outside, in a car or was unhoused' },
      { key: 's8b_shelter', label: 'Stayed in shelter or temporary housing', recap: 'stayed in a shelter or temporary housing' },
      { key: 's8c_risk', label: 'Were at risk of being unhoused', recap: 'were at risk of being unhoused' },
      { key: 's8d_stable', label: 'Had stable housing', recap: 'had stable housing' },
      { key: 's8e_others', label: 'Lived with people using or fighting', recap: 'lived with other people who were drinking, using, fighting or involved in illegal activity' },
      { key: 's8f_safe', label: 'Did not feel safe where staying', recap: 'did not feel safe where you were staying' },
      { key: 's8g_facility', label: 'Spent 14+ days in facility', recap: 'spent 14 or more days in a jail, hospital or other supervised facility' },
      { key: 's8h_support', label: 'Stayed where supported recovery', recap: 'stayed where other people supported you being in treatment and recovery' },
      { key: 's8i_soberh', label: 'Stayed in recovery home or sober housing', recap: 'stayed in a recovery home or sober housing' },
      { key: 's8j_other', label: 'Other housing situation', recap: 'other housing situation' },
    ],
  },
];

/** Every question field name across all eight sections. */
export const RSA_QUESTION_KEYS = [
  's1a_alcohol', 's1b_marijuana', 's1c_crack', 's1d_opioids', 's1e_benzo', 's1f_other', 's1z_none',
  's2a_weekly', 's2b_spentTime', 's2c_cravings', 's2d_probFam', 's2e_probFights', 's2f_gaveUp',
  's2g_withdrawal', 's2h_sick', 's2i_inject', 's2j_blackout', 's2k_overdose', 's2z_none',
  's3a_selfhelp', 's3b_sponsor', 's3c_sutx', 's3d_meds', 's3e_detox', 's3f_er', 's3g_nalox', 's3z_none',
  's4a_balance', 's4b_feel', 's4c_hurting', 's4d_quit', 's4e_money', 's4f_supPeople', 's4g_problems',
  's4h_legal', 's4i_custody', 's4j_supFriends', 's4k_trouble', 's4z_none',
  's5a_txhelp', 's5b_others', 's5c_chance', 's5d_month', 's5e_needtx', 's5f_famTogether',
  's5g_comeBack', 's5h_pressure', 's5z_none',
  's6a_friends', 's6b_way', 's6c_tooMany', 's6d_tooFar', 's6e_resist', 's6f_coverage', 's6g_hours',
  's6h_difficult', 's6i_openings', 's6j_find', 's6k_exp', 's6l_childcare', 's6z_none',
  's7a_arrest', 's7b_jail', 's7c_trial', 's7d_sentence', 's7e_prob', 's7f_electric', 's7g_other', 's7z_none',
  's8a_outside', 's8b_shelter', 's8c_risk', 's8d_stable', 's8e_others', 's8f_safe', 's8g_facility',
  's8h_support', 's8i_soberh', 's8j_other',
] as const;

export type RSAQuestionKey = (typeof RSA_QUESTION_KEYS)[number];

/** Staff roster, keyed by the organization running the assessment. */
export const STAFF_BY_AGENCY = {
  COIP: ['Virgen Rodriguez', 'Katrina Ivory', 'Jose Alvarez', 'Lauretta Omale'],
  Haymarket: ['Roger Delhaye', 'Tyrone Baker', 'Angela Butler'],
  TEECH: ['Karen White', 'DeShara Shells', 'Jamia Puckett', 'Robert Bufford'],
  'LI-C': [
    'John Palmer',
    'Keo Jean-Joseph',
    'Anthony Abram',
    'Diana Saavedra',
    'Halina Krupa',
  ],
} as const;

export const AGENCIES = ['COIP', 'Haymarket', 'TEECH', 'LI-C'] as const;
export type Agency = (typeof AGENCIES)[number];

/**
 * Joins the checked answers of one section into the comma-separated sentence
 * that `abv_RMC::legalStatus` (section 7) and `housingStatus` (section 8) hold.
 *
 * The RMC form displays the same string it is about to store, so this lives
 * here rather than in the server action and is used by both.
 * The "none" option is excluded — it is an absence, not a status.
 */
export function concatSectionRecap(
  answers: Record<string, boolean>,
  sectionNumber: number,
): string {
  const section = RSA_SECTIONS.find((s) => s.number === sectionNumber);
  if (!section) return '';

  return section.questions
    .filter((q) => !q.key.endsWith('z_none') && answers[q.key])
    .map((q) => q.recap)
    .join(', ');
}
