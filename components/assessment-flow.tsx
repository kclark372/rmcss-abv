'use client';

import { useState } from 'react';

import { RMCForm } from '@/components/rmc-form';
import { RSAForm } from '@/components/rsa-form';
import { Alert, Button, ButtonRow, Card, PageHeader, PageShell } from '@/components/ui';

/**
 * The full checkup on one device, start to finish.
 *
 * A participant fills in the self-assessment and hands the tablet to staff on
 * its last step ("Staff Zone"); pressing that button saves the assessment and
 * drops straight into the meeting form. The assessment ID that links the two
 * records is passed between the steps in memory — it is never shown on screen,
 * typed in, or put in the URL, and nobody has to navigate anywhere.
 */

type Step =
  | { name: 'assessment' }
  | { name: 'meeting'; rsaUuid: string }
  | { name: 'finished' };

export function AssessmentFlow() {
  const [step, setStep] = useState<Step>({ name: 'assessment' });

  switch (step.name) {
    case 'assessment':
      return (
        <RSAForm
          onComplete={(rsaUuid) => setStep({ name: 'meeting', rsaUuid })}
        />
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
