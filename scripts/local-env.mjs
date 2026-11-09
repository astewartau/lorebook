#!/usr/bin/env node
// Writes .env.local for the local Supabase stack, from `supabase status`.
//
//   node scripts/local-env.mjs [host]
//
// host: where the browser reaches the stack (default 127.0.0.1), e.g. a
// Tailscale address to use the app from another device.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** API URL and anon key of the running local stack. */
export function localStack() {
  const out = execFileSync(join(ROOT, 'scripts/supabase.sh'), ['status', '-o', 'json'], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  });
  const status = JSON.parse(out.slice(out.indexOf('{')));
  return { url: status.API_URL, anonKey: status.ANON_KEY, serviceKey: status.SERVICE_ROLE_KEY };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url, anonKey } = localStack();
  const host = process.argv[2];
  const browserUrl = host ? url.replace('127.0.0.1', host) : url;
  writeFileSync(join(ROOT, '.env.local'), `REACT_APP_SUPABASE_URL=${browserUrl}\nREACT_APP_SUPABASE_ANON_KEY=${anonKey}\n`);
  console.log(`Wrote .env.local for ${browserUrl}`);
}
