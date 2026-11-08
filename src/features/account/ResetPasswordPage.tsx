import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, Link2Off } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../lib/api';
import { Spinner } from '../../ui/PageState';
import { hasAuthParams, linkError } from './authLinks';
import { LinkCard } from './LinkCard';

type State =
  | { step: 'checking' }
  | { step: 'ready' }
  | { step: 'invalid'; title: string; reason: string }
  | { step: 'done' };

const BAD_LINK = "This reset link can't be used";

function NewLinkForm({ initialEmail = '' }: { initialEmail?: string }) {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };
  if (sent) return <p role="status" className="mt-5 text-sm text-success">If an account uses that address, a new link is on its way. Open it in this browser.</p>;
  return (
    <form onSubmit={send} className="mt-5 space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input className="input" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn-primary w-full h-11" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Email me a new link'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { updatePassword, user } = useAuth();
  const [state, setState] = useState<State>({ step: 'checking' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The address is read once: the client removes the code from it after using it.
  const initial = useRef({ search: window.location.search, hash: window.location.hash });

  useEffect(() => {
    let live = true;
    const { search, hash } = initial.current;
    const fromUrl = linkError(search, hash);
    api.finishEmailLink().then(({ signedIn, error }) => {
      if (!live) return;
      if (fromUrl) setState({ step: 'invalid', title: BAD_LINK, reason: fromUrl });
      else if (signedIn) setState({ step: 'ready' });
      else if (hasAuthParams(search, hash)) {
        // Without the browser's PKCE verifier the client ignores the code, so there may be no error.
        setState({ step: 'invalid', title: BAD_LINK, reason: error && !/verifier|flow state/i.test(error)
          ? 'This link has expired or has already been used.'
          : 'This link has expired, has already been used, or was opened in a different browser from the one you asked from.' });
      } else setState({ step: 'invalid', title: 'Reset your password', reason: "We'll email you a link to choose a new password." });
    });
    return () => { live = false; };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError('Use at least 6 characters.');
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) setError(/different from the old/i.test(error.message) ? 'Choose a password different from your old one.' : error.message);
    else setState({ step: 'done' });
  };

  if (state.step === 'checking') {
    return <div className="flex flex-col items-center gap-3 py-32 text-muted"><Spinner label="Checking your link" /><p className="text-sm">Checking your link…</p></div>;
  }

  if (state.step === 'invalid') {
    return (
      <LinkCard icon={state.title === BAD_LINK ? <Link2Off size={22} /> : <KeyRound size={22} />} title={state.title}>
        <p className="text-muted">{state.reason}{state.title === BAD_LINK && ' Ask for a new one below. Each link works once, for a limited time.'}</p>
        <NewLinkForm initialEmail={user?.email ?? ''} />
      </LinkCard>
    );
  }

  if (state.step === 'done') {
    return (
      <LinkCard icon={<CheckCircle2 size={22} />} title="Password changed">
        <p className="text-muted">You're signed in with your new password.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/collection" className="btn-primary">Go to your collection</Link>
          <Link to="/cards" className="btn-secondary">Browse cards</Link>
        </div>
      </LinkCard>
    );
  }

  return (
    <LinkCard icon={<KeyRound size={22} />} title="Choose a new password">
      <p className="text-muted">{user?.email ? <>For <span className="text-fg font-medium break-all">{user.email}</span>.</> : 'Enter it twice to be sure.'}</p>
      <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">New password</span>
          <input className="input" type="password" autoComplete="new-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Repeat new password</span>
          <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </label>
        <p className="text-xs text-muted">At least 6 characters.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary w-full h-11" disabled={busy || !password}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </LinkCard>
  );
}
