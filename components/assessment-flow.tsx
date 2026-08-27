'use client';

import { useState } from 'react';

import { RMCForm } from '@/components/rmc-form';
import { RSAForm } from '@/components/rsa-form';
import { Alert, Button, ButtonRow, Card, PageHeader, PageShell } from '@/components/ui';

/**
 * The full checkup on one device, start to finish.
 *
 * A participant fills in the self-assessment, hands the tablet back, and staff
 * carry straight on into the meeting form. The assessment ID that links the two
 * records is passed between the steps in memory — it is never shown on screen,
 * typed in, or put in the URL, and nobody has to navigate anywhere.
 */

type Step =
  | { name: 'assessment' }
  | { name: 'handoff'; rsaUuid: string }
  | { name: 'meeting'; rsaUuid: string }
  | { name: 'finished' };

export function AssessmentFlow() {
  const [step, setStep] = useState<Step>({ name: 'assessment' });

  switch (step.name) {
    case 'assessment':
      return (
        <RSAForm
          onComplete={(rsaUuid) => setStep({ name: 'handoff', rsaUuid })}
        />
      );

    case 'handoff':
      return (
        <Handoff onContinue={() => setStep({ name: 'meeting', rsaUuid: step.rsaUuid })} />
      );

    case 'meeting':
      return (
        <RMCForm
          rsaUuid={step.rsaUuid}
          onComplete={() => setStep({ name: 'finished' })}
        />
      );

    case 'finished':
      return <Finished onRestart={() => setStep({ name: 'assessment' })} />;
  }
}

/**
 * The pause between the two forms. The participant sees this, so it says one
 * thing and gives them nothing to do; only staff continue past it.
 */
function Handoff({ onContinue }: { onContinue: () => void }) {
  return (
    <PageShell>
      <PageHeader title="Thank you" />
      <Card>
        <p className="text-lg font-medium text-slate-900">
          Please hand the tablet back to the staff member.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Your answers have been saved. A staff member will go through them with
          you next.
        </p>
        <ButtonRow>
          <span />
          <Button onClick={onContinue}>Continue — staff only</Button>
        </ButtonRow>
      </Card>
    </PageShell>
  );
}

function Finished({ onRestart }: { onRestart: () => void }) {
  return (
    <PageShell>
      <PageHeader title="Checkup complete" />
      <Card>
        <Alert tone="success" title="Saved to FileMaker">
          The self-assessment and the meeting have both been recorded.
        </Alert>
        <ButtonRow>
          <span />
          <Button onClick={onRestart}>Start a new checkup</Button>
        </ButtonRow>
      </Card>
    </PageShell>
  );
}
