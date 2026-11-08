// All database access goes through here. Rows are converted to the app's
// types at this boundary; errors are thrown as ApiError.

import type { Json } from './database.types';
import { supabase, Tables, Views, VERSION_CONFLICT } from './supabase';
import type { CollectionCardEntry, CustomBinder, Deck, DeckCardEntry, UserProfile } from '../types';

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
  get isVersionConflict() {
    return this.code === VERSION_CONFLICT;
  }
}

type Result = { data: unknown; error: { message: string; code?: string } | null };

function check<R extends Result>(result: R): NonNullable<R['data']> {
  if (result.error) throw new ApiError(result.error.message, result.error.code);
  return result.data as NonNullable<R['data']>;
}

/** For single-row reads that may find nothing. */
function checkMaybe<R extends Result>(result: R): NonNullable<R['data']> | null {
  if (result.error) throw new ApiError(result.error.message, result.error.code);
  return (result.data ?? null) as NonNullable<R['data']> | null;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function toProfile(p: Tables<'profiles'>): UserProfile {
  return {
    userId: p.user_id,
    displayName: p.display_name,
    fullName: p.full_name ?? undefined,
    location: p.location ?? undefined,
    bio: p.bio ?? undefined,
    avatarCardId: p.avatar_card_id ?? undefined,
    avatarCropData: (p.avatar_crop as UserProfile['avatarCropData']) ?? undefined,
    isPublic: p.is_public,
    activeCollectionId: p.active_collection_id ?? undefined,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const row = checkMaybe(await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle());
  return row ? toProfile(row) : null;
}

/** Empty strings clear text fields; null clears the avatar. */
export type ProfileUpdate = Partial<Pick<UserProfile, 'displayName' | 'fullName' | 'location' | 'bio' | 'isPublic'>> & {
  avatarCardId?: number | null;
  avatarCropData?: UserProfile['avatarCropData'] | null;
};

export async function updateProfile(userId: string, update: ProfileUpdate): Promise<UserProfile> {
  const row: Partial<Tables<'profiles'>> = {};
  if (update.displayName !== undefined) row.display_name = update.displayName;
  if (update.fullName !== undefined) row.full_name = update.fullName || null;
  if (update.location !== undefined) row.location = update.location || null;
  if (update.bio !== undefined) row.bio = update.bio || null;
  if (update.avatarCardId !== undefined) row.avatar_card_id = update.avatarCardId ?? null;
  if (update.avatarCropData !== undefined) row.avatar_crop = (update.avatarCropData ?? null) as Json;
  if (update.isPublic !== undefined) row.is_public = update.isPublic;
  const data = check(await supabase.from('profiles').update(row).eq('user_id', userId).select('*').single());
  return toProfile(data);
}

/** Public profiles matching a search across name and location. */
export async function searchProfiles(term: string, limit = 100): Promise<UserProfile[]> {
  let query = supabase.from('profiles').select('*').eq('is_public', true);
  const t = term.trim().replace(/[%_,()]/g, ' ');
  if (t) {
    query = query.or(`display_name.ilike.%${t}%,full_name.ilike.%${t}%,location.ilike.%${t}%`);
  }
  const rows = check(await query.order('display_name').limit(limit));
  return rows.map(toProfile);
}

/**
 * For pages opened from an email link (sign-in, password reset). The client
 * exchanges the link's code for a session as it starts; this waits for that
 * and reports whether it worked. Safe to call more than once.
 */
export async function finishEmailLink(): Promise<{ signedIn: boolean; error: string | null }> {
  const { error } = await supabase.auth.initialize();
  const { data } = await supabase.auth.getSession();
  return { signedIn: !!data.session, error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function getCollectionCards(collectionId: string): Promise<CollectionCardEntry[]> {
  const out: CollectionCardEntry[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const rows = check(await supabase
      .from('collection_cards')
      .select('card_id, normal, foil')
      .eq('collection_id', collectionId)
      .order('card_id')
      .range(from, from + PAGE - 1));
    for (const r of rows) out.push({ cardId: r.card_id, quantityNormal: r.normal, quantityFoil: r.foil });
    if (rows.length < PAGE) return out;
  }
}

export interface QuantityDelta {
  cardId: number;
  normal: number;
  foil: number;
}

/** Applies deltas on the server and returns the resulting quantities of the cards touched. */
export async function adjustCollection(collectionId: string, deltas: QuantityDelta[]): Promise<CollectionCardEntry[]> {
  const rows = check(await supabase.rpc('adjust_collection_cards', {
    p_collection: collectionId,
    p_changes: deltas.map(d => ({ card_id: d.cardId, normal: d.normal, foil: d.foil })),
  }));
  return rows.map(r => ({ cardId: r.card_id, quantityNormal: r.normal, quantityFoil: r.foil }));
}

export async function replaceCollection(collectionId: string, cards: CollectionCardEntry[]): Promise<void> {
  check(await supabase.rpc('replace_collection_cards', {
    p_collection: collectionId,
    p_cards: cards.map(c => ({ card_id: c.cardId, normal: c.quantityNormal, foil: c.quantityFoil })),
  }));
}

export interface CollectionInfo {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string | null;
  members: { userId: string; role: 'owner' | 'editor'; displayName: string; joinedAt: Date }[];
}

export async function getCollectionInfo(collectionId: string): Promise<CollectionInfo | null> {
  const col = checkMaybe(await supabase.from('collections').select('*').eq('id', collectionId).maybeSingle());
  if (!col) return null;
  const members = check(await supabase
    .from('collection_members')
    .select('user_id, role, joined_at')
    .eq('collection_id', collectionId)
    .order('joined_at'));
  const profiles = members.length
    ? check(await supabase.from('profiles').select('user_id, display_name').in('user_id', members.map(m => m.user_id)))
    : [];
  const names = new Map(profiles.map(p => [p.user_id, p.display_name]));
  return {
    id: col.id,
    name: col.name,
    ownerId: col.owner_id,
    inviteCode: col.invite_code,
    members: members.map(m => ({
      userId: m.user_id,
      role: m.role as 'owner' | 'editor',
      displayName: names.get(m.user_id) ?? 'Unknown',
      joinedAt: new Date(m.joined_at),
    })),
  };
}

export async function getOwnCollectionId(userId: string): Promise<string | null> {
  const row = checkMaybe(await supabase.from('collections').select('id').eq('owner_id', userId).maybeSingle());
  return row?.id ?? null;
}

export async function renameCollection(collectionId: string, name: string) {
  check(await supabase.from('collections').update({ name }).eq('id', collectionId));
}

export async function rotateInviteCode(collectionId: string): Promise<string> {
  return check(await supabase.rpc('rotate_invite_code', { p_collection: collectionId }));
}

export async function disableInviteCode(collectionId: string) {
  check(await supabase.rpc('disable_invite_code', { p_collection: collectionId }));
}

export async function joinCollection(code: string, merge: boolean): Promise<string> {
  return check(await supabase.rpc('join_collection', { p_code: code, p_merge: merge }));
}

export async function leaveCollection(collectionId: string) {
  check(await supabase.rpc('leave_collection', { p_collection: collectionId }));
}

export async function removeCollectionMember(collectionId: string, userId: string) {
  check(await supabase.rpc('remove_collection_member', { p_collection: collectionId, p_user: userId }));
}

export async function inviteToCollection(collectionId: string, inviteeId: string): Promise<string> {
  return check(await supabase.rpc('invite_to_collection', { p_collection: collectionId, p_invitee: inviteeId }));
}

export async function respondToInvite(inviteId: string, accept: boolean, merge: boolean) {
  check(await supabase.rpc('respond_to_invite', { p_invite: inviteId, p_accept: accept, p_merge: merge }));
}

export async function cancelInvite(inviteId: string) {
  check(await supabase.rpc('cancel_invite', { p_invite: inviteId }));
}

export interface InviteInfo {
  id: string;
  collectionId: string;
  inviterId: string;
  inviteeId: string;
  inviteeName?: string;
  createdAt: Date;
}

export async function getPendingInvites(filter: { collectionId?: string; inviteeId?: string }): Promise<InviteInfo[]> {
  let query = supabase.from('collection_invites').select('*').eq('status', 'pending');
  if (filter.collectionId) query = query.eq('collection_id', filter.collectionId);
  if (filter.inviteeId) query = query.eq('invitee_id', filter.inviteeId);
  const rows = check(await query.order('created_at', { ascending: false }));
  const ids = Array.from(new Set(rows.map(r => r.invitee_id)));
  const profiles = ids.length
    ? check(await supabase.from('profiles').select('user_id, display_name').in('user_id', ids))
    : [];
  const names = new Map(profiles.map(p => [p.user_id, p.display_name]));
  return rows.map(r => ({
    id: r.id,
    collectionId: r.collection_id,
    inviterId: r.inviter_id,
    inviteeId: r.invitee_id,
    inviteeName: names.get(r.invitee_id),
    createdAt: new Date(r.created_at),
  }));
}

export interface ReceivedInvite {
  id: string;
  collectionId: string;
  collectionName: string;
  inviterName: string;
  createdAt: Date;
}

/**
 * Pending invitations to join someone's collection. Invitees can't read the
 * collection or (private) inviter profile, so the names come from the
 * invitation's notification.
 */
export async function getMyInvites(userId: string): Promise<ReceivedInvite[]> {
  const rows = check(await supabase.from('collection_invites').select('*')
    .eq('invitee_id', userId).eq('status', 'pending').order('created_at', { ascending: false }));
  if (!rows.length) return [];
  const notes = check(await supabase.from('notifications').select('data')
    .eq('user_id', userId).eq('kind', 'collection_invite'));
  const names = new Map<string, { collection_name?: string; inviter_name?: string }>();
  for (const n of notes) {
    const d = n.data as { invite_id?: string; collection_name?: string; inviter_name?: string } | null;
    if (d?.invite_id) names.set(d.invite_id, d);
  }
  return rows.map(r => ({
    id: r.id,
    collectionId: r.collection_id,
    collectionName: names.get(r.id)?.collection_name ?? 'A shared collection',
    inviterName: names.get(r.id)?.inviter_name ?? 'Someone',
    createdAt: new Date(r.created_at),
  }));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(limit = 50): Promise<Tables<'notifications'>[]> {
  return check(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit));
}

export async function markNotificationsRead(ids?: string[]) {
  let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids) query = query.in('id', ids);
  check(await query);
}

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

function toDeckCards(json: Json | null): DeckCardEntry[] {
  return ((json as { card_id: number; quantity: number }[] | null) ?? [])
    .map(c => ({ cardId: c.card_id, quantity: c.quantity }));
}

export function toDeck(d: Views<'deck_details'>): Deck {
  return {
    id: d.id!,
    name: d.name!,
    description: d.description ?? undefined,
    guide: d.guide ?? undefined,
    cards: toDeckCards(d.cards),
    tags: d.tags ?? [],
    avatar: (d.avatar as Deck['avatar']) ?? undefined,
    isPublic: d.is_public ?? false,
    userId: d.owner_id!,
    ownerName: d.owner_name ?? undefined,
    version: d.version ?? 1,
    createdAt: new Date(d.created_at!),
    updatedAt: new Date(d.updated_at!),
  };
}

const deckCardsJson = (cards: DeckCardEntry[]) => cards.map(c => ({ card_id: c.cardId, quantity: c.quantity }));

export async function getUserDecks(userId: string): Promise<Deck[]> {
  const rows = check(await supabase.from('deck_details').select('*').eq('owner_id', userId).order('created_at', { ascending: false }));
  return rows.map(toDeck);
}

export async function getDeck(deckId: string): Promise<Deck | null> {
  const row = checkMaybe(await supabase.from('deck_details').select('*').eq('id', deckId).maybeSingle());
  return row ? toDeck(row) : null;
}

export interface PublicDeckQuery {
  search?: string;
  inks?: string[];
  tags?: string[];
  ownerId?: string;
  offset?: number;
  limit?: number;
}

export async function searchPublicDecks(q: PublicDeckQuery): Promise<Deck[]> {
  const rows = check(await supabase.rpc('search_public_decks', {
    p_search: q.search || undefined,
    p_inks: q.inks?.length ? q.inks : undefined,
    p_tags: q.tags?.length ? q.tags : undefined,
    p_owner: q.ownerId,
    p_offset: q.offset ?? 0,
    p_limit: q.limit ?? 50,
  }));
  return rows.map(toDeck);
}

export async function createDeck(d: { name: string; description?: string; tags?: string[]; cards?: DeckCardEntry[]; avatar?: Deck['avatar'] }): Promise<Deck> {
  const id = check(await supabase.rpc('create_deck', {
    p_name: d.name,
    p_description: d.description,
    p_tags: d.tags ?? [],
    p_cards: deckCardsJson(d.cards ?? []),
    p_avatar: (d.avatar ?? null) as Json,
  }));
  const deck = await getDeck(id);
  if (!deck) throw new ApiError('Deck was created but could not be read back');
  return deck;
}

export async function updateDeckMeta(deckId: string, d: Partial<Pick<Deck, 'name' | 'description' | 'guide' | 'tags' | 'avatar' | 'isPublic'>>) {
  const row: Partial<Tables<'decks'>> = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.description !== undefined) row.description = d.description || null;
  if (d.guide !== undefined) row.guide = d.guide || null;
  if (d.tags !== undefined) row.tags = d.tags;
  if (d.avatar !== undefined) row.avatar = (d.avatar ?? null) as Json;
  if (d.isPublic !== undefined) row.is_public = d.isPublic;
  check(await supabase.from('decks').update(row).eq('id', deckId));
}

/** Saves a deck's cards; returns the new version. Throws ApiError with isVersionConflict if stale. */
export async function saveDeckCards(deckId: string, cards: DeckCardEntry[], expectedVersion?: number): Promise<number> {
  return check(await supabase.rpc('save_deck_cards', {
    p_deck: deckId,
    p_cards: deckCardsJson(cards),
    p_expected_version: expectedVersion,
  }));
}

export async function deleteDeck(deckId: string) {
  check(await supabase.from('decks').delete().eq('id', deckId));
}

// ---------------------------------------------------------------------------
// Deck comments
// ---------------------------------------------------------------------------

export interface DeckComment {
  id: string;
  deckId: string;
  authorId: string;
  /** Missing when the author's profile is private. */
  author?: { displayName: string; avatarCardId?: number; avatarCrop?: UserProfile['avatarCropData'] };
  body: string;
  createdAt: Date;
  editedAt?: Date;
}

export async function getDeckComments(deckId: string): Promise<DeckComment[]> {
  const rows = check(await supabase
    .from('deck_comments')
    .select('id, deck_id, author_id, body, created_at, edited_at, author:profiles(display_name, avatar_card_id, avatar_crop)')
    .eq('deck_id', deckId)
    .order('created_at'));
  return rows.map(r => {
    const a = r.author as { display_name: string; avatar_card_id: number | null; avatar_crop: Json } | null;
    return {
      id: r.id,
      deckId: r.deck_id,
      authorId: r.author_id,
      author: a ? {
        displayName: a.display_name,
        avatarCardId: a.avatar_card_id ?? undefined,
        avatarCrop: (a.avatar_crop as UserProfile['avatarCropData']) ?? undefined,
      } : undefined,
      body: r.body,
      createdAt: new Date(r.created_at),
      editedAt: r.edited_at ? new Date(r.edited_at) : undefined,
    };
  });
}

export async function addDeckComment(deckId: string, authorId: string, body: string) {
  check(await supabase.from('deck_comments').insert({ deck_id: deckId, author_id: authorId, body: body.trim() }));
}

export async function editDeckComment(commentId: string, body: string) {
  check(await supabase.from('deck_comments').update({ body: body.trim() }).eq('id', commentId));
}

export async function deleteDeckComment(commentId: string) {
  check(await supabase.from('deck_comments').delete().eq('id', commentId));
}

// ---------------------------------------------------------------------------
// Binders
// ---------------------------------------------------------------------------

export function toBinder(b: Tables<'binders'>, cards: { card_id: number; quantity: number }[] = []): CustomBinder {
  return {
    id: b.id,
    name: b.name,
    description: b.description ?? undefined,
    kind: b.kind as 'set' | 'custom',
    setCode: b.set_code ?? undefined,
    cards: cards.map(c => ({ cardId: c.card_id, quantity: c.quantity })),
    isPublic: b.is_public,
    userId: b.owner_id,
    version: b.version,
    createdAt: new Date(b.created_at),
    updatedAt: new Date(b.updated_at),
  };
}

export async function getUserBinders(userId: string, opts: { publicOnly?: boolean } = {}): Promise<CustomBinder[]> {
  let query = supabase
    .from('binders')
    .select('*, binder_cards(card_id, quantity, position)')
    .eq('owner_id', userId);
  if (opts.publicOnly) query = query.eq('is_public', true);
  const rows = check(await query.order('created_at', { ascending: false }));
  return rows.map(({ binder_cards, ...b }) =>
    toBinder(b, [...(binder_cards ?? [])].sort((x, y) => x.position - y.position)));
}

export async function createBinder(ownerId: string, b: { kind: 'set' | 'custom'; name: string; description?: string; setCode?: string; isPublic?: boolean }): Promise<CustomBinder> {
  const row = check(await supabase.from('binders').insert({
    owner_id: ownerId,
    kind: b.kind,
    name: b.name,
    description: b.description ?? null,
    set_code: b.kind === 'set' ? b.setCode! : null,
    is_public: b.isPublic ?? false,
  }).select('*').single());
  return toBinder(row);
}

export async function updateBinderMeta(binderId: string, b: Partial<Pick<CustomBinder, 'name' | 'description' | 'isPublic'>>) {
  const row: Partial<Tables<'binders'>> = {};
  if (b.name !== undefined) row.name = b.name;
  if (b.description !== undefined) row.description = b.description || null;
  if (b.isPublic !== undefined) row.is_public = b.isPublic;
  check(await supabase.from('binders').update(row).eq('id', binderId));
}

export async function saveBinderCards(binderId: string, cards: { cardId: number; quantity: number }[], expectedVersion?: number): Promise<number> {
  return check(await supabase.rpc('save_binder_cards', {
    p_binder: binderId,
    p_cards: cards.map(c => ({ card_id: c.cardId, quantity: c.quantity })),
    p_expected_version: expectedVersion,
  }));
}

export async function deleteBinder(binderId: string) {
  check(await supabase.from('binders').delete().eq('id', binderId));
}

export interface BinderView {
  binder: CustomBinder;
  owner: { userId: string; displayName: string } | null;
  owned: CollectionCardEntry[];
}

/** A binder you may see (public or yours), with only the owner's quantities for the cards it shows. */
export async function getBinderView(binderId: string): Promise<BinderView | null> {
  const data = check(await supabase.rpc('get_binder_view', { p_binder: binderId })) as null | {
    binder: Tables<'binders'>;
    owner: { user_id: string; display_name: string } | null;
    cards: { card_id: number; quantity: number }[];
    owned: { card_id: number; normal: number; foil: number }[];
  };
  if (!data) return null;
  return {
    binder: toBinder(data.binder, data.cards),
    owner: data.owner ? { userId: data.owner.user_id, displayName: data.owner.display_name } : null,
    owned: data.owned.map(o => ({ cardId: o.card_id, quantityNormal: o.normal, quantityFoil: o.foil })),
  };
}
