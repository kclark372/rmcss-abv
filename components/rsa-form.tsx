'use client';

import { useEffect, useMemo, useState } from 'react';

import { submitRSA } from '@/app/actions/submit-rsa';
import { DatePicker } from '@/components/date-time';
import {
  AGENCIES,
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
  TextInput,
} from '@/components/ui';

/**
 * The RSA self-assessment.
 *
 * Step 0 collects staff and participant details, steps 1-8 are the question
 * sections, and step 9 submits. Answers post to a server action; the browser
 * never sees FileMaker credentials.
 *
 * When `onComplete` is passed the form hands the new assessment's UUID to its
 * parent instead of rendering a success screen, so the guided flow can move
 * straight on to the handoff step without showing the ID to the participant.
 */

type Answers = Record<RSAQuestionKey, boolean>;

const EMPTY_ANSWERS = Object.fromEntries(
  RSA_QUESTION_KEYS.map((key) => [key, false]),
) as Answers;

const LAST_STEP = RSA_SECTIONS.length + 1; // 9

interface StaffEntry {
  agency: string;
  XSID: string;
  name_legal_full: string;
  XADT: string;
}

const EMPTY_STAFF_ENTRY: StaffEntry = {
  agency: '',
  XSID: '',
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
    if (!entry.XSID) found.XSID = 'Your name is required';
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

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitRSA({
        ...entry,
        timestamp_beginRSA: beganAt,
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
    setBeganAt(null);
    setStep(0);
    setEntry((prev) => ({ ...EMPTY_STAFF_ENTRY, XADT: prev.XADT }));
  }

  /* ---------------------------------------------------------------------- */

  if (submittedUuid) {
    return (
      <PageShell>
        <PageHeader title="RMCSS Self-Assessment" />
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

  return (
    <PageShell>
      <PageHeader title="RMCSS Self-Assessment" />

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
                  updateEntry('XSID', '');
                }}
              />
            </Field>

            {entry.agency ? (
              <Field label="Your name" htmlFor="XSID" required error={errors.XSID}>
                <Select
                  id="XSID"
                  value={entry.XSID}
                  invalid={Boolean(errors.XSID)}
                  placeholder="Select your name"
                  options={staffOptions}
                  onChange={(value) => updateEntry('XSID', value)}
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
      ) : step === LAST_STEP ? (
        <>
          <Card title="Assessment Complete" description="Ready to submit">
            <p className="text-sm text-slate-600">
              All sections of the self-assessment have been completed. Submit to save
              this assessment to FileMaker.
            </p>
          </Card>

          <ButtonRow>
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Previous
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner /> Submitting…
                </>
              ) : (
                'Submit assessment'
              )}
            </Button>
          </ButtonRow>
        </>
      ) : (
        <SectionStep
          sectionIndex={step - 1}
          answers={answers}
          onToggle={toggleAnswer}
          onPrev={() => setStep(step - 1)}
          onNext={() => setStep(step + 1)}
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

  return (
    <>
      <Card
        title={`${section.number}. ${section.title}`}
        description={section.intro}
      >
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
      </Card>

      <ButtonRow>
        {canGoBack ? (
          <Button variant="secondary" onClick={onPrev}>
            Previous
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onNext}>Next</Button>
      </ButtonRow>
    </>
  );
}
