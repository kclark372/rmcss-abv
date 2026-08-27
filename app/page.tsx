import { AssessmentFlow } from '@/components/assessment-flow';

export const metadata = { title: 'RMCSS Checkup' };

/** Nothing here is cacheable — every visit starts a fresh checkup. */
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <AssessmentFlow />;
}
