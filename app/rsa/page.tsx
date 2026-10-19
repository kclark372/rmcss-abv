import { RSALinkFlow } from '@/components/rsa-link-flow';
import { hasAccess } from '@/lib/access';

export const metadata = { title: 'RMCSS Self-Assessment' };

/** The password cookie is per-request, so this page can never be cached. */
export const dynamic = 'force-dynamic';

export default async function RSALinkPage() {
  return <RSALinkFlow initiallyUnlocked={await hasAccess()} />;
}
