import { FormEvent, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '../ui/Dialog';

type Mode = 'signin' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = { signin: 'Sign in', signup: 'Create an account', reset: 'Reset your password' };

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, signUpWithEmail, resetPasswordForEmail, signInWithGoogle } = useAuth();
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
      {mode !== 'reset' && (
        <>
          <button type="button" className="btn-secondary w-full h-11" disabled={busy}
            onClick={async () => {
              setError(null);
              const { error } = await signInWithGoogle();
              if (error) setError(error.message);
            }}>
            <svg aria-hidden width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 my-4 text-xs text-muted"><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>
        </>
      )}
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
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-medium">
              <label htmlFor="auth-password">Password</label>
              {mode === 'signin' && <button type="button" className="text-accent font-normal hover:underline" onClick={() => switchTo('reset')}>Forgot it?</button>}
            </div>
            <input id="auth-password" className="input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </div>
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
