#!/usr/bin/env node
// Creates (or resets) demo accounts with a collection, decks, binders and a
// pending invite, through the normal API as those users.
//
//   node scripts/seed-demo.mjs
//
// Uses the local stack by default; set SUPABASE_URL and SUPABASE_ANON_KEY for
// another project. Card data must be built first (npm run cards).

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const KEY = process.env.SUPABASE_ANON_KEY
  ?? readFileSync(join(ROOT, '.env.example'), 'utf8').match(/REACT_APP_SUPABASE_ANON_KEY=(\S+)/)[1];

export const DEMO = { email: 'demo@lorebook.test', password: 'lorebook-demo', name: 'Demo Player' };
const FRIEND = { email: 'sam@lorebook.test', password: 'lorebook-demo', name: 'Sam' };

const file = readdirSync(join(ROOT, 'public/data')).find(f => /^cards\..*\.json$/.test(f));
const { cards } = JSON.parse(readFileSync(join(ROOT, 'public/data', file), 'utf8'));
const byName = name => cards.find(c => c.fullName === name);

// Deterministic randomness, so reruns give the same account.
let seed = 20261109;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (list, n) => [...list].sort(() => rand() - 0.5).slice(0, n);

async function signIn({ email, password, name }) {
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });
  let { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    ({ data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } }));
    if (error) throw error;
  }
  return { sb, userId: data.user.id };
}

const check = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

async function reset(sb, userId) {
  check(await sb.from('decks').delete().eq('owner_id', userId), 'deleting decks');
  check(await sb.from('binders').delete().eq('owner_id', userId), 'deleting binders');
  const profile = check(await sb.from('profiles').select('active_collection_id').eq('user_id', userId).single(), 'profile');
  const own = check(await sb.from('collections').select('id').eq('owner_id', userId).single(), 'collection');
  if (profile.active_collection_id !== own.id) {
    await sb.rpc('leave_collection', { p_collection: profile.active_collection_id });
  }
  await sb.rpc('disable_invite_code', { p_collection: own.id });
  const pending = check(await sb.from('collection_invites').select('id').eq('inviter_id', userId).eq('status', 'pending'), 'invites');
  for (const i of pending) await sb.rpc('cancel_invite', { p_invite: i.id });
  check(await sb.from('notifications').delete().eq('user_id', userId), 'clearing notifications');
  return own.id;
}

function collectionFor() {
  const rows = [];
  for (const c of cards) {
    const set = parseInt(c.setCode, 10);
    if (!(set >= 1 && set <= 14) || c.promoGrouping) continue;
    const r = rand();
    let normal = 0;
    let foil = 0;
    switch (c.rarity) {
      case 'Common': normal = r < 0.85 ? 1 + Math.floor(rand() * 5) : 0; break;
      case 'Uncommon': normal = r < 0.75 ? 1 + Math.floor(rand() * 4) : 0; break;
      case 'Rare': normal = r < 0.5 ? 1 + Math.floor(rand() * 3) : 0; break;
      case 'Super Rare': normal = r < 0.35 ? 1 + Math.floor(rand() * 2) : 0; break;
      case 'Legendary': normal = r < 0.25 ? 1 : 0; break;
      case 'Enchanted': case 'Epic': case 'Iconic': foil = r < 0.06 ? 1 : 0; break;
      default: break;
    }
    if (normal && rand() < 0.08) foil = 1;
    if (normal || foil) rows.push({ card_id: c.id, normal, foil });
  }
  return rows;
}

/** A legal 60-card Core deck: 15 different two-ink cards, four of each, with a curve. */
function buildDeck(inks, avoid = new Set()) {
  const pool = cards.filter(c => c.legal.core && !c.promoGrouping && c.colors?.length !== 2
    && inks.includes(c.color) && !['Enchanted', 'Epic', 'Iconic', 'Special'].includes(c.rarity) && !avoid.has(c.fullName));
  const seen = new Set();
  const unique = pool.filter(c => (seen.has(c.fullName) ? false : seen.add(c.fullName)));
  const slots = [[1, 2], [2, 3], [2, 3], [3, 3], [4, 2], [5, 1], [6, 1], [7, 1]]; // cost, how many names
  const chosen = [];
  for (const [cost, n] of slots) {
    const options = unique.filter(c => (cost === 7 ? c.cost >= 7 : c.cost === cost) && !chosen.includes(c) && c.inkwell);
    chosen.push(...pick(options, n));
  }
  while (chosen.length < 15) chosen.push(pick(unique.filter(c => !chosen.includes(c)), 1)[0]);
  return chosen.slice(0, 15);
}

const link = c => `[[${c.fullName}]]`;

function guideFor(title, deckCards) {
  const byCost = [...deckCards].sort((a, b) => a.cost - b.cost);
  const early = byCost.slice(0, 3);
  const top = byCost.slice(-2);
  const characters = deckCards.filter(c => c.type === 'Character');
  return `## Game plan

${title} wants to put cheap characters down early, quest every turn, and finish with its big plays.

- **Turns 1–2:** ${early.map(link).join(', ')}.
- **Turns 3–4:** develop the board and keep questing; challenge only when the trade is good.
- **Late game:** ${top.map(link).join(' and ')} close things out.

## Key cards

| Card | Why |
| --- | --- |
${characters.slice(0, 4).map(c => `| ${link(c)} | ${c.lore ?? 1} lore a turn at cost ${c.cost} |`).join('\n')}

> Mulligan aggressively for a two-drop.

*Built by the seed script, so treat this as a demo, not tournament advice.*`;
}

