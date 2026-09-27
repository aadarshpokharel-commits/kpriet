import { Button } from '@/components/ui/Button';
import { StatusDot, type StatusTone } from '@/components/ui/StatusDot';
import { env } from '@/config/env';
import { useLiveness, useReadiness } from '@/hooks/useSystemStatus';
import { isAppApiError } from '@/lib/api/AppApiError';
import { readinessFailureDetailsSchema } from '@/schemas/system.schema';
import { cn } from '@/utils/cn';
import { formatClockTime, formatDuration } from '@/utils/format';

interface Check {
  name: string;
  tone: StatusTone;
  state: string;
  detail: string;
  reference?: string;
}

export function SystemStatusPage() {
  const live = useLiveness();
  const ready = useReadiness();

  const api: Check = live.isSuccess
    ? {
        name: 'Dashboard server',
        tone: 'ok',
        state: 'Running',
        detail: `Up for ${formatDuration(live.data.uptimeSeconds)} in ${live.data.environment} mode`,
      }
    : live.isError
      ? {
          name: 'Dashboard server',
          tone: 'bad',
          state: 'Not reachable',
          detail: live.error.message,
          reference: isAppApiError(live.error) ? live.error.requestId : undefined,
        }
      : { name: 'Dashboard server', tone: 'idle', state: 'Checking', detail: 'Contacting the server.' };

  const db: Check = (() => {
    const name = 'Database';
    if (ready.isSuccess) {
      return { name, tone: 'ok', state: 'Connected', detail: `Responded in ${ready.data.database.latencyMs} ms` };
    }
    if (ready.isPending) return { name, tone: 'idle', state: 'Checking', detail: 'Waiting for the server.' };
    if (live.isError) return { name, tone: 'idle', state: 'Unknown', detail: 'Needs the dashboard server first.' };

    const err = ready.error;
    const parsed = isAppApiError(err) ? readinessFailureDetailsSchema.safeParse(err.details) : null;
    const connecting = parsed?.success && parsed.data.database.status === 'connecting';
    return {
      name,
      tone: connecting ? 'warn' : 'bad',
      state: connecting ? 'Connecting' : 'Not reachable',
      detail: connecting ? 'The server is still trying to connect.' : err.message,
      reference: isAppApiError(err) ? err.requestId : undefined,
    };
  })();

  const summary =
    api.tone === 'bad'
      ? { tone: 'bad' as const, text: "The dashboard can't reach its server." }
      : db.tone === 'ok'
        ? { tone: 'ok' as const, text: 'Everything is working.' }
        : db.tone === 'idle'
          ? { tone: 'idle' as const, text: 'Checking the system…' }
          : { tone: db.tone, text: "The server is running, but the database isn't available." };

  const lastChecked = Math.max(live.dataUpdatedAt, live.errorUpdatedAt, ready.dataUpdatedAt, ready.errorUpdatedAt);
  const isFetching = live.isFetching || ready.isFetching;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">System status</h1>
      <p className="mt-1 text-muted">Checks whether the dashboard can reach its server and database.</p>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mt-8 border-l-4 py-1 pl-4 text-xl font-medium leading-snug sm:text-2xl',
          summary.tone === 'ok' && 'border-ok',
          summary.tone === 'warn' && 'border-warn',
          summary.tone === 'bad' && 'border-bad',
          summary.tone === 'idle' && 'border-line text-muted',
        )}
      >
        {summary.text}
      </p>

      <section aria-label="Checks" className="mt-8 rounded-lg border border-line bg-panel">
        <ul className="divide-y divide-line">
          {[api, db].map((check) => (
            <li key={check.name} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
              <span className="font-medium sm:w-44 sm:shrink-0">{check.name}</span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <StatusDot status={check.tone} />
                  {check.state}
                </span>
                <p className="mt-0.5 break-words text-sm text-muted">{check.detail}</p>
                {check.reference && (
                  <p className="mt-1 text-xs text-muted">
                    Reference <code className="select-all">{check.reference}</code>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/60 px-5 py-3">
          <span className="text-sm text-muted">
            {lastChecked > 0 ? `Last checked at ${formatClockTime(lastChecked)}` : 'Not checked yet'}
          </span>
          <Button
            variant="secondary"
            isLoading={isFetching}
            onClick={() => {
              void live.refetch();
              void ready.refetch();
            }}
          >
            Check again
          </Button>
        </div>
      </section>

      {env.isDev && api.tone === 'bad' && (
        <p className="mt-4 text-sm text-muted">
          Development tip: start the API with <code>npm run dev</code> in <code>dashboard/backend</code>, and make sure{' '}
          <code>VITE_API_BASE_URL</code> points to it (currently <code>{env.apiBaseUrl}</code>).
        </p>
      )}
    </div>
  );
}
