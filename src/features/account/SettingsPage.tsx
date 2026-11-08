import { FormEvent, ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ImagePlus, LogOut, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useToast } from '../../contexts/ToastContext';
import { useCardData } from '../../contexts/CardDataContext';
import { ThemeSwitch, useSignIn } from '../../app/AccountMenu';
import { keys } from '../../app/queryClient';
import * as api from '../../lib/api';
import { CardAvatar } from '../../ui/CardAvatar';
import { PageLoading, PageMessage } from '../../ui/PageState';
import type { UserProfile } from '../../types';
import { AvatarEditor } from './AvatarEditor';
import { CardPickerDialog } from './CardPickerDialog';
import { Crop, DEFAULT_CROP, normaliseCrop } from './crop';

interface Form {
  displayName: string;
  fullName: string;
  location: string;
  bio: string;
  isPublic: boolean;
  avatarCardId: number | null;
  crop: Crop;
}

const fromProfile = (p: UserProfile): Form => ({
  displayName: p.displayName,
  fullName: p.fullName ?? '',
  location: p.location ?? '',
  bio: p.bio ?? '',
  isPublic: p.isPublic,
  avatarCardId: p.avatarCardId ?? null,
  crop: normaliseCrop(p.avatarCropData),
});

const same = (a: Form, b: Form) =>
  a.displayName.trim() === b.displayName.trim() && a.fullName.trim() === b.fullName.trim() &&
  a.location.trim() === b.location.trim() && a.bio.trim() === b.bio.trim() && a.isPublic === b.isPublic &&
  a.avatarCardId === b.avatarCardId &&
  (a.avatarCardId === null || (a.crop.x === b.crop.x && a.crop.y === b.crop.y && a.crop.scale === b.crop.scale));

function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="panel p-5 sm:p-6">
      <h2 id={id} className="font-display text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, count }: { label: string; hint?: string; children: (id: string) => ReactNode; count?: [number, number] }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {count && <span className={`text-xs tabular-nums ${count[0] > count[1] ? 'text-danger' : 'text-muted'}`}>{count[0]}/{count[1]}</span>}
      </div>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { userProfile } = useProfile();
  const { openSignIn, signInDialog } = useSignIn();

  if (loading) return <PageLoading />;
  if (!user) {
    return (
      <PageMessage title="Sign in to see your settings" action={<button type="button" className="btn-primary" onClick={openSignIn}>Sign in</button>}>
        Your profile, picture and password are managed here.
        {signInDialog}
      </PageMessage>
    );
  }
  if (!userProfile) return <PageLoading />;
  return <Settings key={user.id} profile={userProfile} email={user.email ?? ''} />;
}

