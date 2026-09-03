'use client';

import { useEffect, useMemo, useState } from 'react';

import { lookupRSA, submitRMC } from '@/app/actions/submit-rmc';
import { DatePicker, TimePicker } from '@/components/date-time';
import { concatSectionRecap, RSA_SECTIONS } from '@/lib/schemas/rsa-questions';
import { TALKING_POINTS, type TalkingPointBlock } from '@/lib/talking-points';
import {
  ALT_OPTIONS,
  GOALS,
  PARTICIPANT_STATUS_OPTIONS,
  REFERRAL_AGENCIES,
  REFERRAL_TYPES,
  TRANSPORT_NEEDING_PICKUP,
  TRANSPORT_OPTIONS,
  type AltOptionKey,
  type ReferralTypeKey,
  type RSAContext,
} from '@/lib/schemas/rmc';
import {
  Alert,
  Button,
  ButtonRow,
  Card,
  CheckboxGrid,
  CheckboxRow,
  ConcatenatedField,
  EmptyRecap,
  Field,
  IdDisplay,
  InfoField,
  PageHeader,
  PageShell,
  RecapItem,
  RecapList,
  Ruler,
  Select,
  Spinner,
  TalkingPoints,
  TextArea,
  TextInput,
} from '@/components/ui';

/**
 * The RMC meeting form.
 *
 * The form plays a participant's self-assessment answers back to guide the
 * conversation, and submitting writes one `abv_RMC` record plus — when a
 * referral is wanted — one child `abv_tx` record.
 *
 * Given an `rsaUuid` it loads that assessment on mount, which is how the guided
 * flow continues straight from a just-finished RSA. Without one it asks staff
 * for an assessment ID, so a meeting can also be picked up later on its own.
 * `onComplete` likewise suppresses the built-in success screen for the flow.
 */

/** The RSA date is stored ISO (`YYYY-MM-DD`); show it as `MM/DD/YYYY`. */
function formatUSDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : iso;
}

type Flags = Record<string, boolean>;

const EMPTY_FLAGS: Flags = {
  ...Object.fromEntries(REFERRAL_TYPES.map((t) => [t.key, false])),
  ...Object.fromEntries(ALT_OPTIONS.map((o) => [o.key, false])),
};

interface FormValues {
  otherProblems_te: string;
  helpwithUse_te: string;
  reasonChange_te: string;
  reasonTxGo_te: string;
  reason_TxStay_te: string;
  goal: string;
  goal_te: string;
  time_RMC_begin: string;
  time_RMC_end: string;
  lm_ptStatus: string;
  recording: string;
  recording_upload_date: string;
  recording_reason: string;
  wantReferral: string;
  ref_other_te: string;
  ref_agency: string;
  agency_other: string;
  ref_agency_details: string;
  intake_date: string;
  intake_time: string;
  transport: string;
  transportOther_te: string;
  travel_date: string;
  travel_time: string;
  travel_addy: string;
  travel_phone: string;
  travel_return: string;
  travel_notes: string;
  alt_other_te: string;
}

const EMPTY_VALUES: FormValues = {
  otherProblems_te: '',
  helpwithUse_te: '',
  reasonChange_te: '',
  reasonTxGo_te: '',
  reason_TxStay_te: '',
  goal: '',
  goal_te: '',
  time_RMC_begin: '',
  time_RMC_end: '',
  lm_ptStatus: '',
  recording: '',
  recording_upload_date: '',
  recording_reason: '',
  wantReferral: '',
  ref_other_te: '',
  ref_agency: '',
  agency_other: '',
  ref_agency_details: '',
  intake_date: '',
  intake_time: '',
  transport: '',
  transportOther_te: '',
  travel_date: '',
  travel_time: '',
  travel_addy: '',
  travel_phone: '',
  travel_return: '',
  travel_notes: '',
  alt_other_te: '',
};

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

