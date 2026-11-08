import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2Off } from 'lucide-react';
import { useSignIn } from '../../app/AccountMenu';
import * as api from '../../lib/api';
import { Spinner } from '../../ui/PageState';
import { LinkCard } from './ResetPasswordPage';
import { linkError, takeReturnPath } from './authLinks';

/** Finishes a sign-in from an email or OAuth link, then goes back to where you were. */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { openSignIn, signInDialog } = useSignIn();
  const [problem, setProblem] = useState<string | null>(null);
  const initial = useRef({ search: window.location.search, hash: window.location.hash });
  const started = useRef(false);

  useEffect(() => {
    // Once only: the return path is taken from storage as it's read.
    if (started.current) return;
    started.current = true;
    const { search, hash } = initial.current;
    const fromUrl = linkError(search, hash);
    api.finishEmailLink().then(({ signedIn }) => {
      if (signedIn && !fromUrl) navigate(takeReturnPath(search), { replace: true });
      else setProblem(fromUrl ?? "We couldn't sign you in from this link.");
    });
  }, [navigate]);

  if (!problem) {
    return <div className="flex flex-col items-center gap-3 py-32 text-muted"><Spinner label="Signing you in" /><p className="text-sm">Signing you in…</p></div>;
  }
  return (
    <LinkCard icon={<Link2Off size={22} />} title="Sign-in link didn't work">
      <p className="text-muted">{problem} Sign in with your email and password, or ask for a new link.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={openSignIn}>Sign in</button>
        <Link to="/cards" className="btn-secondary">Browse cards</Link>
      </div>
      {signInDialog}
    </LinkCard>
  );
}
