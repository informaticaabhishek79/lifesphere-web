'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { AsYouType, type CountryCode, getExampleNumber, isValidPhoneNumber } from 'libphonenumber-js/min';
import examples from 'libphonenumber-js/mobile/examples';
import { useI18n } from '@/i18n';
import { detectCountry, useCountries, useCountryOptions } from '@/lib/countries';
import { Field } from './form';

/**
 * Phone number with a country picker. The country is detected (saved choice, device time zone, browser
 * language) and can be changed. The parent receives the number as typed plus the ISO country; the API reads
 * national numbers in that country.
 */
export function PhoneInput({
  label,
  hint,
  value,
  onChange,
  country,
  onCountryChange,
  required,
  inputClassName,
  autoFocus,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  country: string;
  onCountryChange: (c: string) => void;
  required?: boolean;
  inputClassName?: string;
  autoFocus?: boolean;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const options = useCountryOptions(locale);
  const dial = options.find((o) => o.code === country)?.dialCode ?? '';
  const valid = useMemo(() => {
    if (!value.trim()) return null;
    try {
      return isValidPhoneNumber(value, value.trim().startsWith('+') ? undefined : (country as CountryCode));
    } catch {
      return false;
    }
  }, [value, country]);
  const [touched, setTouched] = useState(false);
  const example = useMemo(() => {
    try {
      return getExampleNumber(country as CountryCode, examples)?.formatNational() ?? '';
    } catch {
      return '';
    }
  }, [country]);

  return (
    <Field label={label} hint={hint} error={touched && valid === false ? t('auth.phoneInvalid') : undefined} id={id}>
      <div className="flex gap-2" dir="ltr">
        {/* The native list is easy to search by typing; the visible face shows just the flag and code. */}
        <div className="relative h-13 w-[6.5rem] shrink-0 rounded-xl border border-line-strong bg-surface focus-within:border-brand">
          <span aria-hidden className="pointer-events-none flex h-full items-center justify-center gap-1.5 px-2 text-base font-semibold text-ink">
            <span className="text-lg leading-none">{options.find((o) => o.code === country)?.flag}</span>
            {dial}
            <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          <select aria-label={t('auth.country')} value={country} onChange={(e) => onCountryChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.flag} {o.name} ({o.dialCode})
              </option>
            ))}
          </select>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          required={required}
          placeholder={example}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            // Format as the person types, but never fight deletions.
            const formatted = raw.length > value.length ? new AsYouType(raw.trim().startsWith('+') ? undefined : (country as CountryCode)).input(raw) : raw;
            onChange(formatted);
          }}
          onBlur={() => setTouched(true)}
          aria-invalid={touched && valid === false ? true : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`h-13 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3.5 text-lg tracking-wide text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none ${inputClassName ?? ''}`}
        />
      </div>
    </Field>
  );
}

/** Detects the person's country once the country list has loaded. */
export function useDetectedCountry(): [string, (c: string) => void] {
  const { data } = useCountries();
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    if (country === null && data) setCountry(detectCountry(data));
  }, [data, country]);
  return [country ?? 'IN', setCountry];
}
