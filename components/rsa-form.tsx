'use client';

import { useEffect, useMemo, useState } from 'react';

import { submitRSA } from '@/app/actions/submit-rsa';
import { DatePicker } from '@/components/date-time';
import {
  AGENCIES,
  RSA_INTRODUCTION,
  RSA_QUESTION_KEYS,
  RSA_SECTIONS,
  STAFF_BY_AGENCY,
  type Agency,
  type RSAQuestionKey,
} from '@/lib/schemas/rsa-questions';
import {
  Alert,
  Button,
  ButtonRow,
  Card,
  CheckboxGrid,
  CheckboxRow,
  Field,
  IdDisplay,
  PageHeader,
  PageShell,
  ProgressBar,
  Select,
  Spinner,
  TextArea,
  TextInput,
} from '@/components/ui';

/**
 * The RSA self-assessment.
 *
 * Step 0 collects staff and participant details, steps 1-8 are the question
 * sections, step 9 is the free-text "anything else" prompt, and step 10
 * submits. Answers post to a server action; the browser never sees FileMaker
 * credentials.
 *
 * When `onComplete` is passed the form hands the new assessment's UUID to its
 * parent instead of rendering a success screen, so the guided flow can move
 * straight on to the meeting form without showing the ID to the participant.
 */

type Answers = Record<RSAQuestionKey, boolean>;

const EMPTY_ANSWERS = Object.fromEntries(
  RSA_QUESTION_KEYS.map((key) => [key, false]),
) as Answers;

const DISCUSS_STEP = RSA_SECTIONS.length + 1; // 9 — the "anything else" prompt
const LAST_STEP = RSA_SECTIONS.length + 2; // 10 — "Assessment Complete" / submit

interface StaffEntry {
  agency: string;
  /** "Your name" — the staff member. Maps to FileMaker `name_pref_full_staff`. */
  staffName: string;
  name_legal_full: string;
  XADT: string;
}

const EMPTY_STAFF_ENTRY: StaffEntry = {
  agency: '',
  staffName: '',
  name_legal_full: '',
  XADT: '',
};

