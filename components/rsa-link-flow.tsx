'use client';

import { useEffect, useState } from 'react';

import { checkPid, lock, submitLinkAssessment, unlock } from '@/app/actions/rsa-link';
import {
  Alert,
  Button,
  ButtonRow,
  Card,
  CheckboxGrid,
  CheckboxRow,
  Field,
  PageHeader,
  PageShell,
  ProgressBar,
  Select,
  Spinner,
  TextArea,
  TextInput,
} from '@/components/ui';
import { staffEntrySchema } from '@/lib/schemas/rsa-link';
import {
  RSA_INTRODUCTION,
  RSA_QUESTION_KEYS,
  RSA_SECTIONS,
  type RSAQuestionKey,
} from '@/lib/schemas/rsa-questions';
import { applyTimeframe, timeframeForWave, WAVES, type Wave } from '@/lib/schemas/rsa-timeframe';

/**
 * The staff-run self-assessment link (`/rsa`).
 *
 * Staff unlock it with a shared password, enter Staff ID / PID / meeting
 * number, and hand the tablet to the participant, who sees the introduction and
 * then one question per page. After the last question the answers are saved and
 * a "give the tablet to staff" screen ends the flow. The RMC meeting is opened
 * separately in FileMaker, which pulls the saved assessment in.
 *
 * Steps: 0 staff entry · 1 introduction · 2-9 sections 1-8 · 10 "anything
 * else?" · 11 complete.
 */

type Answers = Record<RSAQuestionKey, boolean>;

const EMPTY_ANSWERS = Object.fromEntries(
  RSA_QUESTION_KEYS.map((key) => [key, false]),
) as Answers;

const STEP_ENTRY = 0;
const STEP_INTRO = 1;
const FIRST_SECTION_STEP = 2;
const STEP_DISCUSS = FIRST_SECTION_STEP + RSA_SECTIONS.length; // 10
const STEP_COMPLETE = STEP_DISCUSS + 1; // 11

const WAVE_OPTIONS = WAVES.map((wave) => ({ value: wave, label: wave }));