async function createDeck(sb, { name, description, tags, chosen, isPublic, avatar }) {
  const id = check(await sb.rpc('create_deck', {
    p_name: name, p_description: description, p_tags: tags,
    p_cards: chosen.map(c => ({ card_id: c.id, quantity: 4 })),
    p_avatar: avatar ? { cardId: avatar.id, cropData: { x: 50, y: 18, scale: 1.4 } } : null,
  }), `creating ${name}`);
  check(await sb.from('decks').update({ guide: guideFor(name, chosen), is_public: isPublic }).eq('id', id), 'guide');
  return id;
}

async function main() {
  const demo = await signIn(DEMO);
  const friend = await signIn(FRIEND);
  const demoCollection = await reset(demo.sb, demo.userId);
  const friendCollection = await reset(friend.sb, friend.userId);

  const stitch = byName('Stitch - Rock Star') ?? cards[0];
  check(await demo.sb.from('profiles').update({
    display_name: DEMO.name, location: 'Brisbane', bio: 'Collecting every set. Amber/Steel forever.',
    avatar_card_id: stitch.id, avatar_crop: { x: 50, y: 30, scale: 1.8 }, is_public: true,
  }).eq('user_id', demo.userId), 'demo profile');
  check(await friend.sb.from('profiles').update({ display_name: FRIEND.name, bio: 'Sapphire control enjoyer.', is_public: true })
    .eq('user_id', friend.userId), 'friend profile');

  const owned = collectionFor();
  check(await demo.sb.rpc('replace_collection_cards', { p_collection: demoCollection, p_cards: owned }), 'collection');
  check(await friend.sb.rpc('replace_collection_cards', { p_collection: friendCollection, p_cards: owned.filter(() => rand() < 0.2) }), 'friend collection');

  const used = new Set();
  const decks = [
    { name: 'Amber/Steel Bodyguards', inks: ['Amber', 'Steel'], tags: ['archetype:midrange', 'core'], isPublic: true },
    { name: 'Ruby/Sapphire Tempo', inks: ['Ruby', 'Sapphire'], tags: ['archetype:tempo', 'core'], isPublic: true },
    { name: 'Emerald/Amethyst Tricks', inks: ['Emerald', 'Amethyst'], tags: ['archetype:control'], isPublic: false },
    { name: 'Amethyst/Steel Songs', inks: ['Amethyst', 'Steel'], tags: ['archetype:songs', 'core'], isPublic: true },
  ];
  const deckIds = [];
  for (const d of decks) {
    const chosen = buildDeck(d.inks, used);
    chosen.forEach(c => used.add(c.fullName));
    const star = [...chosen].sort((a, b) => b.cost - a.cost)[0];
    deckIds.push({ id: await createDeck(demo.sb, { ...d, description: `A ${d.inks.join('/')} list for Core.`, chosen, avatar: star }), chosen });
  }

  // A short conversation on the first public deck.
  const first = deckIds[0];
  check(await friend.sb.from('deck_comments').insert({ deck_id: first.id, author_id: friend.userId,
    body: `Nice list! Have you tried more copies of [[${first.chosen[1].fullName}]]? It carried my games last week.` }), 'comment');
  check(await demo.sb.from('deck_comments').insert({ deck_id: first.id, author_id: demo.userId,
    body: 'Thanks! Running four already; the curve wants it.' }), 'reply');
  const samDeck = buildDeck(['Sapphire', 'Steel']);
  await createDeck(friend.sb, { name: 'Sapphire/Steel Ramp', tags: ['archetype:ramp'], description: 'Ink fast, land big threats.', chosen: samDeck, isPublic: true });

  // Binders: a shared trade binder and a shared set binder.
  const binder = check(await demo.sb.from('binders').insert({
    owner_id: demo.userId, kind: 'custom', name: 'Trade binder', description: 'Spares I will trade.', is_public: true,
  }).select('id').single(), 'trade binder');
  const spares = owned.filter(r => r.normal >= 3).slice(0, 18);
  check(await demo.sb.rpc('save_binder_cards', { p_binder: binder.id, p_cards: spares.map(r => ({ card_id: r.card_id, quantity: r.normal - 2 })) }), 'binder cards');
  check(await demo.sb.from('binders').insert({ owner_id: demo.userId, kind: 'set', set_code: '13', name: 'Attack of the Vine!', is_public: true }), 'set binder');

  // Sam shares their collection and invites the demo player: shows in notifications.
  await friend.sb.rpc('rotate_invite_code', { p_collection: friendCollection });
  check(await friend.sb.rpc('invite_to_collection', { p_collection: friendCollection, p_invitee: demo.userId }), 'invite');

  const total = owned.reduce((n, r) => n + r.normal + r.foil, 0);
  console.log(`Demo account ready: ${DEMO.email} / ${DEMO.password}`);
  console.log(`  ${owned.length} different cards (${total} copies), ${decks.length} decks, 2 binders, 1 pending invite from ${FRIEND.name}`);
  console.log(`Second account: ${FRIEND.email} / ${FRIEND.password}`);
}

main().catch(e => {
  console.error(e.message ?? e);
  process.exit(1);
});
