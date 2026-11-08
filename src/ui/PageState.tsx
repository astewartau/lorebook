import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const Spinner = ({ label = 'Loading' }: { label?: string }) => (
  <span role="status" aria-label={label}
    className="inline-block h-6 w-6 rounded-full border-2 border-line border-t-accent-fill animate-spin" />
);

export const PageLoading = () => (
  <div className="flex items-center justify-center py-32"><Spinner /></div>
);

/** Centered message for empty, error and not-found states. */
export function PageMessage({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-4 py-24">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {children && <div className="text-muted max-w-md">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap gap-2 justify-center">{action}</div>}
    </div>
  );
}

export const NotFound = () => (
  <PageMessage title="Page not found" action={<Link to="/cards" className="btn-primary">Browse cards</Link>}>
    There's nothing at this address.
  </PageMessage>
);