/** Today's date as `YYYY-MM-DD` in the browser's timezone. */
function todayISODate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function RSAForm({ onComplete }: { onComplete?: (uuid: string) => void }) {
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState<StaffEntry>(EMPTY_STAFF_ENTRY);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [discuss, setDiscuss] = useState('');
  const [beganAt, setBeganAt] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedUuid, setSubmittedUuid] = useState<string | null>(null);

  // Default the assessment date to today, in the browser's timezone.
  useEffect(() => {
    const iso = todayISODate();
    setEntry((prev) => (prev.XADT ? prev : { ...prev, XADT: iso }));
  }, []);

  const staffOptions = useMemo(() => {
    if (!entry.agency) return [];
    const roster = STAFF_BY_AGENCY[entry.agency as Agency] ?? [];
    return roster.map((name) => ({ value: name, label: name }));
  }, [entry.agency]);

  function updateEntry(key: keyof StaffEntry, value: string) {
    setEntry((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /**
   * Toggles one answer, keeping the "none of these" option of that section
   * mutually exclusive with the rest.
   */
  function toggleAnswer(key: RSAQuestionKey, sectionNumber: number) {
    setAnswers((prev) => {
      const next = { ...prev };
      const turningOn = !prev[key];
      const isNoneOption = key.endsWith('z_none');
      const section = RSA_SECTIONS.find((s) => s.number === sectionNumber);

      if (turningOn && section) {
        if (isNoneOption) {
          // Checking "none" clears every other answer in the section.
          for (const question of section.questions) {
            if (question.key !== key) next[question.key] = false;
          }
        } else {
          // Checking anything else clears "none".
          const noneKey = section.questions.find((q) => q.key.endsWith('z_none'))?.key;
          if (noneKey) next[noneKey] = false;
        }
      }

      next[key] = turningOn;
      return next;
    });
  }

  function beginAssessment() {
    const found: Record<string, string> = {};
    if (!entry.agency) found.agency = 'Organization is required';
    if (!entry.staffName) found.staffName = 'Your name is required';
    if (!entry.name_legal_full.trim()) {
      found.name_legal_full = 'Participant name is required';
    }
    if (!entry.XADT) {
      found.XADT = 'Assessment date is required';
    } else if (entry.XADT > todayISODate()) {
      found.XADT = 'Cannot select a future date';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBeganAt(new Date().toISOString());
    setStep(1);
  }

  /**
   * Section 2 (Consequences of Use) doesn't apply when the participant reported
   * no substance use in section 1, so it's skipped in both directions.
   */
  function isSkippedStep(candidate: number): boolean {
    return candidate === 2 && answers.s1z_none;
  }

  function goToNextStep(from: number) {
    let next = from + 1;
    while (next < LAST_STEP && isSkippedStep(next)) next += 1;
    setStep(next);
  }

  function goToPrevStep(from: number) {
    let prev = from - 1;
    while (prev > 0 && isSkippedStep(prev)) prev -= 1;
    setStep(prev);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitRSA({
        ...entry,
        timestamp_beginRSA: beganAt,
        discuss_te: discuss,
        ...answers,
      });

      if (result.ok) {
        if (onComplete) {
          onComplete(result.uuid);
        } else {
          setSubmittedUuid(result.uuid);
        }
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError('Could not reach the server. Nothing was saved — try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewAssessment() {
    setSubmittedUuid(null);
    setSubmitError(null);
    setAnswers(EMPTY_ANSWERS);
    setDiscuss('');
    setBeganAt(null);
    setStep(0);
    setEntry((prev) => ({ ...EMPTY_STAFF_ENTRY, XADT: prev.XADT }));
  }

  /* ---------------------------------------------------------------------- */

  if (submittedUuid) {
    return (
      <PageShell>
        <PageHeader title="Self-Assessment" />
        <Card>
          <Alert tone="success" title="Assessment submitted">
            The participant&rsquo;s self-assessment has been recorded in FileMaker.
          </Alert>
          <IdDisplay label="Assessment ID" value={submittedUuid} />
          <p className="text-sm text-slate-600">
            Use this ID to open the RMC meeting form for this participant.
          </p>
          <ButtonRow>
            <span />
            <Button onClick={startNewAssessment}>Start another assessment</Button>
          </ButtonRow>
        </Card>
      </PageShell>
    );
  }

  const progress = (step / LAST_STEP) * 100;
  const progressLabel =
    step === 0
      ? 'Staff entry'
      : step === LAST_STEP
        ? 'Complete'
        : `${Math.round(progress)}% complete`;

  // Step 0 is the staff/participant intake for the whole checkup; every step
  // after it is the participant's self-assessment.
  const headerTitle =
    step === 0 ? 'Recovery Management Checkup' : 'Self-Assessment';

  return (
    <PageShell>
      <PageHeader title={headerTitle} />

      {submitError ? <Alert title="Could not submit">{submitError}</Alert> : null}

      <ProgressBar percent={step === 0 ? 11 : progress} label={progressLabel} />

      {step === 0 ? (
        <>
          <Card title="Staff Entry" description="Staff member and participant information">
            <Field label="Organization" htmlFor="agency" required error={errors.agency}>
              <Select
                id="agency"
                value={entry.agency}
                invalid={Boolean(errors.agency)}
                placeholder="Select an organization"
                options={AGENCIES.map((a) => ({ value: a, label: a }))}
                onChange={(value) => {
                  updateEntry('agency', value);
                  updateEntry('staffName', '');
                }}
              />
            </Field>

            {entry.agency ? (
              <Field label="Your name" htmlFor="staffName" required error={errors.staffName}>
                <Select
                  id="staffName"
                  value={entry.staffName}
                  invalid={Boolean(errors.staffName)}
                  placeholder="Select your name"
                  options={staffOptions}
                  onChange={(value) => updateEntry('staffName', value)}
                />
              </Field>
            ) : null}

            <Field
              label="Participant name"
              htmlFor="name_legal_full"
              required
              error={errors.name_legal_full}
            >
              <TextInput
                id="name_legal_full"
                value={entry.name_legal_full}
                invalid={Boolean(errors.name_legal_full)}
                placeholder="Participant name"
                onChange={(value) => updateEntry('name_legal_full', value)}
              />
            </Field>

            <Field label="Assessment date" htmlFor="XADT" required error={errors.XADT}>
              <DatePicker
                id="XADT"
                value={entry.XADT}
                disableAfterToday
                onChange={(value) => updateEntry('XADT', value)}
              />
            </Field>
          </Card>

          <ButtonRow>
            <span />
            <Button onClick={beginAssessment}>Begin self-assessment</Button>
          </ButtonRow>
        </>
      ) : step === DISCUSS_STEP ? (
        <>
          <Card title="Anything else you'd like to discuss?">
            <TextArea
              id="discuss_te"
              rows={6}
              value={discuss}
              placeholder="Type anything else you'd like to talk about…"
              onChange={setDiscuss}
            />
          </Card>

          <ButtonRow>
            <Button variant="secondary" onClick={() => goToPrevStep(step)}>
              Previous
            </Button>
            <Button onClick={() => goToNextStep(step)}>Next</Button>
          </ButtonRow>
        </>
      ) : step === LAST_STEP ? (
        <>
          <Card title="Assessment Complete">
            <p className="text-base font-bold text-slate-900 sm:text-lg">
              Please give tablet to staff
            </p>
          </Card>

          <ButtonRow>
            <Button variant="secondary" onClick={() => goToPrevStep(step)}>
              Previous
            </Button>
            <Button variant="staff" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner /> Submitting…
                </>
              ) : (
                'Staff Zone'
              )}
            </Button>
          </ButtonRow>
        </>
      ) : (
        <SectionStep
          key={step}
          sectionIndex={step - 1}
          answers={answers}
          onToggle={toggleAnswer}
          onPrev={() => goToPrevStep(step)}
          onNext={() => goToNextStep(step)}
          canGoBack={step > 1}
        />
      )}
    </PageShell>
  );
}

function SectionStep({
  sectionIndex,
  answers,
  onToggle,
  onPrev,
  onNext,
  canGoBack,
}: {
  sectionIndex: number;
  answers: Answers;
  onToggle: (key: RSAQuestionKey, sectionNumber: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoBack: boolean;
}) {
  const section = RSA_SECTIONS[sectionIndex];
  const [error, setError] = useState<string | null>(null);

  const answered = section.questions.some((question) => answers[question.key]);

  // Clear the "pick one" warning as soon as they check something.
  useEffect(() => {
    if (answered) setError(null);
  }, [answered]);

  function handleNext() {
    if (!answered) {
      setError('Select at least one option to continue.');
      return;
    }
    onNext();
  }

  return (
    <>
      {sectionIndex === 0 ? (
        <Card>
          <p className="text-sm leading-relaxed text-slate-600">{RSA_INTRODUCTION}</p>
        </Card>
      ) : null}

      <Card title={section.title || undefined}>
        {section.intro ? (
          section.title ? (
            <p className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">
              {section.intro} (check all that apply)
            </p>
          ) : (
            <h2 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">
              {section.intro} (check all that apply)
            </h2>
          )
        ) : null}
        <CheckboxGrid>
          {section.questions.map((question) => (
            <CheckboxRow
              key={question.key}
              id={question.key}
              label={question.label}
              checked={answers[question.key]}
              onChange={() => onToggle(question.key, section.number)}
            />
          ))}
        </CheckboxGrid>
        {error ? (
          <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
        ) : null}
      </Card>

      <ButtonRow>
        {canGoBack ? (
          <Button variant="secondary" onClick={onPrev}>
            Previous
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleNext}>Next</Button>
      </ButtonRow>
    </>
  );
}
