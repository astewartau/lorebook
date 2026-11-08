import { ReactNode } from 'react';

/** A small centred card for the pages reached from email links. */
export function LinkCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="panel p-6 sm:p-8 shadow-card">
        <div className="h-12 w-12 rounded-full bg-accent-fill/15 text-accent inline-flex items-center justify-center">{icon}</div>
        <h1 className="mt-4 font-display text-2xl font-semibold">{title}</h1>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
