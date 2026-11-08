import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Copy, Crown, LogOut, Mail, RefreshCw, Search, UserPlus, X } from 'lucide-react';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Dialog } from '../../ui/Dialog';
import { PageLoading } from '../../ui/PageState';
import { copyText, errorMessage } from './parts';
import { useCollectionInfo } from './queries';
import { SignInPrompt } from './SignInPrompt';

function Section({ title, description, children, id }: { title: string; description?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="panel p-5">
      <h2 id={id} className="font-display text-xl font-semibold">{title}</h2>
      {description && <div className="text-sm text-muted mt-1">{description}</div>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="h-9 w-9 rounded-full bg-surface-3 inline-flex items-center justify-center text-sm font-semibold uppercase shrink-0" aria-hidden>
      {name.slice(0, 1)}
    </span>
  );
}

function MergeChoice({ merge, onChange, name }: { merge: boolean; onChange: (m: boolean) => void; name: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium mb-2">Your own cards</legend>
      {[
        [true, 'Add my cards to it', 'Your cards are added to the shared collection. Your own collection stays as it is.'],
        [false, 'Keep my cards separate', 'You start using the shared collection as it is. Your own collection waits for you if you leave.'],
      ].map(([value, label, hint]) => (
        <label key={String(value)} className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${merge === value ? 'border-accent-fill bg-accent-fill/10' : 'border-line hover:bg-surface-2'}`}>
          <input type="radio" name={name} className="mt-1 accent-[rgb(var(--accent-fill))]" checked={merge === value} onChange={() => onChange(value as boolean)} />
          <span><span className="block text-sm font-medium">{label as string}</span><span className="block text-xs text-muted mt-0.5">{hint as string}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

export default function HouseholdPage() {
  const { user, loading } = useAuth();
  const { userProfile, refreshUserProfile } = useProfile();
  const { collectionId } = useCollection();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: info, isLoading } = useCollectionInfo(collectionId);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [merge, setMerge] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<null | { kind: 'leave' } | { kind: 'remove'; userId: string; name: string } | { kind: 'off' } | { kind: 'rotate' }>(null);
  const [accepting, setAccepting] = useState<api.ReceivedInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const term = useDebounce(search.trim(), 250);

  useEffect(() => {
    if (info) setName(info.name);
  }, [info]);

  const isOwner = !!info && info.ownerId === user?.id;
  const members = info?.members ?? [];
  const ownerName = members.find(m => m.userId === info?.ownerId)?.displayName ?? 'someone';
  const shared = members.length > 1 || !!info?.inviteCode;

  const pending = useQuery({
    queryKey: keys.invites({ collectionId }),
    queryFn: () => api.getPendingInvites({ collectionId: collectionId! }),
    enabled: !!collectionId && shared,
  });
  const mine = useQuery({
    queryKey: keys.myInvites(user?.id ?? ''),
    queryFn: () => api.getMyInvites(user!.id),
    enabled: !!user,
  });
  const people = useQuery({
    queryKey: keys.profiles(term),
    queryFn: () => api.searchProfiles(term, 8),
    enabled: term.length >= 2,
  });

  const refreshInfo = () => qc.invalidateQueries({ queryKey: ['collection'] });
  const switched = async (message: string) => {
    await refreshUserProfile();
    await Promise.all([qc.invalidateQueries({ queryKey: ['collection'] }), qc.invalidateQueries({ queryKey: ['invites'] }), qc.invalidateQueries({ queryKey: ['binders'] })]);
    toast.success(message);
  };
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onError: e => toast.error(errorMessage(e)),
  });

  if (loading) return <PageLoading />;
  if (!user) return <SignInPrompt title="Sign in to share a collection" />;
  if (isLoading || !info) return <PageLoading />;

  const turnOn = () => run.mutate(async () => {
    if (name.trim() && name.trim() !== info.name) await api.renameCollection(info.id, name.trim());
    await api.rotateInviteCode(info.id);
    await refreshInfo();
    toast.success('Sharing is on. Send the code to the people you want to join.');
  });
  const copyCode = async () => {
    if (!info.inviteCode) return;
    if (await copyText(info.inviteCode)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    run.mutate(async () => {
      await api.joinCollection(code.trim(), merge);
      setCode('');
      await switched('You joined the collection. It’s the one you’re using now.');
    });
  };
  const memberIds = new Set(members.map(m => m.userId));
  const pendingIds = new Set((pending.data ?? []).map(p => p.inviteeId));
  const busy = run.isPending;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12">
      <div className="pt-4">
        <Link to="/collection" className="inline-flex items-center gap-1 h-9 -ml-1 pr-2 text-sm text-muted hover:text-fg">
          <ChevronLeft size={18} />Collection
        </Link>
      </div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Household</h1>
      <p className="mt-2 text-muted">
        A household shares one collection. Everyone in it sees the same cards and can add or remove them, and deck building checks against
        what you own together. Each person keeps their own decks and binders.
      </p>

      <div className="mt-6 space-y-5">
        {(mine.data?.length ?? 0) > 0 && (
          <Section id="h-invites" title="Invitations for you">
            <ul className="space-y-2">
              {mine.data!.map(inv => (
                <li key={inv.id} className="flex items-center gap-3 flex-wrap">
                  <Mail size={18} className="text-accent shrink-0" />
                  <span className="flex-1 min-w-0 text-sm"><strong>{inv.inviterName}</strong> invited you to <strong>{inv.collectionName}</strong></span>
                  <button type="button" className="btn-primary btn-sm h-9" disabled={busy} onClick={() => setAccepting(inv)}>Join</button>
                  <button type="button" className="btn-ghost btn-sm h-9" disabled={busy}
                    onClick={() => run.mutate(async () => { await api.respondToInvite(inv.id, false, false); await qc.invalidateQueries({ queryKey: ['invites'] }); })}>Decline</button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {isOwner ? (
          <Section id="h-sharing" title={info.inviteCode ? 'Sharing is on' : 'Share your collection'}
            description={info.inviteCode
              ? 'Anyone with this code can join your collection. Members stay until they leave or you remove them.'
              : 'Turn sharing on to get an invite code for family or friends. You can turn it off at any time.'}>
            {info.inviteCode ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-2xl sm:text-3xl tracking-[0.2em] font-semibold px-4 py-2 rounded-lg bg-surface-2 select-all" aria-label={`Invite code ${info.inviteCode.split('').join(' ')}`}>
                    {info.inviteCode}
                  </span>
                  <button type="button" className="btn-secondary" onClick={copyCode}>
                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
                <form className="flex gap-2 items-end flex-wrap" onSubmit={e => {
                  e.preventDefault();
                  run.mutate(async () => { await api.renameCollection(info.id, name.trim()); await refreshInfo(); toast.success('Renamed.'); });
                }}>
                  <label className="flex-1 min-w-[12rem] space-y-1.5">
                    <span className="text-sm font-medium">Collection name</span>
                    <input className="input" maxLength={60} value={name} onChange={e => setName(e.target.value)} />
                  </label>
                  <button type="submit" className="btn-secondary" disabled={busy || !name.trim() || name.trim() === info.name}>Rename</button>
                </form>
                <div className="flex gap-2 flex-wrap pt-1">
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirm({ kind: 'rotate' })}><RefreshCw size={16} />New code</button>
                  <button type="button" className="btn-ghost text-danger" disabled={busy} onClick={() => setConfirm({ kind: 'off' })}>Turn off sharing</button>
                </div>
              </div>
            ) : (
              <form className="flex gap-2 items-end flex-wrap" onSubmit={e => { e.preventDefault(); turnOn(); }}>
                <label className="flex-1 min-w-[12rem] space-y-1.5">
                  <span className="text-sm font-medium">Name it</span>
                  <input className="input" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={`${userProfile?.displayName ?? 'Our'} household`} />
                </label>
                <button type="submit" className="btn-primary" disabled={busy}>Turn on sharing</button>
              </form>
            )}
          </Section>
        ) : (
          <Section id="h-member" title={info.name} description={<>You’re using <strong className="text-fg">{ownerName}</strong>’s collection. Changes you make are shared with everyone in it.</>}>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirm({ kind: 'leave' })}><LogOut size={16} />Leave and go back to my collection</button>
          </Section>
        )}

        {shared && (
          <Section id="h-members" title="Members" description={`${members.length} ${members.length === 1 ? 'person' : 'people'} share this collection.`}>
            <ul className="divide-y divide-line">
              {members.map(m => (
                <li key={m.userId} className="flex items-center gap-3 py-2.5">
                  <Initial name={m.displayName} />
                  <span className="flex-1 min-w-0">
                    <Link to={`/u/${m.userId}`} className="font-medium hover:text-accent truncate block">{m.displayName}{m.userId === user.id && ' (you)'}</Link>
                    <span className="text-xs text-muted">Joined {m.joinedAt.toLocaleDateString()}</span>
                  </span>
                  {m.role === 'owner' && <span className="chip h-7 text-xs"><Crown size={12} className="text-accent" />Owner</span>}
                  {isOwner && m.role !== 'owner' && (
                    <button type="button" className="btn-ghost btn-sm h-9 text-danger" disabled={busy}
                      onClick={() => setConfirm({ kind: 'remove', userId: m.userId, name: m.displayName })}>Remove</button>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {shared && (
          <Section id="h-invite" title="Invite a player" description="Find someone by their Lorebook name. They’ll get an invitation to accept.">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input type="search" className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players" aria-label="Search players" />
            </div>
            {term.length >= 2 && (
              <ul className="mt-2" aria-live="polite">
                {people.isLoading && <li className="text-sm text-muted py-2">Searching…</li>}
                {people.data?.length === 0 && <li className="text-sm text-muted py-2">No players found. Only players with public profiles show up here; others can join with the code.</li>}
                {people.data?.map(p => {
                  const member = memberIds.has(p.userId);
                  const invited = pendingIds.has(p.userId);
                  return (
                    <li key={p.userId} className="flex items-center gap-3 py-2">
                      <Initial name={p.displayName} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{p.displayName}</span>
                        {p.location && <span className="block text-xs text-muted truncate">{p.location}</span>}
                      </span>
                      {member ? <span className="text-sm text-muted">Member</span> : invited ? <span className="text-sm text-muted">Invited</span> : (
                        <button type="button" className="btn-secondary btn-sm h-9" disabled={busy}
                          onClick={() => run.mutate(async () => {
                            await api.inviteToCollection(info.id, p.userId);
                            await qc.invalidateQueries({ queryKey: ['invites'] });
                            toast.success(`Invited ${p.displayName}.`);
                          })}><UserPlus size={16} />Invite</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {(pending.data?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="label mb-1">Waiting for an answer</h3>
                <ul className="divide-y divide-line">
                  {pending.data!.map(p => (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <Initial name={p.inviteeName ?? '?'} />
                      <span className="flex-1 min-w-0 text-sm"><span className="font-medium">{p.inviteeName ?? 'A player'}</span><span className="text-muted"> · {p.createdAt.toLocaleDateString()}</span></span>
                      <button type="button" className="btn-ghost btn-sm h-9" disabled={busy}
                        onClick={() => run.mutate(async () => { await api.cancelInvite(p.id); await qc.invalidateQueries({ queryKey: ['invites'] }); })}>
                        <X size={14} />Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        <Section id="h-join" title="Join someone’s collection"
          description={isOwner && members.length > 1
            ? 'You’ll switch to their collection. Yours stays as it is, and its members keep using it.'
            : 'Got an invite code? Enter it to start using their collection.'}>
          <form onSubmit={join} className="space-y-4">
            <label className="block space-y-1.5 max-w-xs">
              <span className="text-sm font-medium">Invite code</span>
              <input className="input font-mono uppercase tracking-[0.2em] text-base" value={code} maxLength={12} autoComplete="off" spellCheck={false}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="ABCD2345" />
            </label>
            <MergeChoice merge={merge} onChange={setMerge} name="merge-code" />
            <button type="submit" className="btn-primary" disabled={busy || code.trim().length < 6}>Join collection</button>
          </form>
        </Section>
      </div>

      <Dialog open={!!accepting} onClose={() => setAccepting(null)} title={`Join ${accepting?.collectionName ?? ''}?`}
        description={`${accepting?.inviterName ?? 'Someone'} invited you. You’ll switch to their collection.`}
        footer={<>
          <button type="button" className="btn-ghost" onClick={() => setAccepting(null)}>Cancel</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => {
            const inv = accepting!;
            run.mutate(async () => {
              await api.respondToInvite(inv.id, true, merge);
              setAccepting(null);
              await switched(`You joined ${inv.collectionName}.`);
            });
          }}>Join</button>
        </>}>
        <MergeChoice merge={merge} onChange={setMerge} name="merge-invite" />
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.kind === 'leave' ? 'Leave this collection?' : confirm?.kind === 'remove' ? `Remove ${confirm.name}?` : confirm?.kind === 'off' ? 'Turn off sharing?' : 'Make a new code?'}
        description={confirm?.kind === 'leave' ? 'You’ll go back to your own collection. Cards you added here stay in this one.'
          : confirm?.kind === 'remove' ? 'They’ll go back to their own collection. Cards they added stay in yours.'
            : confirm?.kind === 'off' ? 'The code stops working, so nobody new can join. Current members stay.'
              : 'The current code stops working. Anyone who hasn’t joined yet will need the new one.'}
        footer={<>
          <button type="button" className="btn-ghost" data-autofocus onClick={() => setConfirm(null)}>Cancel</button>
          <button type="button" className={confirm?.kind === 'rotate' ? 'btn-primary' : 'btn-danger'} disabled={busy} onClick={() => {
            const c = confirm!;
            setConfirm(null);
            run.mutate(async () => {
              if (c.kind === 'leave') {
                await api.leaveCollection(info.id);
                await switched('You’re back on your own collection.');
              } else if (c.kind === 'remove') {
                await api.removeCollectionMember(info.id, c.userId);
                await refreshInfo();
                toast.success(`${c.name} was removed.`);
              } else if (c.kind === 'off') {
                await api.disableInviteCode(info.id);
                await refreshInfo();
              } else {
                await api.rotateInviteCode(info.id);
                await refreshInfo();
              }
            });
          }}>
            {confirm?.kind === 'leave' ? 'Leave' : confirm?.kind === 'remove' ? 'Remove' : confirm?.kind === 'off' ? 'Turn off' : 'New code'}
          </button>
        </>}>
        <span />
      </Dialog>
    </div>
  );
}
