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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [important, setImportant] = useState<number | null>(null);
  const [confident, setConfident] = useState<number | null>(null);

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

  function setField<K extends keyof FormValues>(key: K, value: string) {
    setText((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFlag(key: ReferralTypeKey | AltOptionKey) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
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
    setRsa(null);
    setLookupId('');
    setText(EMPTY_VALUES);
    setFlags(EMPTY_FLAGS);
    setImportant(null);
    setConfident(null);
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
      </Card>

      <Card title="Staff- start recording for CogniTrainer">
        <Field label="Meeting start time:" htmlFor="time_RMC_begin">
          <TimePicker
            id="time_RMC_begin"
            value={text.time_RMC_begin}
            onChange={(value) => setField('time_RMC_begin', value)}
          />
        </Field>
      </Card>

      <RecapSection sectionNumber={1} rsa={rsa} />

      <RecapSection
        sectionNumber={2}
        rsa={rsa}
        talkingPoints={TALKING_POINTS.q1q2}
        question={{
          label: "Is there any (other) kind of substance use or problems that you've had?",
          value: text.otherProblems_te,
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
          onChange: (value) => setField('reason_TxStay_te', value),
        }}
      />

      <RecapSection sectionNumber={7} rsa={rsa} concatenated />
      <RecapSection sectionNumber={8} rsa={rsa} concatenated />

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
        >
          <Select
            id="goal"
            value={text.goal}
            placeholder="Select a goal"
            options={GOALS.map((g) => ({ value: g.value, label: g.label }))}
            onChange={(value) => setField('goal', value)}
          />
        </Field>

        {text.goal === 'other' ? (
          <Field label="Please specify" htmlFor="goal_te">
            <TextInput
              id="goal_te"
              value={text.goal_te}
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
                    How important is it for you to <strong>{goalPhrase}</strong>?
                  </>
                }
              />
            </div>
          </Card>

          <Card title="Confidence in Your Ability">
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
                    How confident are you that you can <strong>{goalPhrase}</strong>?
                  </>
                }
              />
            </div>
          </Card>
        </>
      ) : null}

      <Card title="Treatment Referral">
        <Field
          label="Does the person want help with a referral to (a different) SUD treatment program?"
          htmlFor="wantReferral"
        >
          <Select
            id="wantReferral"
            value={text.wantReferral}
            options={YES_NO}
            onChange={(value) => setField('wantReferral', value)}
          />
        </Field>

        {wantsReferral ? (
          <>
            <Field label="What types of treatment or medication would you like? (Check all that apply)">
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
              <Field label="Please specify" htmlFor="ref_other_te">
                <TextInput
                  id="ref_other_te"
                  value={text.ref_other_te}
                  placeholder="Enter other treatment type…"
                  onChange={(value) => setField('ref_other_te', value)}
                />
              </Field>
            ) : null}

            <Field
              label="Initial referral agency"
              htmlFor="ref_agency"
              hint="If you need more resources, search by ZIP code at screen4success.org/resources"
            >
              <Select
                id="ref_agency"
                value={text.ref_agency}
                placeholder="Select an agency"
                options={REFERRAL_AGENCIES.map((a) => ({ value: a, label: a }))}
                onChange={(value) => setField('ref_agency', value)}
              />
            </Field>

            {text.ref_agency === 'Other' ? (
              <Field label="Please specify agency name" htmlFor="agency_other">
                <TextInput
                  id="agency_other"
                  value={text.agency_other}
                  placeholder="Enter agency name…"
                  onChange={(value) => setField('agency_other', value)}
                />
              </Field>
            ) : null}

            <Field
              label="Agency details (location, phone, contact person, etc.)"
              htmlFor="ref_agency_details"
            >
              <TextArea
                id="ref_agency_details"
                value={text.ref_agency_details}
                placeholder="Enter agency details…"
                onChange={(value) => setField('ref_agency_details', value)}
              />
            </Field>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Intake date" htmlFor="intake_date">
                <DatePicker
                  id="intake_date"
                  value={text.intake_date}
                  onChange={(value) => setField('intake_date', value)}
                />
              </Field>
              <Field label="Intake time" htmlFor="intake_time">
                <TimePicker
                  id="intake_time"
                  value={text.intake_time}
                  onChange={(value) => setField('intake_time', value)}
                />
              </Field>
            </div>

            <Field label="Planned transportation method" htmlFor="transport">
              <Select
                id="transport"
                value={text.transport}
                placeholder="Select transportation method"
                options={TRANSPORT_OPTIONS}
                onChange={(value) => setField('transport', value)}
              />
            </Field>

            {text.transport === 'other' ? (
              <Field label="Please specify" htmlFor="transportOther_te">
                <TextInput
                  id="transportOther_te"
                  value={text.transportOther_te}
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
                  <Field label="Pickup date" htmlFor="travel_date">
                    <DatePicker
                      id="travel_date"
                      value={text.travel_date}
                      onChange={(value) => setField('travel_date', value)}
                    />
                  </Field>
                  <Field label="Pickup time" htmlFor="travel_time">
                    <TimePicker
                      id="travel_time"
                      value={text.travel_time}
                      onChange={(value) => setField('travel_time', value)}
                    />
                  </Field>
                </div>
                <Field label="Pickup address" htmlFor="travel_addy">
                  <TextInput
                    id="travel_addy"
                    value={text.travel_addy}
                    placeholder="Enter pickup address…"
                    onChange={(value) => setField('travel_addy', value)}
                  />
                </Field>
                <Field label="Phone to confirm pickup" htmlFor="travel_phone">
                  <TextInput
                    id="travel_phone"
                    type="tel"
                    value={text.travel_phone}
                    placeholder="Enter phone number…"
                    onChange={(value) => setField('travel_phone', value)}
                  />
                </Field>
                <Field label="Return location" htmlFor="travel_return">
                  <TextInput
                    id="travel_return"
                    value={text.travel_return}
                    placeholder="Enter return location…"
                    onChange={(value) => setField('travel_return', value)}
                  />
                </Field>
                <Field label="Other comments or notes about transportation" htmlFor="travel_notes">
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

        {declinedReferral ? (
          <>
            <Field label="What kinds of other things do you want to try to accomplish to meet your goal? (Check all that apply)">
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
              <Field label="Please specify" htmlFor="alt_other_te">
                <TextInput
                  id="alt_other_te"
                  value={text.alt_other_te}
                  placeholder="Enter other option…"
                  onChange={(value) => setField('alt_other_te', value)}
                />
              </Field>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card title="Status">
        <Field
          label="Which of the following best describes the participant’s status at the end of the meeting?"
          htmlFor="lm_ptStatus"
        >
          <Select
            id="lm_ptStatus"
            value={text.lm_ptStatus}
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
        <Field label="Did you record this meeting?" htmlFor="recording">
          <Select
            id="recording"
            value={text.recording}
            options={YES_NO}
            onChange={(value) => setField('recording', value)}
          />
        </Field>

        {text.recording === 'yes' ? (
          <Field label="What date did you upload the recording?" htmlFor="recording_upload_date">
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
          >
            <TextArea
              id="recording_reason"
              rows={4}
              value={text.recording_reason}
              placeholder="Enter reason…"
              onChange={(value) => setField('recording_reason', value)}
            />
          </Field>
        ) : null}

        <Field label="Meeting end time:" htmlFor="time_RMC_end">
          <TimePicker
            id="time_RMC_end"
            value={text.time_RMC_end}
            onChange={(value) => setField('time_RMC_end', value)}
          />
        </Field>
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
  question?: { label: string; value: string; onChange: (value: string) => void };
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
          <Field label={question.label}>
            <TextArea
              value={question.value}
              placeholder="Enter response…"
              onChange={question.onChange}
            />
          </Field>
        </div>
      ) : null}
    </Card>
  );
}
