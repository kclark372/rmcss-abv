import { revokeAccess } from '@/lib/access';

/**
 * Signs this tablet out of `/rsa` by clearing the access cookie.
 *
 * A plain route rather than a server action on purpose: an action that changes
 * cookies makes Next refetch the page straight afterwards, and that refetch
 * fails with "Failed to fetch" when the Close button lets go of the page at the
 * same moment.
 */
export const dynamic = 'force-dynamic';

export async function POST() {
  await revokeAccess();
  return new Response(null, { status: 204 });
}
