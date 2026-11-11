#!/usr/bin/env node
// Card data pipeline.
//
//   node scripts/cards.mjs fetch   download LorcanaJSON into .cache/
//   node scripts/cards.mjs build   write the trimmed, content-hashed card file to public/data/
//   node scripts/cards.mjs sync    upsert the card catalogue into the database (service role)
//   node scripts/cards.mjs all     all three
//
// The client loads public/data/manifest.json (small, revalidated) and then the
// hashed file it names, which can be cached forever.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localStack } from './local-env.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_URL = 'https://lorcanajson.org/files/current/en/allCards.json';
const CACHE_FILE = join(ROOT, '.cache', 'lorcanajson', 'allCards.json');
const OUT_DIR = join(ROOT, 'public', 'data');

async function fetchSource() {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`${SOURCE_URL}: ${res.status} ${res.statusText}`);
  const text = await res.text();
  const data = JSON.parse(text);
  writeFileSync(CACHE_FILE, text);
  console.log(`Fetched ${data.cards.length} cards (generated ${data.metadata.generatedOn})`);
}

function readSource() {
  if (!existsSync(CACHE_FILE)) {
    throw new Error(`${CACHE_FILE} is missing: run "node scripts/cards.mjs fetch" first`);
  }
  return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
}

// Keep only what the app reads. Absent optional fields stay absent.
function trimCard(c) {
  const out = {
    id: c.id,
    name: c.name,
    version: c.version,
    fullName: c.fullName,
    setCode: c.setCode,
    number: c.number,
    rarity: c.rarity,
    color: c.color,
    colors: c.colors,
    cost: c.cost,
    type: c.type,
    strength: c.strength,
    willpower: c.willpower,
    lore: c.lore,
    moveCost: c.moveCost,
    inkwell: c.inkwell,
    abilities: c.abilities?.map(a => ({
      type: a.type,
      name: a.name,
      effect: a.effect,
      keyword: a.keyword,
      keywordValue: a.keywordValue,
      fullText: a.fullText,
    })),
    keywordAbilities: c.keywordAbilities,
    effects: c.effects,
    fullText: c.fullText,
    flavorText: c.flavorText,
    artists: c.artists,
    images: { full: c.images?.full, thumbnail: c.images?.thumbnail },
    story: c.story,
    subtypes: c.subtypes,
    foilTypes: c.foilTypes,
    promoGrouping: c.promoGrouping,
    variant: c.variant,
    names: c.names,
    maxCopiesInDeck: c.maxCopiesInDeck,
    legal: {
      core: c.allowedInFormats?.Core?.allowed === true,
      infinity: c.allowedInFormats?.Infinity?.allowed !== false,
    },
  };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

function trimSet(s) {
  return {
    name: s.name,
    number: s.number,
    type: s.type,
    releaseDate: s.releaseDate,
    prereleaseDate: s.prereleaseDate,
    hasAllCards: s.hasAllCards,
    legal: {
      core: s.allowedInFormats?.Core?.allowed === true,
      infinity: s.allowedInFormats?.Infinity?.allowed !== false,
    },
  };
}

function build() {
  const src = readSource();
  const data = {
    metadata: src.metadata,
    sets: Object.fromEntries(Object.entries(src.sets).map(([code, s]) => [code, trimSet(s)])),
    cards: src.cards.map(trimCard),
  };
  const json = JSON.stringify(data);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 12);
  const file = `cards.${hash}.json`;

  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) {
    if (/^cards\.[0-9a-f]+\.json$/.test(f) && f !== file) rmSync(join(OUT_DIR, f));
  }
  writeFileSync(join(OUT_DIR, file), json);
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify({
    file,
    generatedOn: src.metadata.generatedOn,
    cardCount: data.cards.length,
  }, null, 2) + '\n');
  console.log(`Wrote public/data/${file}: ${data.cards.length} cards, ${(json.length / 1e6).toFixed(2)} MB`);
}

// Local stack credentials come from `supabase status`; a hosted project can
// pass SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY instead.
function dbCredentials() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  }
  const { url, serviceKey } = localStack();
  return { url, key: serviceKey };
}

async function sync() {
  const src = readSource();
  const { url, key } = dbCredentials();
  const rows = src.cards.map(c => ({
    id: c.id,
    set_code: c.setCode,
    number: c.number,
    full_name: c.fullName,
    inks: c.colors ?? (c.color ? c.color.split('-') : []),
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += 1000) {
    const res = await fetch(`${url}/rest/v1/cards?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: key,
        // New-style keys (sb_secret_...) go only in apikey; legacy JWT keys also as a bearer token.
        ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows.slice(i, i + 1000)),
    });
    if (!res.ok) throw new Error(`Upserting cards: ${res.status} ${await res.text()}`);
  }
  console.log(`Synced ${rows.length} cards to ${url}`);
}

const command = process.argv[2];
const steps = { fetch: [fetchSource], build: [build], sync: [sync], all: [fetchSource, build, sync] }[command];
if (!steps) {
  console.error('Usage: node scripts/cards.mjs fetch|build|sync|all');
  process.exit(1);
}
for (const step of steps) await step();
