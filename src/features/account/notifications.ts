// Notification wording and times, kept free of React so they can be tested.

export interface NotificationRow {
  id: string;
  kind: string;
  data: unknown;
  read_at: string | null;
  created_at: string;
}

/** A sentence in pieces; `strong` pieces are names, shown in bold. */
export type Part = string | { strong: string };

export interface NotificationView {
  id: string;
  kind: string;
  parts: Part[];
  /** The same sentence as plain text, for screen readers and tests. */
  text: string;
  createdAt: Date;
  unread: boolean;
  /** For collection invites: the invite to accept or decline. */
  inviteId?: string;
  collectionName?: string;
  inviterName?: string;
  /** Where the notification leads, if anywhere. */
  href?: string;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function partsFor(kind: string, d: Record<string, unknown>): Part[] {
  switch (kind) {
    case 'collection_invite':
      return [{ strong: str(d.inviter_name) ?? 'Someone' }, ' invited you to share ',
        str(d.collection_name) ? { strong: str(d.collection_name)! } : 'their collection', '.'];
    case 'invite_accepted':
      return [{ strong: str(d.invitee_name) ?? 'Someone' }, ' accepted your invite and now shares your collection.'];
    case 'invite_declined':
      return [{ strong: str(d.invitee_name) ?? 'Someone' }, ' declined your invite to share your collection.'];
    case 'deck_comment':
      return [{ strong: str(d.author_name) ?? 'Someone' }, ' commented on ',
        str(d.deck_name) ? { strong: str(d.deck_name)! } : 'your deck', '.'];
    case 'collection_removed':
      return ['You were removed from a shared collection. Your own collection is active again.'];
    default:
      return ['You have a new notification.'];
  }
}

export const plainText = (parts: Part[]) => parts.map(p => (typeof p === 'string' ? p : p.strong)).join('');

export function describeNotification(row: NotificationRow): NotificationView {
  const d = (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>;
  const parts = partsFor(row.kind, d);
  return {
    id: row.id,
    kind: row.kind,
    parts,
    text: plainText(parts),
    createdAt: new Date(row.created_at),
    unread: !row.read_at,
    inviteId: row.kind === 'collection_invite' ? str(d.invite_id) : undefined,
    collectionName: str(d.collection_name),
    inviterName: str(d.inviter_name),
    href: row.kind === 'deck_comment' && str(d.deck_id)
      ? `/decks/${str(d.deck_id)}${str(d.comment_id) ? `#comment-${str(d.comment_id)}` : '#comments'}` : undefined,
  };
}

/** Newest first. */
export const sortNewestFirst = <T extends { createdAt: Date }>(items: T[]) =>
  [...items].sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function relativeTime(date: Date, now = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.ceil((startOfToday - date.getTime()) / DAY);
  if (days <= 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