function Settings({ profile, email }: { profile: UserProfile; email: string }) {
  const { refreshUserProfile } = useProfile();
  const { getCard, isLoading: cardsLoading } = useCardData();
  const queryClient = useQueryClient();
  const toast = useToast();
  const saved = useMemo(() => fromProfile(profile), [profile]);
  const [form, setForm] = useState<Form>(saved);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = !same(form, saved);
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const card = form.avatarCardId !== null ? getCard(form.avatarCardId) : undefined;
  const nameError = !form.displayName.trim() ? 'Enter a display name.' : form.displayName.trim().length > 50 ? 'Keep it to 50 characters.' : null;
  const tooLong = form.fullName.length > 100 || form.location.length > 100 || form.bio.length > 1000;

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (nameError || tooLong) {
      setError(nameError ?? 'Some fields are too long.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateProfile(profile.userId, {
        displayName: form.displayName.trim(),
        fullName: form.fullName.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        isPublic: form.isPublic,
        avatarCardId: form.avatarCardId,
        avatarCropData: form.avatarCardId === null ? null : form.crop,
      });
      const fresh = await refreshUserProfile();
      if (fresh) setForm(fromProfile(fresh));
      queryClient.invalidateQueries({ queryKey: keys.profile(profile.userId) });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Your profile is saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(`Couldn't save: ${message}`);
      toast.error("Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <Link to={`/u/${profile.userId}`} className="btn-ghost btn-sm h-9 text-accent">
          View your profile <ExternalLink size={14} />
        </Link>
      </div>

      <form onSubmit={save} className="mt-6 space-y-5" noValidate>
        <Section id="picture" title="Profile picture" description="Pick any card and frame its art. It's shown next to your name everywhere.">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {card ? (
              <AvatarEditor cardId={card.id} cardName={card.fullName} crop={form.crop} onChange={crop => set({ crop })} />
            ) : (
              <button type="button" onClick={() => setPicking(true)}
                className="h-56 w-56 sm:h-60 sm:w-60 rounded-full border-2 border-dashed border-line text-muted hover:text-fg hover:border-accent-fill flex flex-col items-center justify-center gap-2 transition-colors">
                <ImagePlus size={28} />
                <span className="text-sm font-medium">{cardsLoading && form.avatarCardId !== null ? 'Loading…' : 'Choose a card'}</span>
              </button>
            )}
            <div className="flex-1 w-full space-y-5">
              <div>
                <p className="label">Preview</p>
                <div className="mt-2 flex items-end gap-4">
                  <CardAvatar cardId={card?.id} crop={form.crop} fallback={form.displayName || '?'} className="h-24 w-24 text-3xl" hiRes />
                  <CardAvatar cardId={card?.id} crop={form.crop} fallback={form.displayName || '?'} className="h-12 w-12 text-lg" />
                  <CardAvatar cardId={card?.id} crop={form.crop} fallback={form.displayName || '?'} className="h-9 w-9" />
                </div>
                {card && <p className="mt-2 text-sm text-muted truncate">{card.fullName}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => setPicking(true)}>
                  <ImagePlus size={16} /> {card ? 'Choose another card' : 'Choose a card'}
                </button>
                {card && (
                  <>
                    <button type="button" className="btn-ghost" onClick={() => set({ crop: { ...DEFAULT_CROP } })}>
                      <RotateCcw size={16} /> Reset framing
                    </button>
                    <button type="button" className="btn-ghost text-danger" onClick={() => set({ avatarCardId: null })}>
                      <Trash2 size={16} /> Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section id="profile" title="Profile" description="What other players see on your profile.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" count={[form.displayName.length, 50]}>
              {id => <>
                <input id={id} className={`input ${nameError ? 'border-danger' : ''}`} value={form.displayName} maxLength={60} autoComplete="nickname"
                  aria-invalid={!!nameError} aria-describedby={nameError ? `${id}-err` : undefined}
                  onChange={e => set({ displayName: e.target.value })} />
                {nameError && <p id={`${id}-err`} className="text-xs text-danger">{nameError}</p>}
              </>}
            </Field>
            <Field label="Full name" hint="Optional.">
              {id => <input id={id} className="input" value={form.fullName} maxLength={100} autoComplete="name" onChange={e => set({ fullName: e.target.value })} />}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Location" hint="Optional. A city or region helps local players find you.">
                {id => <input id={id} className="input" value={form.location} maxLength={100} placeholder="Brisbane, Australia" onChange={e => set({ location: e.target.value })} />}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Bio" count={[form.bio.length, 1000]}>
                {id => <textarea id={id} className="input h-auto min-h-[7rem] py-2 leading-relaxed resize-y" value={form.bio} maxLength={1000}
                  placeholder="Favourite inks, what you're collecting, where you play…" onChange={e => set({ bio: e.target.value })} />}
              </Field>
            </div>
          </div>
        </Section>

        <Section id="privacy" title="Privacy">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p id="public-label" className="font-medium">Public profile</p>
              <p className="mt-1 text-sm text-muted">
                {form.isPublic
                  ? 'Anyone can find you on the Players page and open your profile, with your bio, location, public decks and public binders.'
                  : "Your profile is hidden: you're not listed on the Players page and only people you share a collection with can open it."}
              </p>
              <p className="mt-2 text-sm text-muted">
                Either way, decks and binders you've made public stay visible to anyone with their link. Make them private one by one to hide them.
              </p>
            </div>
            <button type="button" role="switch" aria-checked={form.isPublic} aria-labelledby="public-label"
              onClick={() => set({ isPublic: !form.isPublic })}
              className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${form.isPublic ? 'bg-accent-fill' : 'bg-surface-3'}`}>
              <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-card transition-transform ${form.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </Section>

        {(dirty || error) && (
          <div className="sticky bottom-20 sm:bottom-4 z-30 panel shadow-pop px-4 py-3 flex flex-wrap items-center gap-3" role="region" aria-label="Unsaved changes">
            <p className={`flex-1 min-w-[10rem] text-sm ${error ? 'text-danger' : 'text-muted'}`} role={error ? 'alert' : undefined}>
              {error ?? 'You have unsaved changes.'}
            </p>
            <button type="button" className="btn-ghost" disabled={saving} onClick={() => { setForm(saved); setError(null); }}>Discard</button>
            <button type="submit" className="btn-primary" disabled={saving || !!nameError}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        )}
      </form>

      <div className="mt-5 space-y-5">
        <Section id="appearance" title="Appearance" description="Follow your device, or always use light or dark. Remembered on this device.">
          <div className="max-w-xs"><ThemeSwitch /></div>
        </Section>
        <AccountSection email={email} />
      </div>

      <CardPickerDialog open={picking} onClose={() => setPicking(false)}
        onPick={c => set({ avatarCardId: c.id, crop: c.id === form.avatarCardId ? form.crop : { ...DEFAULT_CROP } })} />
    </div>
  );
}

function AccountSection({ email }: { email: string }) {
  const { updatePassword, signOut } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (password.length < 6) return setError('Use at least 6 characters.');
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      setError(error.message);
      toast.error("Couldn't change your password.");
    } else {
      setPassword('');
      setConfirm('');
      setDone(true);
      toast.success('Your password is changed.');
    }
  };

  return (
    <Section id="account" title="Account">
      <dl className="text-sm">
        <dt className="label">Email</dt>
        <dd className="mt-1 font-medium break-all">{email || 'No email address'}</dd>
      </dl>

      <form onSubmit={change} className="mt-6 pt-5 border-t border-line" noValidate>
        <h3 className="font-medium">Change password</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            {id => <input id={id} className="input" type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setDone(false); }} />}
          </Field>
          <Field label="Repeat new password">
            {id => <input id={id} className="input" type="password" autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); setDone(false); }} />}
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-secondary" disabled={busy || !password}>{busy ? 'Changing…' : 'Change password'}</button>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {done && <p role="status" className="text-sm text-success">Password changed.</p>}
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Signed in as {email}.</p>
        <button type="button" className="btn-secondary" onClick={() => signOut()}><LogOut size={16} /> Sign out</button>
      </div>
    </Section>
  );
}
