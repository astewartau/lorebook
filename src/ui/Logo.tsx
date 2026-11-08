import { Link } from 'react-router-dom';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/cards" className="flex items-center gap-2 shrink-0 rounded-lg" aria-label="Lorebook home">
      <img src="/imgs/lorebook-icon.png" alt="" className="h-8 w-8 object-contain" />
      {!compact && <span className="font-display text-xl font-semibold tracking-tight">Lorebook</span>}
    </Link>
  );
}
