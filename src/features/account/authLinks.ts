// Helpers for pages reached from email links (sign-in, password reset).

/** sessionStorage key: where to go after finishing a sign-in from an email or OAuth link. */
export const RETURN_KEY = 'lorebook-return-to';

/** A same-site path to go back to, or null. Rejects other sites and auth pages. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  if (/^\/(auth\/callback|reset-password)(\/|\?|#|$)/.test(path)) return null;
  return path;
}

/** Remembers the current page so the callback page can come back to it. */
export function rememberReturnPath(path: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    // Storage blocked: the callback falls back to /cards.
  }
}

/** The page to go to after the callback: ?next=, then the remembered page, then /cards. */
export function takeReturnPath(search: string): string {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // Ignore.
  }
  return safeReturnPath(new URLSearchParams(search).get('next')) ?? safeReturnPath(stored) ?? '/cards';
}

/**
 * Supabase reports a bad link with error, error_code and error_description in
 * the query string or the hash. Returns a sentence for people, or null.
 */
export function linkError(search: string, hash: string): string | null {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (k: string) => q.get(k) ?? h.get(k);
  const error = get('error');
  const code = get('error_code');
  if (!error && !code) return null;
  if (code === 'otp_expired' || /expired/i.test(get('error_description') ?? '')) {
    return 'This link has expired or has already been used.';
  }
  if (error === 'access_denied') return 'This link is no longer valid.';
  return get('error_description')?.replace(/\+/g, ' ') ?? 'This link could not be used.';
}

/** True if the address carries something for the Supabase client to exchange. */
export function hasAuthParams(search: string, hash: string): boolean {
  return new URLSearchParams(search).has('code') || /(^|[#&])(access_token|token_hash)=/.test(hash);
}