export function RSALinkFlow({ initiallyUnlocked }: { initiallyUnlocked: boolean }) {
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);

  const [step, setStep] = useState(STEP_ENTRY);
  const [xsid, setXsid] = useState('');
  const [pid, setPid] = useState('');
  const [wave, setWave] = useState('');
  const [entryErrors, setEntryErrors] = useState<Record<string, string>>({});
  const [pidWarning, setPidWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [discuss, setDiscuss] = useState('');
  const [beganAt, setBeganAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeframe = timeframeForWave((wave || '0') as Wave);

  function resetEverything() {
    setStep(STEP_ENTRY);
    setXsid('');
    setPid('');
    setWave('');
    setEntryErrors({});
    setPidWarning(false);
    setAnswers(EMPTY_ANSWERS);
    setDiscuss('');
    setBeganAt(null);
    setSubmitError(null);
  }

  async function handleClose() {
    await lock();
    resetEverything();
    setUnlocked(false);
    // Only works if this tab was opened by a script; otherwise the locked
    // screen stays up, which is the safe place to leave a shared tablet.
    window.close();
  }

  if (!unlocked) {
    return <PasswordGate onUnlocked={() => setUnlocked(true)} />;
  }

  /* ---------------------------------------------------------------------- */
  /* Staff entry                                                            */
  /* ---------------------------------------------------------------------- */

  async function handleBegin() {
    const parsed = staffEntrySchema.safeParse({ xsid, pid, wave });
    if (!parsed.success) {
      const found: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        found[key] ??= issue.message;
      }
      setEntryErrors(found);
      return;
    }
    setEntryErrors({});

    // Best-effort: a PID we cannot find warns once, then staff can continue.
    if (!pidWarning) {
      setIsChecking(true);
      const result = await checkPid(parsed.data.pid);
      setIsChecking(false);
      if (result === 'not_found') {
        setPidWarning(true);
        return;
      }
    }

    setPidWarning(false);
    setStep(STEP_INTRO);
  }

  /* ---------------------------------------------------------------------- */
  /* Questions                                                              */
  /* ---------------------------------------------------------------------- */

  /** "None of these" is mutually exclusive with the rest of its section. */
  function toggleAnswer(key: RSAQuestionKey, sectionNumber: number) {
    setAnswers((prev) => {
      const next = { ...prev };
      const turningOn = !prev[key];
      const section = RSA_SECTIONS.find((s) => s.number === sectionNumber);

      if (turningOn && section) {
        if (key.endsWith('z_none')) {
          for (const question of section.questions) {
            if (question.key !== key) next[question.key] = false;
          }
        } else {
          const noneKey = section.questions.find((q) => q.key.endsWith('z_none'))?.key;
          if (noneKey) next[noneKey] = false;
        }
      }

      next[key] = turningOn;
      return next;
    });
  }

  /** Question 2 is skipped, in both directions, when Q1 is "none". */
  function isSkippedStep(candidate: number): boolean {
    return candidate === FIRST_SECTION_STEP + 1 && answers.s1z_none;
  }

  function goToNextStep(from: number) {
    let next = from + 1;
    while (next < STEP_DISCUSS && isSkippedStep(next)) next += 1;
    setStep(next);
  }

  function goToPrevStep(from: number) {
    let prev = from - 1;
    while (prev > STEP_INTRO && isSkippedStep(prev)) prev -= 1;
    setStep(prev);
  }

  /** Saves the assessment, then shows the hand-back screen. */
  async function handleFinish() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitLinkAssessment({
        xsid,
        pid,
        wave,
        timestamp_beginRSA: beganAt,
        discuss_te: discuss,
        ...answers,
      });

      if (result.ok) {
        setStep(STEP_COMPLETE);
      } else if (result.locked) {
        setUnlocked(false);
      } else {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError('Could not reach the server. Nothing was saved — try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------------- */

  if (step === STEP_COMPLETE) {
    return (
      <PageShell>
        <PageHeader title="Self-Assessment" />
        <ProgressBar percent={100} label="Complete" />
        <Card title="Assessment Complete">
          <p className="text-base font-bold text-slate-900 sm:text-lg">
            Please give tablet to staff
          </p>
        </Card>
        <ButtonRow>
          <span />
          <Button variant="staff" onClick={handleClose}>
            Close
          </Button>
        </ButtonRow>
      </PageShell>
    );
  }

  const progress = step === STEP_ENTRY ? 0 : (step / STEP_COMPLETE) * 100;

  return (
    <PageShell>
      <PageHeader title={step === STEP_ENTRY ? 'Recovery Management Checkup' : 'Self-Assessment'} />

      {submitError ? <Alert title="Could not submit">{submitError}</Alert> : null}

      <ProgressBar
        percent={progress}
        label={step === STEP_ENTRY ? 'Staff entry' : `${Math.round(progress)}% complete`}
      />

      {step === STEP_ENTRY ? (
        <>
          <Card title="Staff Entry" description="Staff enter these before handing over the tablet">
            <Field label="Staff ID" htmlFor="xsid" required error={entryErrors.xsid}>
              <TextInput
                id="xsid"
                value={xsid}
                invalid={Boolean(entryErrors.xsid)}
                onChange={(value) => {
                  setXsid(value);
                  setPidWarning(false);
                }}
              />
            </Field>

            <Field label="PID" htmlFor="pid" required error={entryErrors.pid}>
              <TextInput
                id="pid"
                value={pid}
                invalid={Boolean(entryErrors.pid)}
                onChange={(value) => {
                  setPid(value);
                  setPidWarning(false);
                }}
              />
            </Field>

            <Field label="Meeting number" htmlFor="wave" required error={entryErrors.wave}>
              <Select
                id="wave"
                value={wave}
                invalid={Boolean(entryErrors.wave)}
                placeholder="Select a meeting number"
                options={WAVE_OPTIONS}
                onChange={setWave}
              />
            </Field>

            {pidWarning ? (
              <Alert tone="info" title="PID not found">
                We could not find PID {pid} in FileMaker. Check it, or continue anyway.
              </Alert>
            ) : null}
          </Card>

          <ButtonRow>
            <span />
            <Button onClick={handleBegin} disabled={isChecking}>
              {isChecking ? (
                <>
                  <Spinner /> Checking…
                </>
              ) : pidWarning ? (
                'Continue anyway'
              ) : (
                'Begin'
              )}
            </Button>
          </ButtonRow>
        </>
      ) : step === STEP_INTRO ? (
        <>
          <Card title="Introduction">
            <p className="text-sm leading-relaxed text-slate-600">
              {applyTimeframe(RSA_INTRODUCTION, timeframe)}
            </p>
          </Card>
          <ButtonRow>
            <Button variant="secondary" onClick={() => setStep(STEP_ENTRY)}>
              Previous
            </Button>
            <Button
              onClick={() => {
                setBeganAt(new Date().toISOString());
                goToNextStep(STEP_INTRO);
              }}
            >
              Next
            </Button>
          </ButtonRow>
        </>
      ) : step === STEP_DISCUSS ? (
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
            <Button onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                'Next'
              )}
            </Button>
          </ButtonRow>
        </>
      ) : (
        <SectionStep
          key={step}
          sectionIndex={step - FIRST_SECTION_STEP}
          timeframe={timeframe}
          answers={answers}
          onToggle={toggleAnswer}
          onPrev={() => goToPrevStep(step)}
          onNext={() => goToNextStep(step)}
        />
      )}
    </PageShell>
  );
}

function PasswordGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleSubmit() {
    setIsChecking(true);
    setError(null);
    try {
      const result = await unlock(password);
      if (result.ok) onUnlocked();
      else setError(result.error ?? 'Incorrect password.');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <PageShell>
      <PageHeader title="Recovery Management Checkup" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Card title="Staff sign-in">
          <Field label="Password" htmlFor="password" error={error ?? undefined}>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base"
            />
          </Field>
        </Card>
        <ButtonRow>
          <span />
          <Button type="submit" disabled={isChecking || password.length === 0}>
            {isChecking ? (
              <>
                <Spinner /> Checking…
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </ButtonRow>
      </form>
    </PageShell>
  );
}

function SectionStep({
  sectionIndex,
  timeframe,
  answers,
  onToggle,
  onPrev,
  onNext,
}: {
  sectionIndex: number;
  timeframe: string;
  answers: Answers;
  onToggle: (key: RSAQuestionKey, sectionNumber: number) => void;
  onPrev: () => void;
  onNext: () => void;
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

  const prompt = section.intro ? applyTimeframe(section.intro, timeframe) : '';

  return (
    <>
      <Card title={section.title ? `${section.title} (check all that apply)` : undefined}>
        {prompt ? (
          <h2 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">
            {prompt}
            {section.title ? '' : ' (check all that apply)'}
            <span className="ml-1 text-red-600">*</span>
          </h2>
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
        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
      </Card>

      <ButtonRow>
        {sectionIndex > 0 ? (
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
