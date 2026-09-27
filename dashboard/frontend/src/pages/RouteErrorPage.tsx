import { isRouteErrorResponse, useRouteError } from 'react-router';
import { env } from '@/config/env';

/** Shown when a page crashes while rendering or loading. */
export function RouteErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : undefined;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">This page stopped working</h1>
      <p className="mt-2 text-muted">Reload the page to try again. If it keeps happening, contact the administrator.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 h-9 rounded-md bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-strong"
      >
        Reload page
      </button>
      {env.isDev && detail && <pre className="mt-6 overflow-x-auto text-xs text-muted">{detail}</pre>}
    </div>
  );
}
