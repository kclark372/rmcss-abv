'use client';

/**
 * Shared form primitives, so the RSA assessment and the RMC meeting form look
 * and behave the same. Reach for one of these before writing a class list in a
 * form.
 */

import type { ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Page chrome                                                                */
/* -------------------------------------------------------------------------- */

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8 border-b border-slate-300 pb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
    </header>
  );
}

export function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {title ? (
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
      ) : null}
      {description ? (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      ) : null}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

export function Alert({
  tone = 'error',
  title,
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    error: 'border-red-300 bg-red-50 text-red-900',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    info: 'border-blue-300 bg-blue-50 text-blue-900',
  } as const;

  return (
    <div className={`mb-6 rounded-md border p-4 text-sm ${tones[tone]}`} role="status">
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="mb-8">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[#799CAC] transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

const controlClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-800"
      >
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
      {hint ? <p className="mb-1.5 text-xs text-slate-500">{hint}</p> : null}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'time' | 'tel';
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={`${controlClass} ${invalid ? 'border-red-400' : ''}`}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${controlClass} resize-y`}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={`${controlClass} ${invalid ? 'border-red-400' : ''}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CheckboxRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 has-checked:border-indigo-400 has-checked:bg-indigo-50"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-indigo-600"
      />
      <span className="text-sm leading-snug text-slate-800">{label}</span>
    </label>
  );
}

export function CheckboxGrid({
  columns = 1,
  children,
}: {
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'staff';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const variants = {
    primary:
      'bg-[#799CAC] text-white hover:bg-[#63808d] focus-visible:ring-[#799CAC] disabled:bg-[#b3c8d0]',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 disabled:text-slate-400',
    staff:
      'bg-[#EAB308] text-black hover:bg-[#CA8A04] focus-visible:ring-[#EAB308] disabled:bg-[#EAB308] disabled:opacity-60',
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center justify-between gap-3">{children}</div>;
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Read-only display                                                          */
/* -------------------------------------------------------------------------- */

/** A read-only key/value pair, used for participant details on the RMC form. */
export function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

/** One answer the participant checked on their assessment, played back to them. */
export function RecapItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-slate-800">
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-500" />
      <span>{children}</span>
    </li>
  );
}

export function RecapList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

export function EmptyRecap({ children }: { children: ReactNode }) {
  return <p className="text-sm italic text-slate-500">{children}</p>;
}

/** Collapsible motivational-interviewing prompts for staff. */
export function TalkingPoints({
  title,
  points,
  subList,
}: {
  title: string;
  points: string[];
  /** A labelled group below the main bullets, e.g. the MI strategies. */
  subList?: { label: string; points: string[] };
}) {
  return (
    <details className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-amber-900 marker:text-amber-500">
        {title}
      </summary>
      <ul className="mt-2 space-y-1.5 pl-4">
        {points.map((point) => (
          <li key={point} className="list-disc text-sm leading-snug text-amber-900">
            {point}
          </li>
        ))}
      </ul>
      {subList ? (
        <>
          <p className="mt-3 text-sm font-medium text-amber-900">{subList.label}</p>
          <ul className="mt-1.5 space-y-1.5 pl-4">
            {subList.points.map((point) => (
              <li key={point} className="list-disc text-sm leading-snug text-amber-900">
                {point}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </details>
  );
}

/** A generated record ID, shown to staff so they can quote it on the next form. */
export function IdDisplay({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <code className="block break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900">
        {value}
      </code>
    </Field>
  );
}

/**
 * The comma-separated sentence stored in `legalStatus` / `housingStatus`,
 * rendered the way the original form showed it.
 */
export function ConcatenatedField({ value }: { value: string }) {
  if (!value) return <EmptyRecap>None reported</EmptyRecap>;
  return (
    <p className="rounded-md border-l-4 border-indigo-500 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800">
      {value}
    </p>
  );
}

/** The 1-10 importance / confidence ruler. */
export function Ruler({
  name,
  value,
  onChange,
  question,
}: {
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  question: ReactNode;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-slate-800">{question}</p>
      <div className="grid grid-cols-10 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const id = `${name}-${num}`;
          return (
            <label
              key={num}
              htmlFor={id}
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-slate-200 py-2 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 has-checked:border-indigo-500 has-checked:bg-indigo-50"
            >
              <span className="text-sm font-semibold text-slate-700">{num}</span>
              <input
                id={id}
                type="radio"
                name={name}
                value={num}
                checked={value === num}
                onChange={() => onChange(num)}
                className="size-4 cursor-pointer accent-indigo-600"
              />
            </label>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs text-slate-500">
        <span>Not at all (1)</span>
        <span>Low (2–3)</span>
        <span>Moderate (4–6)</span>
        <span>High (7–10)</span>
      </div>
    </div>
  );
}
