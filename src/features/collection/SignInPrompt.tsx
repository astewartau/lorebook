import { Link } from 'react-router-dom';
import { useSignIn } from '../../app/AccountMenu';
import { PageMessage } from '../../ui/PageState';

export function SignInPrompt({ title = 'Sign in to see your collection', children }: { title?: string; children?: React.ReactNode }) {
  const { openSignIn, signInDialog } = useSignIn();
  return (
    <>
      <PageMessage title={title} action={<>
        <button type="button" className="btn-primary" onClick={openSignIn}>Sign in</button>
        <Link to="/cards" className="btn-secondary">Browse cards</Link>
      </>}>
        {children ?? 'Your collection is saved to your account, so it follows you to every device.'}
      </PageMessage>
      {signInDialog}
    </>
  );
}
