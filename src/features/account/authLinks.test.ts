import { describe, expect, it } from 'vitest';
import { hasAuthParams, linkError, safeReturnPath } from './authLinks';

describe('auth links', () => {
  it('only returns to paths on this site', () => {
    expect(safeReturnPath('/decks/1?x=2')).toBe('/decks/1?x=2');
    expect(safeReturnPath('https://evil.example')).toBeNull();
    expect(safeReturnPath('//evil.example')).toBeNull();
    expect(safeReturnPath('/auth/callback')).toBeNull();
    expect(safeReturnPath('/reset-password?code=1')).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
  });

  it('explains bad links', () => {
    expect(linkError('', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'))
      .toBe('This link has expired or has already been used.');
    expect(linkError('?error=access_denied', '')).toBe('This link is no longer valid.');
    expect(linkError('?error=server_error&error_description=Boom+here', '')).toBe('Boom here');
    expect(linkError('?code=abc', '')).toBeNull();
  });

  it('spots codes and tokens', () => {
    expect(hasAuthParams('?code=abc', '')).toBe(true);
    expect(hasAuthParams('', '#access_token=x&type=recovery')).toBe(true);
    expect(hasAuthParams('', '')).toBe(false);
  });
});
