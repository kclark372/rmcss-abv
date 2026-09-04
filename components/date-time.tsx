'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';

import { invalidControlClass } from '@/components/ui';

/**
 * Date and time inputs that don't rely on the browser's native pickers, which
 * look and behave differently in every browser and are awkward on the tablets
 * staff use in the field.
 *
 * Both keep the same value format the native inputs used, so nothing downstream
 * changes: `YYYY-MM-DD` for dates and `HH:MM` (24-hour) for times.
 */

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

const triggerClass =
  'flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

/** Closes the popover on an outside click or Escape. */
function useDismiss(
  ref: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, isOpen, close]);
}

/* -------------------------------------------------------------------------- */
/* Date                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Parses `YYYY-MM-DD` into a Date in local time.
 * `new Date('2026-09-03')` would parse as UTC midnight and can land on the
 * previous day west of Greenwich, so the parts are passed separately.
 */
function parseISODate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Formats a Date back to `YYYY-MM-DD` using its local parts. */
function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Select a date',
  disableAfterToday = false,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** When set, days after today can't be picked from the calendar. */
  disableAfterToday?: boolean;
  invalid?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useDismiss(container, isOpen, () => setIsOpen(false));

  const selected = parseISODate(value);

  return (
    <div ref={container} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={invalid || undefined}
        className={`${triggerClass} ${invalid ? invalidControlClass : ''}`}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? DATE_LABEL.format(selected) : placeholder}
        </span>
        <CalendarIcon />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 z-20 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            disabled={disableAfterToday ? { after: new Date() } : undefined}
            startMonth={new Date(new Date().getFullYear() - 2, 0)}
            endMonth={
              disableAfterToday
                ? new Date()
                : new Date(new Date().getFullYear() + 2, 11)
            }
            onSelect={(date) => {
              onChange(date ? toISODate(date) : '');
              setIsOpen(false);
            }}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="mt-1 w-full rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Time                                                                       */
/* -------------------------------------------------------------------------- */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Splits `HH:MM` (24-hour) into the three parts the selects display. */
function splitTime(value: string): { hour: number; minute: number; meridiem: 'AM' | 'PM' } | null {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return { hour, minute, meridiem };
}

/** Reassembles the three selects into `HH:MM` (24-hour). */
function joinTime(hour: number, minute: number, meridiem: 'AM' | 'PM'): string {
  let hour24 = hour % 12;
  if (meridiem === 'PM') hour24 += 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour24)}:${pad(minute)}`;
}

const selectClass =
  'rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

/**
 * A time input built from three selects rather than `<input type="time">`.
 * Minutes step by five, which is all the intake and pickup times need.
 */
export function TimePicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const fallbackId = useId();
  const groupId = id ?? fallbackId;
  const parts = splitTime(value);

  // Until all three are chosen, default to 9:00 AM so one change is enough.
  const hour = parts?.hour ?? 9;
  const minute = parts?.minute ?? 0;
  const meridiem = parts?.meridiem ?? 'AM';
  const timeSelectClass = `${selectClass} ${invalid ? invalidControlClass : ''}`;

  function update(next: Partial<{ hour: number; minute: number; meridiem: 'AM' | 'PM' }>) {
    onChange(
      joinTime(
        next.hour ?? hour,
        next.minute ?? minute,
        next.meridiem ?? meridiem,
      ),
    );
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-labelledby={groupId}>
      <select
        id={groupId}
        aria-label="Hour"
        aria-invalid={invalid || undefined}
        value={parts ? hour : ''}
        onChange={(event) => update({ hour: Number(event.target.value) })}
        className={timeSelectClass}
      >
        {!parts ? <option value="">--</option> : null}
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <span aria-hidden className="text-slate-400">
        :
      </span>

      <select
        aria-label="Minute"
        aria-invalid={invalid || undefined}
        value={parts ? minute : ''}
        onChange={(event) => update({ minute: Number(event.target.value) })}
        className={timeSelectClass}
      >
        {!parts ? <option value="">--</option> : null}
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>

      <select
        aria-label="AM or PM"
        aria-invalid={invalid || undefined}
        value={parts ? meridiem : ''}
        onChange={(event) =>
          update({ meridiem: event.target.value as 'AM' | 'PM' })
        }
        className={timeSelectClass}
      >
        {!parts ? <option value="">--</option> : null}
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-4 shrink-0 text-slate-400"
    >
      <rect x="2.75" y="4.25" width="14.5" height="13" rx="2" />
      <path d="M2.75 8.25h14.5M6.75 2.75v3M13.25 2.75v3" strokeLinecap="round" />
    </svg>
  );
}
