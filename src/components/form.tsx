'use client';

import { forwardRef, useId } from 'react';
import { cx } from './ui';
import { useI18n } from '@/i18n';

const control =
  'w-full rounded-xl border border-line-strong bg-surface px-3.5 text-ink placeholder:text-muted/80 transition-colors focus:border-brand focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-brand/20 disabled:opacity-60 aria-[invalid=true]:border-danger';

export function Field({
  label,
  hint,
  error,
  children,
  optional,
  id,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cx('min-w-0', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
          {optional && <span className="ml-1.5 font-normal text-muted">({t('common.optional')})</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.82rem] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.82rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode; hint?: React.ReactNode; error?: string; optional?: boolean; fieldClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, optional, className, fieldClassName, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={fid} className={fieldClassName}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(control, 'h-11', className)}
        {...rest}
      />
    </Field>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: React.ReactNode; hint?: React.ReactNode; error?: string; optional?: boolean; fieldClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, optional, className, fieldClassName, id, rows = 3, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={fid} className={fieldClassName}>
      <textarea
        ref={ref}
        id={fid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(control, 'py-2.5 leading-relaxed', className)}
        {...rest}
      />
    </Field>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  fieldClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, optional, options, placeholder, className, fieldClassName, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={fid} className={fieldClassName}>
      <select
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        className={cx(control, 'h-11 appearance-none bg-[length:1.1em] bg-[right_0.8rem_center] bg-no-repeat pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2366716f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
});

export function Checkbox({
  label,
  hint,
  checked,
  onChange,
  disabled,
  className,
  name,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  const id = useId();
  return (
    <div className={cx('flex items-start gap-3', className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)]"
      />
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[0.95rem] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.82rem] text-muted">{hint}</span>}
      </label>
    </div>
  );
}

export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[0.95rem] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.82rem] text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-50',
          checked ? 'border-brand bg-brand' : 'border-line-strong bg-bg-2',
        )}
      >
        <span className={cx('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: React.ReactNode;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <div id={id} className="mb-1.5 text-sm font-semibold text-ink">
          {label}
        </div>
      )}
      <div role="radiogroup" aria-labelledby={label ? id : undefined} className="inline-flex flex-wrap gap-1 rounded-xl bg-bg-2 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckboxGroup({
  label,
  hint,
  options,
  value,
  onChange,
  error,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  options: { value: string; label: React.ReactNode; hint?: React.ReactNode }[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  return (
    <fieldset>
      {label && <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>}
      {hint && <p className="-mt-1 mb-2 text-[0.82rem] text-muted">{hint}</p>}
      <div className="space-y-2.5">
        {options.map((o) => (
          <Checkbox
            key={o.value}
            label={o.label}
            hint={o.hint}
            checked={value.includes(o.value)}
            onChange={(c) => onChange(c ? [...value, o.value] : value.filter((v) => v !== o.value))}
          />
        ))}
      </div>
      {error && <p className="mt-1.5 text-[0.82rem] font-medium text-danger">{error}</p>}
    </fieldset>
  );
}
