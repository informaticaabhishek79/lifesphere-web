import { FileText, ImageIcon } from 'lucide-react';
import { cx } from './ui';

export const sizeLabel = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function FileIcon({ mime, className }: { mime: string; className?: string }) {
  const Icon = mime.startsWith('image/') ? ImageIcon : FileText;
  return (
    <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2', className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

