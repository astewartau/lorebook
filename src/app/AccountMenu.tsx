import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, Settings, Sun, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { CardAvatar } from '../ui/CardAvatar';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu';
import { AuthDialog } from './AuthDialog';
import { ThemeChoice, useTheme } from './theme';

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex gap-1 p-1 bg-surface-2 rounded-lg">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" role="radio" aria-checked={theme === value} aria-label={label} title={label}
          onClick={() => setTheme(value)}
          className={`flex-1 h-9 inline-flex items-center justify-center rounded-md text-sm ${theme === value ? 'bg-surface shadow-card text-fg' : 'text-muted hover:text-fg'}`}>
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

export function useSignIn() {
  const [open, setOpen] = useState(false);
  return { openSignIn: () => setOpen(true), signInDialog: <AuthDialog open={open} onClose={() => setOpen(false)} /> };
}

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const { userProfile } = useProfile();
  const navigate = useNavigate();
  const { openSignIn, signInDialog } = useSignIn();

  if (!user) {
    return (
      <>
        <button type="button" className="btn-primary btn-sm" onClick={openSignIn}>Sign in</button>
        {signInDialog}
      </>
    );
  }

  const name = userProfile?.displayName ?? user.email ?? 'You';
  return (
    <Menu label="Account" triggerClassName="rounded-full" trigger={
      <CardAvatar cardId={userProfile?.avatarCardId} crop={userProfile?.avatarCropData} fallback={name} className="h-9 w-9" />
    }>
      {close => (
        <>
          <div className="px-3 py-2">
            <div className="font-medium truncate">{name}</div>
            <div className="text-xs text-muted truncate">{user.email}</div>
          </div>
          <MenuSeparator />
          <MenuItem onClick={() => { close(); navigate(`/u/${user.id}`); }}><User size={16} /> Your profile</MenuItem>
          <MenuItem onClick={() => { close(); navigate('/settings'); }}><Settings size={16} /> Settings</MenuItem>
          <MenuSeparator />
          <div className="px-1.5 py-1"><ThemeSwitch /></div>
          <MenuSeparator />
          <MenuItem onClick={() => { close(); signOut(); }}><LogOut size={16} /> Sign out</MenuItem>
        </>
      )}
    </Menu>
  );
}
