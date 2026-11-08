import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Layers, LibraryBig, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../ui/Logo';
import { AccountMenu, useSignIn } from './AccountMenu';
import { NotificationsBell } from '../features/account/NotificationsBell';
import { Toasts } from '../ui/Toasts';
import { SiteFooter } from './SiteFooter';
import { PageLoading } from '../ui/PageState';

const SECTIONS = [
  { to: '/cards', label: 'Cards', icon: Layers },
  { to: '/collection', label: 'Collection', icon: LibraryBig },
  { to: '/decks', label: 'Decks', icon: BookOpen },
];

function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-[1600px] h-14 px-4 flex items-center gap-6">
        <Logo />
        <nav aria-label="Sections" className="hidden sm:flex items-center gap-1 h-full">
          {SECTIONS.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `relative h-full px-3 inline-flex items-center text-sm font-medium transition-colors ${
                isActive ? 'text-fg after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-accent-fill after:rounded-full' : 'text-muted hover:text-fg'
              }`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NotificationsBell />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  const { user } = useAuth();
  const { openSignIn, signInDialog } = useSignIn();
  const item = 'flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium';
  return (
    <nav aria-label="Sections"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line flex h-16 pb-[env(safe-area-inset-bottom)]">
      {SECTIONS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `${item} ${isActive ? 'text-accent' : 'text-muted'}`}>
          <Icon size={22} />
          {label}
        </NavLink>
      ))}
      {user ? (
        <NavLink to={`/u/${user.id}`} className={({ isActive }) => `${item} ${isActive ? 'text-accent' : 'text-muted'}`}>
          <User size={22} />
          You
        </NavLink>
      ) : (
        <button type="button" className={`${item} text-muted`} onClick={openSignIn}>
          <User size={22} />
          Sign in
        </button>
      )}
      {signInDialog}
    </nav>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  // Full-height workspaces manage their own scrolling and have no footer.
  const workspace = /^\/decks\/[^/]+\/edit/.test(pathname);
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className={`flex-1 ${workspace ? '' : 'pb-20 sm:pb-0'}`}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      {!workspace && <SiteFooter />}
      <TabBar />
      <Toasts />
    </div>
  );
}
