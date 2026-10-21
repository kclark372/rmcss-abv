import { loadRoster } from '@/app/actions/rsa-link';
import { RSALinkFlow } from '@/components/rsa-link-flow';
import { hasAccess } from '@/lib/access';

export const metadata = { title: 'RMCSS Self-Assessment' };

/** The password cookie is per-request, so this page can never be cached. */
export const dynamic = 'force-dynamic';

export default async function RSALinkPage() {
  const unlocked = await hasAccess();
  // Already signed in (cookie still valid): the staff dropdowns load with the page.
  return <RSALinkFlow initiallyUnlocked={unlocked} initialRoster={unlocked ? await loadRoster() : null} />;
}
