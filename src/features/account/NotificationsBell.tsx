import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Check, LogOut, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useToast } from '../../contexts/ToastContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { keys } from '../../app/queryClient';
import * as api from '../../lib/api';
import { Dialog } from '../../ui/Dialog';
import { Spinner } from '../../ui/PageState';
import { NotificationView, Part, describeNotification, relativeTime, sortNewestFirst } from './notifications';

const POLL_MS = 30_000;

/** Notifications and collection invites, shown in the top bar when signed in. */
export function NotificationsBell() {
  const { user } = useAuth();
  if (!user) return null;
  return <BellButton userId={user.id} />;
}

const ICONS: Record<string, typeof Bell> = {
  collection_invite: UserPlus,
  invite_accepted: Check,
  invite_declined: X,
  collection_removed: LogOut,
};

function Sentence({ parts }: { parts: Part[] }) {
  return <>{parts.map((p, i) => (typeof p === 'string' ? p : <strong key={i} className="font-semibold">{p.strong}</strong>))}</>;
}

function errorText(e: unknown) {
  const message = e instanceof Error ? e.message : '';
  if (/already answered|no such invite/i.test(message)) return 'This invite was already answered or cancelled.';
  return message || 'Something went wrong. Try again.';
}

function BellButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [accepting, setAccepting] = useState<NotificationView | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { refreshUserProfile } = useProfile();

  const notifications = useQuery({
    queryKey: [...keys.notifications(), userId],
    queryFn: () => api.getNotifications(50),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
  const invites = useQuery({
    queryKey: keys.invites({ inviteeId: userId }),
    queryFn: () => api.getPendingInvites({ inviteeId: userId }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const items = useMemo(() => sortNewestFirst((notifications.data ?? []).map(describeNotification)), [notifications.data]);
  const pending = useMemo(() => new Set((invites.data ?? []).map(i => i.id)), [invites.data]);
  const unread = items.filter(n => n.unread).length;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.notifications() });
    queryClient.invalidateQueries({ queryKey: ['invites'] });
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onSuccess: refresh,
    onError: e => toast.error(errorText(e)),
  });

  const respond = useMutation({
    mutationFn: ({ n, accept, merge }: { n: NotificationView; accept: boolean; merge: boolean }) =>
      api.respondToInvite(n.inviteId!, accept, merge),
    onSuccess: async (_d, { n, accept }) => {
      // Answering an invite also marks its notification read.
      await api.markNotificationsRead([n.id]).catch(() => undefined);
      if (accept) {
        await refreshUserProfile();
        queryClient.invalidateQueries({ queryKey: ['collection'] });
        queryClient.invalidateQueries({ queryKey: ['binders'] });
        toast.success(`You now share ${n.collectionName ?? 'the collection'}. It's your active collection.`);
      } else {
        toast.info('Invite declined.');
      }
      setAccepting(null);
    },
    onError: e => toast.error(errorText(e)),
    onSettled: refresh,
  });

  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);
  useEscapeKey(close, open && !accepting);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const label = unread ? `Notifications, ${unread} unread` : 'Notifications';

  return (
    <div ref={root} className="relative">
      <button ref={button} type="button" className="icon-btn relative" aria-label={label} title="Notifications"
        aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Bell size={20} />
        {unread > 0 && (
          <span aria-hidden className="absolute top-1 right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-accent-fill text-on-accent text-[11px] font-semibold leading-[18px] text-center ring-2 ring-bg">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div ref={panel} role="dialog" aria-label="Notifications" tabIndex={-1}
          className="fixed left-2 right-2 top-[3.75rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] panel shadow-pop z-50 flex flex-col max-h-[min(560px,calc(100dvh-9rem))] sm:max-h-[min(560px,calc(100dvh-5rem))] outline-none">
          <div className="flex items-center gap-2 pl-4 pr-2 h-12 border-b border-line shrink-0">
            <h2 className="font-semibold flex-1">Notifications</h2>
            {unread > 0 && (
              <button type="button" className="btn-ghost btn-sm text-accent" disabled={markRead.isPending} onClick={() => markRead.mutate()}>
                Mark all read
              </button>
            )}
            <button type="button" className="icon-btn h-9 w-9" aria-label="Close notifications" onClick={close}><X size={18} /></button>
          </div>

          <div className="overflow-y-auto overscroll-contain">
            {notifications.isPending ? (
              <div className="flex justify-center py-12"><Spinner label="Loading notifications" /></div>
            ) : notifications.isError ? (
              <div className="px-6 py-10 text-center space-y-3">
                <p className="text-sm text-muted">Couldn't load your notifications.</p>
                <button type="button" className="btn-secondary btn-sm" onClick={() => notifications.refetch()}>Try again</button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <BellOff size={28} className="mx-auto text-muted" />
                <p className="mt-3 font-medium">You're all caught up</p>
                <p className="mt-1 text-sm text-muted">Invites to share a collection, and replies to yours, show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map(n => {
                  const Icon = ICONS[n.kind] ?? Bell;
                  const isPending = !!n.inviteId && pending.has(n.inviteId);
                  const busy = respond.isPending && respond.variables?.n.id === n.id;
                  return (
                    <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.unread ? 'bg-accent-fill/[0.06]' : ''}`}>
                      <span className={`mt-0.5 h-9 w-9 shrink-0 rounded-full inline-flex items-center justify-center ${n.kind === 'collection_invite' ? 'bg-accent-fill/15 text-accent' : 'bg-surface-2 text-muted'}`}>
                        <Icon size={17} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug"><Sentence parts={n.parts} /></p>
                        <p className="mt-0.5 text-xs text-muted">
                          <time dateTime={n.createdAt.toISOString()} title={n.createdAt.toLocaleString()}>{relativeTime(n.createdAt)}</time>
                          {n.unread && <span className="sr-only"> · unread</span>}
                        </p>
                        {isPending && (
                          <div className="mt-2.5 flex gap-2">
                            <button type="button" className="btn-primary btn-sm h-9" disabled={busy}
                              onClick={() => { setOpen(false); setAccepting(n); }}>Accept</button>
                            <button type="button" className="btn-secondary btn-sm h-9" disabled={busy}
                              onClick={() => respond.mutate({ n, accept: false, merge: false })}>
                              {busy ? 'Declining…' : 'Decline'}
                            </button>
                          </div>
                        )}
                      </div>
                      {n.unread && <span aria-hidden className="mt-2 h-2 w-2 rounded-full bg-accent-fill shrink-0" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <AcceptInviteDialog notification={accepting} busy={respond.isPending}
        onClose={() => { if (!respond.isPending) setAccepting(null); }}
        onAccept={merge => accepting && respond.mutate({ n: accepting, accept: true, merge })} />
    </div>
  );
}

function AcceptInviteDialog({ notification: n, busy, onClose, onAccept }: {
  notification: NotificationView | null;
  busy: boolean;
  onClose: () => void;
  onAccept: (merge: boolean) => void;
}) {
  const [merge, setMerge] = useState<boolean | null>(null);
  useEffect(() => setMerge(null), [n?.id]);
  const name = n?.collectionName ?? 'this collection';
  const option = (value: boolean, title: string, detail: string) => (
    <label className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${merge === value ? 'border-accent-fill bg-accent-fill/10' : 'border-line hover:bg-surface-2'}`}>
      <input type="radio" name="merge" className="mt-1 accent-[rgb(var(--accent-fill))]" checked={merge === value} onChange={() => setMerge(value)} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted mt-0.5">{detail}</span>
      </span>
    </label>
  );
  return (
    <Dialog open={!!n} onClose={onClose} title={`Join ${name}?`}
      description={<>{n?.inviterName ?? 'Someone'} wants to share their collection with you. Once you join, it becomes your active collection and changes you make show up for everyone in it.</>}
      footer={<>
        <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn-primary" disabled={merge === null || busy} onClick={() => merge !== null && onAccept(merge)}>
          {busy ? 'Joining…' : 'Join collection'}
        </button>
      </>}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-2">Add your own cards to it?</legend>
        {option(true, 'Yes, add my cards', 'Your cards are added to the shared collection. Your own collection stays as it is.')}
        {option(false, 'No, start from what they have', 'The shared collection is left as it is. Your own collection is kept, unchanged.')}
      </fieldset>
    </Dialog>
  );
}
