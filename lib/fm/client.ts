import 'server-only';

import {
  FMError,
  type FMCreatePayload,
  type FMCreateRecordBody,
  type FMFieldData,
  type FMFindBody,
  type FMFindPayload,
  type FMFindQuery,
  type FMLoginPayload,
  type FMRecord,
  type FMResponse,
} from './types';

/**
 * A minimal, typed Claris FileMaker Data API client.
 *
 * Deliberately dependency-free (plain `fetch`) rather than using ProofKit's
 * @proofkit/fmdapi, so the request shapes stay visible and easy to follow.
 *
 * This module is server-only. It reads credentials from the environment and
 * must never be imported into a client component.
 */

/** The three layouts this app writes to. Layout names, not table names. */
export const LAYOUTS = {
  rsa: 'abv_RSA',
  rmc: 'abv_RMC',
  tx: 'abv_tx',
} as const;

export type LayoutName = (typeof LAYOUTS)[keyof typeof LAYOUTS];

interface FMConfig {
  /** Origin only, e.g. https://fms.example.com — no trailing slash, no path. */
  server: string;
  database: string;
  username: string;
  password: string;
}

function readConfig(): FMConfig {
  const server = process.env.FM_SERVER_URL;
  const database = process.env.FM_DATABASE;
  const username = process.env.FM_API_USERNAME;
  const password = process.env.FM_API_PASSWORD;

  const missing = [
    !server && 'FM_SERVER_URL',
    !database && 'FM_DATABASE',
    !username && 'FM_API_USERNAME',
    !password && 'FM_API_PASSWORD',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing FileMaker environment variables: ${missing.join(', ')}`);
  }

  // Tolerate a value pasted with or without a scheme or a trailing slash.
  const origin = server!.replace(/\/+$/, '');
  return {
    server: /^https?:\/\//.test(origin) ? origin : `https://${origin}`,
    database: database!,
    username: username!,
    password: password!,
  };
}

function baseUrl(config: FMConfig): string {
  return `${config.server}/fmi/data/vLatest/databases/${encodeURIComponent(config.database)}`;
}

/**
 * Unwraps the Data API envelope, throwing FMError on any non-zero code.
 * FileMaker reports application errors in the body, often with HTTP 200/500,
 * so the body is the source of truth rather than the status line.
 */
async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();

  let body: FMResponse<T>;
  try {
    body = JSON.parse(text) as FMResponse<T>;
  } catch {
    throw new FMError(
      'parse',
      `Non-JSON response from FileMaker (HTTP ${res.status}): ${text.slice(0, 300)}`,
      res.status,
    );
  }

  const message = body.messages?.[0];
  if (!message) {
    throw new FMError('parse', 'FileMaker response had no messages array', res.status);
  }
  if (message.code !== '0') {
    throw new FMError(message.code, message.message, res.status);
  }

  return body.response;
}

/** Opens a Data API session and returns its bearer token. */
async function login(config: FMConfig): Promise<string> {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');

  const res = await fetch(`${baseUrl(config)}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  });

  const payload = await unwrap<FMLoginPayload>(res);
  return payload.token;
}

/**
 * Closes a Data API session.
 * FileMaker Server allows a limited number of concurrent sessions, so this runs
 * in a `finally` and never throws — a failed logout must not mask a good write.
 */
async function logout(config: FMConfig, token: string): Promise<void> {
  try {
    await fetch(`${baseUrl(config)}/sessions/${token}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch {
    // Session will be reaped by the server on idle timeout.
  }
}

/**
 * A single Data API session handed to `withSession`.
 * Only the two verbs this app needs are exposed.
 */
export interface FMSession {
  /**
   * Creates one record and returns its FileMaker recordId.
   * `fieldData` keys must be field names present on the layout — anything else
   * comes back as FileMaker error 102 ("Field is missing").
   */
  createRecord(layout: LayoutName, fieldData: FMFieldData): Promise<FMCreatePayload>;

  /** Reads one record back by its internal recordId. */
  getRecord<T = Record<string, string>>(
    layout: LayoutName,
    recordId: string,
  ): Promise<FMRecord<T>>;

  /** Runs a find. Returns [] instead of throwing when nothing matches. */
  find<T = Record<string, string>>(
    layout: LayoutName,
    query: FMFindQuery[],
    limit?: number,
  ): Promise<FMRecord<T>[]>;
}

/**
 * Runs `work` inside one logged-in Data API session, always logging out after.
 *
 * Every server action wraps its whole unit of work in a single call so that,
 * for example, creating an RMC record and its child treatment record shares one
 * session rather than burning two.
 */
export async function withSession<T>(work: (session: FMSession) => Promise<T>): Promise<T> {
  const config = readConfig();
  const token = await login(config);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const session: FMSession = {
    async createRecord(layout, fieldData) {
      const body: FMCreateRecordBody = { fieldData };
      const res = await fetch(
        `${baseUrl(config)}/layouts/${encodeURIComponent(layout)}/records`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(body),
          cache: 'no-store',
        },
      );
      return unwrap<FMCreatePayload>(res);
    },

    async getRecord<R = Record<string, string>>(layout: LayoutName, recordId: string) {
      const res = await fetch(
        `${baseUrl(config)}/layouts/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}`,
        { method: 'GET', headers: authHeaders, cache: 'no-store' },
      );
      const payload = await unwrap<FMFindPayload<R>>(res);
      const record = payload.data[0];
      if (!record) {
        throw new FMError('404', `Record ${recordId} not found on ${layout}`, res.status);
      }
      return record;
    },

    async find<R = Record<string, string>>(
      layout: LayoutName,
      query: FMFindQuery[],
      limit = 1,
    ) {
      const body: FMFindBody = { query, limit };
      const res = await fetch(
        `${baseUrl(config)}/layouts/${encodeURIComponent(layout)}/_find`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(body),
          cache: 'no-store',
        },
      );
      try {
        const payload = await unwrap<FMFindPayload<R>>(res);
        return payload.data;
      } catch (error) {
        // A find that matches nothing is error 401, which is an empty result.
        if (error instanceof FMError && error.isNoRecordsFound) return [];
        throw error;
      }
    },
  };

  try {
    return await work(session);
  } finally {
    await logout(config, token);
  }
}

export { FMError };
