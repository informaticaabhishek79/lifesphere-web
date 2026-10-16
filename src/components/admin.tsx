'use client';

import { cx } from './ui';
import { useState as useStateA } from 'react';
import { FormDialog } from './dialog';
import { Checkbox, Input, Select, Textarea } from './form';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

/** Plain, dense table for staff screens. */
export function DataTable<T>({ rows, columns, rowKey, onRowClick, empty = 'Nothing to show.' }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; empty?: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c.key} className={cx('px-3 py-2 font-semibold', c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cx(onRowClick && 'cursor-pointer hover:bg-surface-2')}>
              {columns.map((c) => (
                <td key={c.key} className={cx('px-3 py-2.5 align-top', c.className)}>
                  {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const shortId = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

export function Json({ value }: { value: unknown }) {
  return <pre className="max-h-80 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

// ------------------------------------------------------------------ spec-driven editor for catalogue records

export interface FieldSpec {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'date' | 'tags' | 'json';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  createOnly?: boolean;
}

type Values = Record<string, unknown>;

function toInput(spec: FieldSpec, v: unknown): unknown {
  if (spec.type === 'checkbox') return Boolean(v);
  if (spec.type === 'tags') return Array.isArray(v) ? (v as string[]).join(', ') : '';
  if (spec.type === 'json') return v === undefined ? '{}' : JSON.stringify(v, null, 2);
  if (spec.type === 'date') return typeof v === 'string' ? v.slice(0, 10) : '';
  return v === null || v === undefined ? '' : String(v);
}

function fromInput(spec: FieldSpec, v: unknown): unknown {
  if (spec.type === 'checkbox') return Boolean(v);
  if (spec.type === 'number') return v === '' ? undefined : Number(v);
  if (spec.type === 'tags') return String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (spec.type === 'json') return JSON.parse(String(v || '{}'));
  const s = String(v ?? '').trim();
  return s === '' ? undefined : s;
}

export function RecordDialog({
  title,
  fields,
  initial,
  editing,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: FieldSpec[];
  initial?: Values | null;
  editing: boolean;
  onClose: () => void;
  onSubmit: (body: Values) => Promise<unknown>;
}) {
  const [vals, setVals] = useStateA<Values>(() => Object.fromEntries(fields.map((f) => [f.name, toInput(f, initial?.[f.name])])));
  const shown = fields.filter((f) => !(editing && f.createOnly));
  const missing = shown.some((f) => f.required && (vals[f.name] === '' || vals[f.name] === undefined));
  return (
    <FormDialog
      open
      size="lg"
      onClose={onClose}
      title={title}
      disabled={missing}
      onSubmit={async () => {
        const body: Values = {};
        for (const f of shown) {
          const v = fromInput(f, vals[f.name]);
          if (v !== undefined) body[f.name] = v;
        }
        await onSubmit(body);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((f) => {
          const common = { label: f.label, hint: f.hint };
          const set = (v: unknown) => setVals({ ...vals, [f.name]: v });
          if (f.type === 'checkbox') return <Checkbox key={f.name} {...common} checked={Boolean(vals[f.name])} onChange={set} className="sm:col-span-2" />;
          if (f.type === 'textarea' || f.type === 'json')
            return <Textarea key={f.name} {...common} value={String(vals[f.name] ?? '')} onChange={(e) => set(e.target.value)} rows={f.type === 'json' ? 8 : 4} fieldClassName="sm:col-span-2" className={f.type === 'json' ? 'font-mono text-xs' : undefined} />;
          if (f.type === 'select') return <Select key={f.name} {...common} value={String(vals[f.name] ?? '')} onChange={(e) => set(e.target.value)} options={f.options ?? []} placeholder={f.required ? undefined : '—'} />;
          return <Input key={f.name} {...common} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={String(vals[f.name] ?? '')} onChange={(e) => set(e.target.value)} />;
        })}
      </div>
    </FormDialog>
  );
}
