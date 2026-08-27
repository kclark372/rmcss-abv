/**
 * Types for the Claris FileMaker Data API (vLatest).
 *
 * Reference:
 *  - Log in:        POST   /fmi/data/vLatest/databases/{db}/sessions
 *  - Log out:       DELETE /fmi/data/vLatest/databases/{db}/sessions/{token}
 *  - Create record: POST   /fmi/data/vLatest/databases/{db}/layouts/{layout}/records
 *  - Find records:  POST   /fmi/data/vLatest/databases/{db}/layouts/{layout}/_find
 *
 * Every response is wrapped in the same envelope: a `response` payload plus a
 * `messages` array whose first entry carries the FileMaker error code ("0" = OK).
 */

/** One entry of the `messages` array present on every Data API response. */
export interface FMMessage {
  code: string;
  message: string;
}

/** The envelope every Data API response is wrapped in. */
export interface FMResponse<T> {
  response: T;
  messages: FMMessage[];
}

/** `response` payload of a successful log-in. */
export interface FMLoginPayload {
  token: string;
}

/** `response` payload of a successful record creation. */
export interface FMCreatePayload {
  recordId: string;
  modId: string;
}

/**
 * A single record as returned by a find or a get-record call.
 * `fieldData` is keyed by the field names present on the requested layout.
 */
export interface FMRecord<TFieldData = Record<string, string>> {
  fieldData: TFieldData;
  portalData: Record<string, unknown[]>;
  recordId: string;
  modId: string;
}

/** `response` payload of a successful find. */
export interface FMFindPayload<TFieldData = Record<string, string>> {
  data: FMRecord<TFieldData>[];
  dataInfo?: {
    database: string;
    layout: string;
    table: string;
    totalRecordCount: number;
    foundCount: number;
    returnedCount: number;
  };
}

/**
 * Values accepted inside `fieldData`. The Data API takes strings or numbers;
 * everything this app sends is normalised to a string before it goes out.
 */
export type FMFieldValue = string | number;

/** `fieldData` payload for a create/edit request. */
export type FMFieldData = Record<string, FMFieldValue>;

/** Body of a create-record request. */
export interface FMCreateRecordBody {
  fieldData: FMFieldData;
  portalData?: Record<string, FMFieldData[]>;
  /** 0 = US (default), 1 = file locale, 2 = ISO 8601. */
  dateformats?: 0 | 1 | 2;
}

/** One find query object: field name -> search string. */
export type FMFindQuery = Record<string, string>;

/** Body of a find-records request. */
export interface FMFindBody {
  query: FMFindQuery[];
  limit?: string | number;
  offset?: string | number;
  layout_response?: string;
}

/** Raised whenever FileMaker answers with a non-zero error code. */
export class FMError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(`FileMaker error ${code}: ${message}`);
    this.name = 'FMError';
    this.code = code;
    this.httpStatus = httpStatus;
  }

  /** 401 = "No records match the request" — an empty find, not a failure. */
  get isNoRecordsFound(): boolean {
    return this.code === '401';
  }
}
