import { FormEvent, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '../ui/Dialog';

type Mode = 'signin' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = { signin: 'Sign in', signup: 'Create an account', reset: 'Reset your password' };

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, signUpWithEmail, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const close = () => {
    switchTo('signin');
    setPassword('');
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'reset') {
        const { error } = await resetPasswordForEmail(email);
        if (error) setError(error.message);
        else setNotice('If an account uses that address, a reset link is on its way.');
      } else if (mode === 'signup') {
        const { error, needsConfirmation } = await signUpWithEmail(email, password, name.trim() || undefined);
        if (error) setError(error.message);
        else if (needsConfirmation) setNotice('Check your email to confirm your account, then sign in.');
        else close();
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(error.message === 'Invalid login credentials' ? 'That email and password don\'t match.' : error.message);
        else close();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title={TITLES[mode]}
      description={mode === 'signup' ? 'Track your collection, build decks and share them.' : undefined}>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Display name</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" maxLength={50} placeholder="How others see you" />
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {mode !== 'reset' && (
          <label className="block space-y-1.5">
            <span className="flex justify-between text-sm font-medium">
              Password
              {mode === 'signin' && <button type="button" className="text-accent font-normal hover:underline" onClick={() => switchTo('reset')}>Forgot it?</button>}
            </span>
            <input className="input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </label>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        <button type="submit" className="btn-primary w-full h-11" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted text-center">
        {mode === 'signin' ? <>New here? <button type="button" className="text-accent hover:underline" onClick={() => switchTo('signup')}>Create an account</button></>
          : <>Have an account? <button type="button" className="text-accent hover:underline" onClick={() => switchTo('signin')}>Sign in</button></>}
      </p>
    </Dialog>
  );
}
