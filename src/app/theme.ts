import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'lorebook-theme';

function stored(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // Storage blocked: follow the system.
  }
  return 'system';
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && systemDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** Light, dark, or follow the system; remembered per browser. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(stored);

  useEffect(() => {
    applyTheme(choice);
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const set = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Not remembered; still applies now.
    }
    setChoice(next);
  }, []);

  return { theme: choice, setTheme: set };
}
