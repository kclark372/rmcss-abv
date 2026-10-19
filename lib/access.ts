import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * The shared-password gate in front of the staff-run self-assessment link.
 *
 * Staff enter one password (`RSA_ACCESS_PASSWORD`); on success an httpOnly
 * cookie holds an HMAC derived from it. Rotating the password therefore signs
 * every tablet out. Every server action behind the gate re-checks the cookie —
 * hiding the form in the browser is not the protection.
 */

const COOKIE_NAME = 'rsa_access';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function configuredPassword(): string | null {
  const password = process.env.RSA_ACCESS_PASSWORD;
  return password && password.length > 0 ? password : null;
}

function tokenFor(password: string): string {
  return createHmac('sha256', password).update('rsa-link-access-v1').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so the buffers are equal length and the compare is constant-time.
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

/** True when `input` is the configured password. False if none is configured. */
export function passwordMatches(input: string): boolean {
  const password = configuredPassword();
  return password !== null && safeEqual(input, password);
}

/** True when this request carries a valid access cookie. */
export async function hasAccess(): Promise<boolean> {
  const password = configuredPassword();
  if (!password) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value !== undefined && safeEqual(value, tokenFor(password));
}

export async function grantAccess(): Promise<void> {
  const password = configuredPassword();
  if (!password) throw new Error('RSA_ACCESS_PASSWORD is not set');
  (await cookies()).set(COOKIE_NAME, tokenFor(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function revokeAccess(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
