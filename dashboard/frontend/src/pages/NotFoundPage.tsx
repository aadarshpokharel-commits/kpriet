import { Link } from 'react-router';
import { paths } from '@/router/paths';

export function NotFoundPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">This dashboard page doesn't exist or has moved.</p>
      <Link to={paths.root} className="mt-6 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline">
        Go to the dashboard home
      </Link>
    </div>
  );
}