export function RMCForm({
  rsaUuid,
  onComplete,
}: {
  rsaUuid?: string;
  onComplete?: () => void;
}) {
  const [rsa, setRsa] = useState<RSAContext | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(Boolean(rsaUuid));

  const [text, setText] = useState<FormValues>(EMPTY_VALUES);
  const [flags, setFlags] = useState<Flags>(EMPTY_FLAGS);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [important, setImportantValue] = useState<number | null>(null);
  const [confident, setConfidentValue] = useState<number | null>(null);

  const [result, setResult] = useState<{ uuid: string; treatmentUuid: string | null } | null>(
    null,
  );

  // Continuing from a just-submitted assessment: load it without asking.
  useEffect(() => {
    if (!rsaUuid) return;

    let cancelled = false;
    setIsLookingUp(true);
    setLookupError(null);

    lookupRSA(rsaUuid)
      .then((found) => {
        if (cancelled) return;
        if (found.ok) setRsa(found.rsa);
        else setLookupError(found.error);
      })
      .catch(() => {
        if (!cancelled) {
          setLookupError('Could not reach the server. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLookingUp(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rsaUuid]);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setField<K extends keyof FormValues>(key: K, value: string) {
    setText((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  }

  function setImportant(value: number) {
    setImportantValue(value);
    clearError('important');
  }

  function setConfident(value: number) {
    setConfidentValue(value);
    clearError('confident');
  }

  function toggleFlag(key: ReferralTypeKey | AltOptionKey) {
    setFlags((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key] && key.startsWith('alt_')) {
        if (key === 'alt_none') {
          // "None of above" is exclusive — clear the other alternatives.
          for (const option of ALT_OPTIONS) {
            if (option.key !== 'alt_none') next[option.key] = false;
          }
        } else {
          next.alt_none = false;
        }
      }
      return next;
    });
    clearError('refTypes');
    clearError('altOptions');
  }

  /**
   * Every question shown on the form is required. Walks the fields that are
   * currently on screen and returns whether they are all answered.
   */
  function validate(): boolean {
    const found: Record<string, string> = {};
    const filled = (value: string) => value.trim().length > 0;
    const need = (key: string, ok: boolean, message = 'This question is required') => {
      if (!ok) found[key] = message;
    };

    need('time_RMC_begin', filled(text.time_RMC_begin), 'Enter a time');
    need('otherProblems_te', filled(text.otherProblems_te));
    need('helpwithUse_te', filled(text.helpwithUse_te));
    need('reasonChange_te', filled(text.reasonChange_te));
    need('reasonTxGo_te', filled(text.reasonTxGo_te));
    need('reason_TxStay_te', filled(text.reason_TxStay_te));

    need('goal', filled(text.goal), 'Select a goal');
    if (text.goal === 'other') need('goal_te', filled(text.goal_te));

    if (goalPhrase) {
      need('important', important !== null, 'Pick a number');
      need('confident', confident !== null, 'Pick a number');
    }

    need('wantReferral', filled(text.wantReferral), 'Select an option');

    if (text.wantReferral === 'yes') {
      need('refTypes', REFERRAL_TYPES.some((t) => flags[t.key]), 'Select at least one');
      if (flags.ref_other) need('ref_other_te', filled(text.ref_other_te));
      need('ref_agency', filled(text.ref_agency), 'Select an agency');
      if (text.ref_agency === 'Other') need('agency_other', filled(text.agency_other));
      need('ref_agency_details', filled(text.ref_agency_details));
      need('intake_date', filled(text.intake_date), 'Pick a date');
      need('intake_time', filled(text.intake_time), 'Enter a time');
      need('transport', filled(text.transport), 'Select a method');
      if (text.transport === 'other') {
        need('transportOther_te', filled(text.transportOther_te));
      }
      if (TRANSPORT_NEEDING_PICKUP.includes(text.transport)) {
        need('travel_date', filled(text.travel_date), 'Pick a date');
        need('travel_time', filled(text.travel_time), 'Enter a time');
        need('travel_addy', filled(text.travel_addy));
        need('travel_phone', filled(text.travel_phone));
        need('travel_return', filled(text.travel_return));
        // travel_notes is optional.
      }
    }

    if (text.wantReferral === 'no') {
      need('altOptions', ALT_OPTIONS.some((o) => flags[o.key]), 'Select at least one');
      if (flags.alt_other) need('alt_other_te', filled(text.alt_other_te));
    }

    need('lm_ptStatus', filled(text.lm_ptStatus), 'Select a status');
    need('recording', filled(text.recording), 'Select an option');
    if (text.recording === 'yes') {
      need('recording_upload_date', filled(text.recording_upload_date), 'Pick a date');
    }
    if (text.recording === 'no') need('recording_reason', filled(text.recording_reason));
    need('time_RMC_end', filled(text.time_RMC_end), 'Enter a time');

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function handleLookup() {
    setIsLookingUp(true);
    setLookupError(null);

    try {
      const found = await lookupRSA(lookupId);
      if (found.ok) {
        setRsa(found.rsa);
      } else {
        setLookupError(found.error);
      }
    } catch {
      setLookupError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSubmit() {
    if (!rsa) return;

    if (!validate()) {
      setSubmitError('Please answer every question before saving.');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitted = await submitRMC({
        rsaUuid: rsa.uuid,
        ...text,
        important,
        confident,
        ...flags,
      });

      if (submitted.ok) {
        if (onComplete) {
          onComplete();
        } else {
          setResult({ uuid: submitted.uuid, treatmentUuid: submitted.treatmentUuid });
        }
      } else {
        setSubmitError(submitted.error);
      }
    } catch {
      setSubmitError('Could not reach the server. Nothing was saved — try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /** The goal phrase read back in the importance and confidence questions. */
  const goalPhrase = useMemo(() => {
    if (text.goal === 'other') return text.goal_te;
    return GOALS.find((g) => g.value === text.goal)?.phrase ?? '';
  }, [text.goal, text.goal_te]);

  function startNewMeeting() {
    setResult(null);
    setSubmitError(null);
    setErrors({});
    setRsa(null);
    setLookupId('');
    setText(EMPTY_VALUES);
    setFlags(EMPTY_FLAGS);
    setImportantValue(null);
    setConfidentValue(null);
  }

  if (result) {
    return (
      <PageShell>
        <PageHeader title="RMC Meeting" />
        <Card>
          <Alert tone="success" title="Meeting recorded">
            The RMC meeting has been saved to FileMaker
            {result.treatmentUuid ? ', along with the treatment referral' : ''}.
          </Alert>
          <IdDisplay label="Meeting ID" value={result.uuid} />
          {result.treatmentUuid ? (
            <IdDisplay label="Referral ID" value={result.treatmentUuid} />
          ) : null}
          <ButtonRow>
            <span />
            <Button onClick={startNewMeeting}>Record another meeting</Button>
          </ButtonRow>
        </Card>
      </PageShell>
    );
  }

  if (!rsa) {
    return (
      <PageShell>
        <PageHeader
          title="RMC Meeting"
          subtitle="Open a participant's self-assessment to begin the meeting."
        />
        {lookupError ? <Alert title="Not found">{lookupError}</Alert> : null}
        <Card
          title="Find the self-assessment"
          description="Enter the Assessment ID shown when the participant's RSA was submitted."
        >
          <Field label="Assessment ID" htmlFor="rsaUuid" required>
            <TextInput
              id="rsaUuid"
              value={lookupId}
              placeholder="00000000-0000-0000-0000-000000000000"
              invalid={Boolean(lookupError)}
              onChange={setLookupId}
            />
          </Field>
          <ButtonRow>
            <span />
            <Button onClick={handleLookup} disabled={isLookingUp || !lookupId.trim()}>
              {isLookingUp ? (
                <>
                  <Spinner /> Looking up…
                </>
              ) : (
                'Open assessment'
              )}
            </Button>
          </ButtonRow>
        </Card>
      </PageShell>
    );
  }

  const wantsReferral = text.wantReferral === 'yes';
  const declinedReferral = text.wantReferral === 'no';
  const needsPickup = TRANSPORT_NEEDING_PICKUP.includes(text.transport);

  return (
    <PageShell>
      <PageHeader title="RMC Meeting" />

      {submitError ? <Alert title="Could not submit">{submitError}</Alert> : null}

      <Card title="Participant Information">
        <dl className="grid gap-3 sm:grid-cols-2">
          <InfoField label="Participant name" value={rsa.name_legal_full} />
          <InfoField label="Agency" value={rsa.agency} />
          <InfoField label="Staff member" value={rsa.staffName} />
          <InfoField label="RSA date" value={formatUSDate(rsa.XADT)} />
        </dl>
        <dl className="mt-3 space-y-3">
          <InfoField
            label="Legal status"
            value={concatSectionRecap(rsa.answers, 7) || 'None reported'}
          />
          <InfoField
            label="Housing status"
            value={concatSectionRecap(rsa.answers, 8) || 'None reported'}
          />
        </dl>
      </Card>

      <Card title="Staff- start recording for CogniTrainer">
        <Field
          label="Meeting start time:"
          htmlFor="time_RMC_begin"
          required
          error={errors.time_RMC_begin}
        >
          <TimePicker
            id="time_RMC_begin"
            value={text.time_RMC_begin}
            onChange={(value) => setField('time_RMC_begin', value)}
          />
        </Field>
      </Card>

      <Card title="Linkage Manager’s Introduction Script">
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <p>
            Hello {rsa.name_legal_full || 'there'}, I’m {rsa.staffName || 'your linkage manager'}.
            Today we’ll be reviewing your self-assessment and talking about how
            you’ve been doing lately and what you might need for support.
          </p>
          <p>
            Thank you for being a part of this project and taking the time to
            allow me to speak with you today. That shows your, commitment. You
            are a responsible person. You know how to follow through/keep your
            word.
          </p>
          <p>
            Let’s chat about how things have been for you lately with your alcohol
            and other drug use. You may recall that the purpose of the program is
            to see if regular checkups help improve your recovery and health.{' '}
            <span className="italic">
              (optional text to read: One helpful way to manage chronic
              conditions is through regular monitoring and checkups. For example,
              people with diabetes don’t wait until an arm or leg needs to be cut
              off before they see a doctor. Instead, they work with their doctor
              to manage the condition on a regular basis. How does that fit with
              your understanding? What do you make of that?)
            </span>
          </p>
        </div>
      </Card>

      <RecapSection sectionNumber={1} rsa={rsa} />

      <RecapSection
        sectionNumber={2}
        rsa={rsa}
        talkingPoints={TALKING_POINTS.q1q2}
        question={{
          label: "Is there any (other) kind of substance use or problems that you've had?",
          value: text.otherProblems_te,
          error: errors.otherProblems_te,
          onChange: (value) => setField('otherProblems_te', value),
        }}
      />

      <RecapSection
        sectionNumber={3}
        rsa={rsa}
        talkingPoints={TALKING_POINTS.q3}
        question={{
          label: 'Have you gotten any (other) help with your alcohol or drug use?',
          value: text.helpwithUse_te,
          error: errors.helpwithUse_te,
          onChange: (value) => setField('helpwithUse_te', value),
        }}
      />

      <RecapSection
        sectionNumber={4}
        rsa={rsa}
        talkingPoints={TALKING_POINTS.q4}
        question={{
          label: 'What is your most important reason (to/you might) consider change?',
          value: text.reasonChange_te,
          error: errors.reasonChange_te,
          onChange: (value) => setField('reasonChange_te', value),
        }}
      />

      <RecapSection
        sectionNumber={5}
        rsa={rsa}
        talkingPoints={TALKING_POINTS.q5}
        question={{
          label: 'What (other) reasons do you think might be helpful to go to treatment?',
          value: text.reasonTxGo_te,
          error: errors.reasonTxGo_te,
          onChange: (value) => setField('reasonTxGo_te', value),
        }}
      />

      <RecapSection
        sectionNumber={6}
        rsa={rsa}
        talkingPoints={TALKING_POINTS.q6}
        question={{
          label:
            'What (other) reasons do you think it might be hard to go or stay in treatment or recovery?',
          value: text.reason_TxStay_te,
          error: errors.reason_TxStay_te,
          onChange: (value) => setField('reason_TxStay_te', value),
        }}
      />

      {/* Legal Status (7) and Housing Status (8) now live in the
          Participant Information card. */}

      <Card title="Other topics to discuss">
        {rsa.discuss_te.trim() ? (
          <ConcatenatedField value={rsa.discuss_te} />
        ) : (
          <EmptyRecap>No topics shared in the self-assessment</EmptyRecap>
        )}
      </Card>

      <Card title="Goal Setting">
        <Field
          label="From talking today, which of these sounds like the best goal for the next 90 days?"
          htmlFor="goal"
          required
          error={errors.goal}
        >
          <Select
            id="goal"
            value={text.goal}
            invalid={Boolean(errors.goal)}
            placeholder="Select a goal"
            options={GOALS.map((g) => ({ value: g.value, label: g.label }))}
            onChange={(value) => setField('goal', value)}
          />
        </Field>

        {text.goal === 'other' ? (
          <Field label="Please specify" htmlFor="goal_te" required error={errors.goal_te}>
            <TextInput
              id="goal_te"
              value={text.goal_te}
              invalid={Boolean(errors.goal_te)}
              placeholder="Enter other goal…"
              onChange={(value) => setField('goal_te', value)}
            />
          </Field>
        ) : null}
      </Card>

      {goalPhrase ? (
        <>
          <Card title="Importance">
            <TalkingPoints
              title={TALKING_POINTS.importance.title}
              groups={TALKING_POINTS.importance.groups}
            />
            <div className="mt-5">
              <Ruler
                name="important"
                value={important}
                onChange={setImportant}
                question={
                  <>
                    How important is it for you to <strong>{goalPhrase}</strong>?{' '}
                    <span className="text-red-600">*</span>
                  </>
                }
              />
              {errors.important ? (
                <p className="mt-2 text-xs font-medium text-red-600">{errors.important}</p>
              ) : null}
            </div>
          </Card>

          <Card title="Confidence">
            <TalkingPoints
              title={TALKING_POINTS.confidence.title}
              groups={TALKING_POINTS.confidence.groups}
            />
            <div className="mt-5">
              <Ruler
                name="confident"
                value={confident}
                onChange={setConfident}
                question={
                  <>
                    How confident are you that you can <strong>{goalPhrase}</strong>?{' '}
                    <span className="text-red-600">*</span>
                  </>
                }
              />
              {errors.confident ? (
                <p className="mt-2 text-xs font-medium text-red-600">{errors.confident}</p>
              ) : null}
            </div>
          </Card>
        </>
      ) : null}

      <Card title="Treatment Referral">
        <Field
          label="Does the person want help with a referral to (a different) SUD treatment program?"
          htmlFor="wantReferral"
          required
          error={errors.wantReferral}
        >
          <Select
            id="wantReferral"
            value={text.wantReferral}
            invalid={Boolean(errors.wantReferral)}
            options={YES_NO}
            onChange={(value) => setField('wantReferral', value)}
          />
        </Field>

        {wantsReferral ? (
          <>
            <Field
              label="What types of treatment or medication would you like? (Check all that apply)"
              required
              error={errors.refTypes}
            >
              <CheckboxGrid columns={2}>
                {REFERRAL_TYPES.map((type) => (
                  <CheckboxRow
                    key={type.key}
                    id={type.key}
                    label={type.label}
                    checked={flags[type.key]}
                    onChange={() => toggleFlag(type.key)}
                  />
                ))}
              </CheckboxGrid>
            </Field>

            {flags.ref_other ? (
              <Field label="Please specify" htmlFor="ref_other_te" required error={errors.ref_other_te}>
                <TextInput
                  id="ref_other_te"
                  value={text.ref_other_te}
                  invalid={Boolean(errors.ref_other_te)}
                  placeholder="Enter other treatment type…"
                  onChange={(value) => setField('ref_other_te', value)}
                />
              </Field>
            ) : null}

            <Field
              label="Initial referral agency"
              htmlFor="ref_agency"
              required
              error={errors.ref_agency}
              hint="If you need more resources, search by ZIP code at screen4success.org/resources"
            >
              <Select
                id="ref_agency"
                value={text.ref_agency}
                invalid={Boolean(errors.ref_agency)}
                placeholder="Select an agency"
                options={REFERRAL_AGENCIES.map((a) => ({ value: a, label: a }))}
                onChange={(value) => setField('ref_agency', value)}
              />
            </Field>

            {text.ref_agency === 'Other' ? (
              <Field
                label="Please specify agency name"
                htmlFor="agency_other"
                required
                error={errors.agency_other}
              >
                <TextInput
                  id="agency_other"
                  value={text.agency_other}
                  invalid={Boolean(errors.agency_other)}
                  placeholder="Enter agency name…"
                  onChange={(value) => setField('agency_other', value)}
                />
              </Field>
            ) : null}

            <Field
              label="Agency details (location, phone, contact person, etc.)"
              htmlFor="ref_agency_details"
              required
              error={errors.ref_agency_details}
            >
              <TextArea
                id="ref_agency_details"
                value={text.ref_agency_details}
                invalid={Boolean(errors.ref_agency_details)}
                placeholder="Enter agency details…"
                onChange={(value) => setField('ref_agency_details', value)}
              />
            </Field>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Intake date" htmlFor="intake_date" required error={errors.intake_date}>
                <DatePicker
                  id="intake_date"
                  value={text.intake_date}
                  onChange={(value) => setField('intake_date', value)}
                />
              </Field>
              <Field label="Intake time" htmlFor="intake_time" required error={errors.intake_time}>
                <TimePicker
                  id="intake_time"
                  value={text.intake_time}
                  onChange={(value) => setField('intake_time', value)}
                />
              </Field>
            </div>

            <Field
              label="Planned transportation method"
              htmlFor="transport"
              required
              error={errors.transport}
            >
              <Select
                id="transport"
                value={text.transport}
                invalid={Boolean(errors.transport)}
                placeholder="Select transportation method"
                options={TRANSPORT_OPTIONS}
                onChange={(value) => setField('transport', value)}
              />
            </Field>

            {text.transport === 'other' ? (
              <Field
                label="Please specify"
                htmlFor="transportOther_te"
                required
                error={errors.transportOther_te}
              >
                <TextInput
                  id="transportOther_te"
                  value={text.transportOther_te}
                  invalid={Boolean(errors.transportOther_te)}
                  placeholder="Enter transportation method…"
                  onChange={(value) => setField('transportOther_te', value)}
                />
              </Field>
            ) : null}

            {needsPickup ? (
              <div className="mt-2 rounded-md border-l-4 border-indigo-500 bg-slate-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Transportation details
                </h3>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label="Pickup date" htmlFor="travel_date" required error={errors.travel_date}>
                    <DatePicker
                      id="travel_date"
                      value={text.travel_date}
                      onChange={(value) => setField('travel_date', value)}
                    />
                  </Field>
                  <Field label="Pickup time" htmlFor="travel_time" required error={errors.travel_time}>
                    <TimePicker
                      id="travel_time"
                      value={text.travel_time}
                      onChange={(value) => setField('travel_time', value)}
                    />
                  </Field>
                </div>
                <Field label="Pickup address" htmlFor="travel_addy" required error={errors.travel_addy}>
                  <TextInput
                    id="travel_addy"
                    value={text.travel_addy}
                    invalid={Boolean(errors.travel_addy)}
                    placeholder="Enter pickup address…"
                    onChange={(value) => setField('travel_addy', value)}
                  />
                </Field>
                <Field
                  label="Phone to confirm pickup"
                  htmlFor="travel_phone"
                  required
                  error={errors.travel_phone}
                >
                  <TextInput
                    id="travel_phone"
                    type="tel"
                    value={text.travel_phone}
                    invalid={Boolean(errors.travel_phone)}
                    placeholder="Enter phone number…"
                    onChange={(value) => setField('travel_phone', value)}
                  />
                </Field>
                <Field
                  label="Return location"
                  htmlFor="travel_return"
                  required
                  error={errors.travel_return}
                >
                  <TextInput
                    id="travel_return"
                    value={text.travel_return}
                    invalid={Boolean(errors.travel_return)}
                    placeholder="Enter return location…"
                    onChange={(value) => setField('travel_return', value)}
                  />
                </Field>
                <Field
                  label="Other comments or notes about transportation"
                  htmlFor="travel_notes"
                >
                  <TextArea
                    id="travel_notes"
                    value={text.travel_notes}
                    placeholder="Enter any additional notes…"
                    onChange={(value) => setField('travel_notes', value)}
                  />
                </Field>
              </div>
            ) : null}
          </>
        ) : null}

      </Card>

      {declinedReferral ? (
        <Card title="Harm Reduction/Behavioral Changes">
          <Field
            label="What kinds of other things do you want to try to accomplish to meet your goal? (Check all that apply)"
            required
            error={errors.altOptions}
          >
            <CheckboxGrid columns={2}>
              {ALT_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.key}
                  id={option.key}
                  label={option.label}
                  checked={flags[option.key]}
                  onChange={() => toggleFlag(option.key)}
                />
              ))}
            </CheckboxGrid>
          </Field>

          {flags.alt_other ? (
            <Field label="Please specify" htmlFor="alt_other_te" required error={errors.alt_other_te}>
              <TextInput
                id="alt_other_te"
                value={text.alt_other_te}
                invalid={Boolean(errors.alt_other_te)}
                placeholder="Enter other option…"
                onChange={(value) => setField('alt_other_te', value)}
              />
            </Field>
          ) : null}
        </Card>
      ) : null}

      <Card title="Status">
        <Field
          label="Which of the following best describes the participant’s status at the end of the meeting?"
          htmlFor="lm_ptStatus"
          required
          error={errors.lm_ptStatus}
        >
          <Select
            id="lm_ptStatus"
            value={text.lm_ptStatus}
            invalid={Boolean(errors.lm_ptStatus)}
            placeholder="Select a status"
            options={PARTICIPANT_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            onChange={(value) => setField('lm_ptStatus', value)}
          />
        </Field>
      </Card>

      <Card title="Recording">
        <p className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">
          Staff- stop recording
        </p>

        <Field
          label="Meeting end time:"
          htmlFor="time_RMC_end"
          required
          error={errors.time_RMC_end}
        >
          <TimePicker
            id="time_RMC_end"
            value={text.time_RMC_end}
            onChange={(value) => setField('time_RMC_end', value)}
          />
        </Field>

        <Field
          label="Did you record this meeting?"
          htmlFor="recording"
          required
          error={errors.recording}
        >
          <Select
            id="recording"
            value={text.recording}
            invalid={Boolean(errors.recording)}
            options={YES_NO}
            onChange={(value) => setField('recording', value)}
          />
        </Field>

        {text.recording === 'yes' ? (
          <Field
            label="What date did you upload the recording?"
            htmlFor="recording_upload_date"
            required
            error={errors.recording_upload_date}
          >
            <DatePicker
              id="recording_upload_date"
              value={text.recording_upload_date}
              disableAfterToday
              onChange={(value) => setField('recording_upload_date', value)}
            />
          </Field>
        ) : null}

        {text.recording === 'no' ? (
          <Field
            label="What was the reason for not recording the RMC meeting?"
            htmlFor="recording_reason"
            required
            error={errors.recording_reason}
          >
            <TextArea
              id="recording_reason"
              rows={4}
              value={text.recording_reason}
              invalid={Boolean(errors.recording_reason)}
              placeholder="Enter reason…"
              onChange={(value) => setField('recording_reason', value)}
            />
          </Field>
        ) : null}
      </Card>

      <ButtonRow>
        <span />
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            'Save meeting notes'
          )}
        </Button>
      </ButtonRow>
    </PageShell>
  );
}

/**
 * Plays one assessment section back to the participant, optionally with staff
 * talking points and a follow-up free-text question.
 *
 * `concatenated` renders the section the way sections 7 and 8 are stored on
 * `abv_RMC` — one comma-separated sentence rather than a bullet list.
 */
function RecapSection({
  sectionNumber,
  rsa,
  concatenated,
  talkingPoints,
  question,
}: {
  sectionNumber: number;
  rsa: RSAContext;
  concatenated?: boolean;
  talkingPoints?: TalkingPointBlock;
  question?: {
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
  };
}) {
  const section = RSA_SECTIONS.find((s) => s.number === sectionNumber);
  if (!section) return null;

  const checked = section.questions.filter((q) => rsa.answers[q.key]);
  const heading = concatenated
    ? section.recapTitle
    : `${section.number}. ${section.recapTitle}`;

  return (
    <Card title={heading}>
      {concatenated ? (
        <ConcatenatedField value={concatSectionRecap(rsa.answers, sectionNumber)} />
      ) : checked.length > 0 ? (
        <RecapList>
          {checked.map((item) => (
            <RecapItem key={item.key}>{item.recap}</RecapItem>
          ))}
        </RecapList>
      ) : (
        <EmptyRecap>None reported</EmptyRecap>
      )}

      {talkingPoints ? (
        <TalkingPoints title={talkingPoints.title} groups={talkingPoints.groups} />
      ) : null}

      {question ? (
        <div className="mt-5">
          <Field label={question.label} required error={question.error}>
            <TextArea
              value={question.value}
              placeholder="Enter response…"
              invalid={Boolean(question.error)}
              onChange={question.onChange}
            />
          </Field>
        </div>
      ) : null}
    </Card>
  );
}
