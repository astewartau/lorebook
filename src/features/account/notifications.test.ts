import { describe, expect, it } from 'vitest';
import { describeNotification, relativeTime, sortNewestFirst } from './notifications';

const row = (kind: string, data: unknown, read_at: string | null = null) => ({
  id: 'n1', kind, data, read_at, created_at: '2026-11-08T10:00:00Z',
});

describe('describeNotification', () => {
  it('words a collection invite with names in bold', () => {
    const n = describeNotification(row('collection_invite', {
      invite_id: 'i1', collection_id: 'c1', collection_name: 'Family binder', inviter_name: 'Ashley',
    }));
    expect(n.text).toBe('Ashley invited you to share Family binder.');
    expect(n.parts[0]).toEqual({ strong: 'Ashley' });
    expect(n.inviteId).toBe('i1');
    expect(n.unread).toBe(true);
  });

  it('copes with missing names', () => {
    expect(describeNotification(row('collection_invite', {})).text).toBe('Someone invited you to share their collection.');
    expect(describeNotification(row('invite_accepted', null)).text).toBe('Someone accepted your invite and now shares your collection.');
  });

  it('words the other kinds', () => {
    expect(describeNotification(row('invite_declined', { invitee_name: 'Sam' })).text).toBe('Sam declined your invite to share your collection.');
    expect(describeNotification(row('collection_removed', { collection_id: 'c' }, '2026-11-08T11:00:00Z')).unread).toBe(false);
    expect(describeNotification(row('collection_removed', {})).text).toMatch(/removed from a shared collection/);
    expect(describeNotification(row('something_new', {})).text).toBe('You have a new notification.');
    expect(describeNotification(row('invite_accepted', { invite_id: 'x' })).inviteId).toBeUndefined();
  });

  it('sorts newest first', () => {
    const a = { createdAt: new Date('2026-01-01') };
    const b = { createdAt: new Date('2026-02-01') };
    expect(sortNewestFirst([a, b])).toEqual([b, a]);
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 10, 8, 15, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it('reads naturally', () => {
    expect(relativeTime(ago(20_000), now)).toBe('just now');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(relativeTime(ago(3 * 3600_000), now)).toBe('3 h ago');
    expect(relativeTime(new Date(2026, 10, 7, 9, 0), now)).toBe('yesterday');
    expect(relativeTime(new Date(2026, 10, 4, 9, 0), now)).toBe('4 days ago');
    expect(relativeTime(new Date(2025, 2, 3), now)).toMatch(/2025/);
    expect(relativeTime(new Date(2026, 2, 3), now)).not.toMatch(/2026/);
  });
});

describe('deck comment notifications', () => {
  it('says who commented and links to the comment', () => {
    const n = describeNotification({ id: '1', kind: 'deck_comment', read_at: null, created_at: '2026-11-09T00:00:00Z',
      data: { deck_id: 'd1', deck_name: 'Ruby Tempo', comment_id: 'c1', author_name: 'Sam' } });
    expect(n.text).toBe('Sam commented on Ruby Tempo.');
    expect(n.href).toBe('/decks/d1#comment-c1');
  });
});
