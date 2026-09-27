import { cn } from '@/utils/cn';

export type StatusTone = 'ok' | 'warn' | 'bad' | 'idle';

const tone: Record<StatusTone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  idle: 'bg-line',
};

/** Colour is never the only signal: always pair with a text label. */
export function StatusDot({ status }: { status: StatusTone }) {
  return <span aria-hidden="true" className={cn('inline-block size-2.5 shrink-0 rounded-full', tone[status])} />;
}
