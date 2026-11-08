// Small pieces shared by the collection pages.

import { ReactNode, useState } from 'react';
import { AlertTriangle, Check, CloudUpload, Copy, Link2 } from 'lucide-react';
import { useCollection } from '../../contexts/CollectionContext';
import { useToast } from '../../contexts/ToastContext';
import { setLogo } from './progress';

export function ProgressBar({ value, max, label, className = 'h-2' }: { value: number; max: number; label: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      className={`${className} w-full rounded-full bg-surface-3 overflow-hidden`}>
      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-accent-fill'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="panel px-4 py-3 min-w-0">
      <div className="text-2xl font-semibold tabular-nums leading-tight">{value}</div>
      <div className="text-sm text-muted truncate">{label}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

/** A set's logo where one is shipped, otherwise a badge with its code. */
export function SetMark({ code, name, className = 'h-12' }: { code: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = setLogo(code);
  if (src && !failed) {
    return <img src={src} alt={name} className={`${className} w-auto max-w-full object-contain`} onError={() => setFailed(true)} />;
  }
  return (
    <span role="img" aria-label={name}
      className={`${className} aspect-square inline-flex items-center justify-center rounded-xl bg-surface-2 border border-line font-display font-semibold text-xl text-accent`}>
      {code}
    </span>
  );
}

/** "Saving…" or "Not saved" for the collection's outbox; nothing when all is saved. */
export function SyncStatus() {
  const { syncStatus, pendingChanges } = useCollection();
  if (syncStatus === 'error') {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-danger/15 text-danger text-sm">
        <AlertTriangle size={14} />Couldn't save {pendingChanges} change{pendingChanges === 1 ? '' : 's'}, retrying
      </span>
    );
  }
  if (syncStatus === 'saving' || pendingChanges > 0) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-2 text-muted text-sm">
        <CloudUpload size={14} />Saving…
      </span>
    );
  }
  return null;
}

export function shareUrl(binderId: string) {
  return `${window.location.origin}/b/${binderId}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A public/private switch with the link to copy when public. */
export function ShareControl({ isPublic, busy, binderId, onChange, what = 'binder' }: {
  isPublic: boolean;
  busy?: boolean;
  binderId?: string;
  onChange: (next: boolean) => void;
  what?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!binderId) return;
    if (await copyText(shareUrl(binderId))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info(shareUrl(binderId), 10_000);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" role="switch" aria-checked={isPublic} disabled={busy} onClick={() => onChange(!isPublic)}
        className="h-10 inline-flex items-center gap-2.5 pl-2 pr-3 rounded-lg hover:bg-surface-2 text-sm font-medium disabled:opacity-60"
        title={isPublic ? `Anyone with the link can see this ${what}` : `Only you can see this ${what}`}>
        <span className={`relative h-6 w-10 rounded-full transition-colors ${isPublic ? 'bg-accent-fill' : 'bg-surface-3'}`}>
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-[left] ${isPublic ? 'left-5' : 'left-1'}`} />
        </span>
        <Link2 size={16} className="text-muted" />
        <span>{isPublic ? 'Shared' : 'Share'}</span>
      </button>
      {isPublic && binderId && (
        <button type="button" className="btn-secondary h-10" onClick={copy}>
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy link'}
        </button>
      )}
    </div>
  );
}

/** A two-or-more option segmented control. */
export function Segmented<T extends string>({ label, value, options, onChange, stretch }: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  /** Fill the width on phones. */
  stretch?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex p-1 gap-1 bg-surface-2 rounded-lg ${stretch ? 'w-full sm:w-auto' : 'shrink-0'}`}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.title} onClick={() => onChange(o.value)}
          className={`h-8 rounded-md text-sm font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${stretch ? 'flex-1 sm:flex-none px-1.5 sm:px-3' : 'px-3'} ${value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}
