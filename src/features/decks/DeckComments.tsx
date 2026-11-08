import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Deck, LorcanaCard } from '../../types';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useToast } from '../../contexts/ToastContext';
import { useSignIn } from '../../app/AccountMenu';
import { CardAvatar } from '../../ui/CardAvatar';
import { Markdown } from '../../ui/Markdown';
import { Menu, MenuItem } from '../../ui/Menu';
import { Spinner } from '../../ui/PageState';
import { relativeDate } from './deckLogic';

const MAX = 4000;

function Composer({ initial = '', submitLabel, busy, onSubmit, onCancel, autoFocus }: {
  initial?: string; submitLabel: string; busy: boolean; onSubmit: (body: string) => void; onCancel?: () => void; autoFocus?: boolean;
}) {
  const [body, setBody] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (body.trim()) onSubmit(body);
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea aria-label="Write a comment" value={body} maxLength={MAX} rows={3} autoFocus={autoFocus}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
        placeholder="Say something about this deck. [[Card Name]] links a card."
        className="input h-auto py-2.5 resize-y min-h-[84px] leading-relaxed" />
      <div className="flex items-center gap-2 justify-end">
        <span className="mr-auto text-xs text-muted hidden sm:inline">Markdown works · Ctrl+Enter to post</span>
        {onCancel && <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary btn-sm ml-auto whitespace-nowrap" disabled={busy || !body.trim()}>{busy ? 'Posting…' : submitLabel}</button>
      </div>
    </form>
  );
}

/** Comments under a deck: anyone can read a public deck's, signed-in players can post. */
export function DeckComments({ deck, cardHref }: { deck: Deck; cardHref: (card: LorcanaCard) => string }) {
  const { user } = useAuth();
  const { userProfile } = useProfile();
  const { openSignIn, signInDialog } = useSignIn();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  const key = keys.deckComments(deck.id);
  const comments = useQuery({ queryKey: key, queryFn: () => api.getDeckComments(deck.id) });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = (what: string) => (e: Error) => toast.error(`Couldn't ${what}: ${e.message}`);

  const add = useMutation({
    mutationFn: (body: string) => api.addDeckComment(deck.id, user!.id, body),
    onSuccess: () => { setComposerKey(k => k + 1); refresh(); },
    onError: fail('post your comment'),
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.editDeckComment(id, body),
    onSuccess: () => { setEditing(null); refresh(); },
    onError: fail('save your comment'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteDeckComment(id),
    onSuccess: refresh,
    onError: fail('delete the comment'),
  });

  // Notification links point at #comment-<id>: scroll there once loaded.
  useEffect(() => {
    if (!comments.data || !window.location.hash.startsWith('#comment')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [comments.data]);

  const list = comments.data ?? [];
  const canPost = deck.isPublic || deck.userId === user?.id;
  if (!canPost && !list.length) return null;

  return (
    <section id="comments" aria-labelledby="deck-comments" className="mt-10 max-w-3xl scroll-mt-20">
      <h2 id="deck-comments" className="font-display text-2xl font-semibold mb-4 flex items-center gap-2.5">
        Comments {list.length > 0 && <span className="text-base font-sans font-normal text-muted">{list.length}</span>}
      </h2>

      {comments.isLoading ? <div className="py-6"><Spinner /></div> : comments.error ? (
        <p className="text-sm text-muted">Couldn't load comments. <button type="button" className="text-accent hover:underline" onClick={() => comments.refetch()}>Try again</button></p>
      ) : (
        <ol className="space-y-5">
          {list.map(c => {
            const name = c.author?.displayName ?? 'A player';
            const mine = c.authorId === user?.id;
            const canDelete = mine || deck.userId === user?.id;
            return (
              <li key={c.id} id={`comment-${c.id}`} className="flex gap-3 scroll-mt-24">
                <Link to={`/u/${c.authorId}`} className="shrink-0" aria-label={`${name}'s profile`}>
                  <CardAvatar cardId={c.author?.avatarCardId} crop={c.author?.avatarCrop} fallback={name} className="h-9 w-9" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link to={`/u/${c.authorId}`} className="font-semibold text-sm hover:text-accent">{name}</Link>
                    {c.authorId === deck.userId && <span className="text-[11px] font-medium uppercase tracking-wide text-accent">Deck author</span>}
                    <time className="text-xs text-muted" dateTime={c.createdAt.toISOString()} title={c.createdAt.toLocaleString()}>
                      {relativeDate(c.createdAt)}{c.editedAt && ' · edited'}
                    </time>
                    {canDelete && editing !== c.id && (
                      <div className="ml-auto -my-1">
                        <Menu label="Comment actions" triggerClassName="icon-btn h-8 w-8" trigger={<MoreHorizontal size={16} />}>
                          {close => (
                            <>
                              {mine && <MenuItem onClick={() => { close(); setEditing(c.id); }}><Pencil size={15} /> Edit</MenuItem>}
                              <MenuItem danger onClick={() => { close(); if (window.confirm('Delete this comment?')) remove.mutate(c.id); }}>
                                <Trash2 size={15} /> Delete
                              </MenuItem>
                            </>
                          )}
                        </Menu>
                      </div>
                    )}
                  </div>
                  {editing === c.id ? (
                    <div className="mt-2">
                      <Composer initial={c.body} submitLabel="Save" busy={edit.isPending} autoFocus
                        onSubmit={body => edit.mutate({ id: c.id, body })} onCancel={() => setEditing(null)} />
                    </div>
                  ) : (
                    <div className="mt-0.5 [&_p]:my-1.5"><Markdown cardHref={cardHref}>{c.body}</Markdown></div>
                  )}
                </div>
              </li>
            );
          })}
          {!list.length && (
            <li className="text-sm text-muted flex items-center gap-2"><MessageSquare size={16} /> No comments yet.</li>
          )}
        </ol>
      )}

      {canPost && (
        <div className="mt-6 flex gap-3">
          {user ? (
            <>
              <CardAvatar cardId={userProfile?.avatarCardId} crop={userProfile?.avatarCropData}
                fallback={userProfile?.displayName ?? '?'} className="h-9 w-9 shrink-0" />
              <div className="flex-1 min-w-0">
                <Composer key={composerKey} submitLabel="Post comment" busy={add.isPending} onSubmit={body => add.mutate(body)} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">
              <button type="button" className="text-accent hover:underline" onClick={openSignIn}>Sign in</button> to comment.
            </p>
          )}
        </div>
      )}
      {signInDialog}
    </section>
  );
}
