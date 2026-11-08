-- Lorebook schema.
--
-- Security model: every row is reached through row level security, and every
-- function that changes membership or crosses users takes the caller from
-- auth.uid(), never from an argument. Helpers used by policies live in the
-- `private` schema, which the API does not expose.
--
-- Collections: each user owns exactly one collection, created at sign-up.
-- Sharing a collection ("household") adds members to it; a member's own
-- collection stays theirs and becomes active again when they leave.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Card catalogue (written by scripts/sync-cards.mjs with the service role)
-- ---------------------------------------------------------------------------

create table public.cards (
  id integer primary key,
  set_code text not null,
  number integer,
  full_name text not null,
  inks text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index cards_set_code_idx on public.cards (set_code);

alter table public.cards enable row level security;
create policy "Cards are readable by everyone" on public.cards for select using (true);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  full_name text check (char_length(full_name) <= 100),
  location text check (char_length(location) <= 100),
  bio text check (char_length(bio) <= 1000),
  avatar_card_id integer references public.cards (id) on delete set null,
  avatar_crop jsonb,
  is_public boolean not null default true,
  active_collection_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Collections and membership
-- ---------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (user_id) on delete cascade,
  name text not null default 'My collection' check (char_length(name) between 1 and 60),
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger collections_touch before update on public.collections
  for each row execute function private.touch_updated_at();

alter table public.profiles
  add constraint profiles_active_collection_fk
  foreign key (active_collection_id) references public.collections (id) on delete set null;

create table public.collection_members (
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create index collection_members_user_idx on public.collection_members (user_id);

create table public.collection_cards (
  collection_id uuid not null references public.collections (id) on delete cascade,
  card_id integer not null references public.cards (id),
  normal integer not null default 0 check (normal >= 0),
  foil integer not null default 0 check (foil >= 0),
  updated_at timestamptz not null default now(),
  primary key (collection_id, card_id)
);

create or replace function private.is_collection_member(p_collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collection_members m
    where m.collection_id = p_collection and m.user_id = auth.uid()
  );
$$;

create or replace function private.is_collection_owner(p_collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collections c
    where c.id = p_collection and c.owner_id = auth.uid()
  );
$$;

-- True when the caller and p_user are members of a common collection.
create or replace function private.shares_collection_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collection_members a
    join public.collection_members b on b.collection_id = a.collection_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Invitations and notifications
-- ---------------------------------------------------------------------------

create table public.collection_invites (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  inviter_id uuid not null references public.profiles (user_id) on delete cascade,
  invitee_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index collection_invites_one_pending
  on public.collection_invites (collection_id, invitee_id) where status = 'pending';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Decks
-- ---------------------------------------------------------------------------

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 5000),
  tags text[] not null default '{}',
  avatar jsonb,
  is_public boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decks_owner_idx on public.decks (owner_id);
create index decks_public_idx on public.decks (updated_at desc) where is_public;
create index decks_tags_idx on public.decks using gin (tags);

create trigger decks_touch before update on public.decks
  for each row execute function private.touch_updated_at();

create table public.deck_cards (
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id integer not null references public.cards (id),
  quantity integer not null check (quantity between 1 and 99),
  primary key (deck_id, card_id)
);

-- ---------------------------------------------------------------------------
-- Binders
-- ---------------------------------------------------------------------------

-- A set binder shows the owner's active collection for one set; a custom
-- binder holds its own ordered list of cards.
create table public.binders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (user_id) on delete cascade,
  kind text not null check (kind in ('set', 'custom')),
  set_code text,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 2000),
  is_public boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'set') = (set_code is not null))
);

create unique index binders_one_per_set on public.binders (owner_id, set_code) where kind = 'set';
create index binders_owner_idx on public.binders (owner_id);

create trigger binders_touch before update on public.binders
  for each row execute function private.touch_updated_at();

create table public.binder_cards (
  binder_id uuid not null references public.binders (id) on delete cascade,
  card_id integer not null references public.cards (id),
  position integer not null,
  quantity integer not null check (quantity between 1 and 99),
  primary key (binder_id, card_id)
);

-- ---------------------------------------------------------------------------
-- Sign-up: profile, own collection, owner membership
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection uuid;
  v_name text;
begin
  v_name := left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1),
    'Player'
  ), 50);

  insert into public.profiles (user_id, display_name) values (new.id, v_name);
  insert into public.collections (owner_id) values (new.id) returning id into v_collection;
  insert into public.collection_members (collection_id, user_id, role) values (v_collection, new.id, 'owner');
  update public.profiles set active_collection_id = v_collection where user_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.collection_members enable row level security;
alter table public.collection_cards enable row level security;
alter table public.collection_invites enable row level security;
alter table public.notifications enable row level security;
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.binders enable row level security;
alter table public.binder_cards enable row level security;

create policy "Public profiles, your own, and your collection partners'" on public.profiles
  for select using (is_public or user_id = auth.uid() or private.shares_collection_with(user_id));
create policy "Update your own profile" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Members see their collections" on public.collections
  for select using (private.is_collection_member(id));
create policy "Owners rename their collection" on public.collections
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Members see who else is a member" on public.collection_members
  for select using (private.is_collection_member(collection_id));

create policy "Members read collection cards" on public.collection_cards
  for select using (private.is_collection_member(collection_id));
create policy "Members add collection cards" on public.collection_cards
  for insert with check (private.is_collection_member(collection_id));
create policy "Members change collection cards" on public.collection_cards
  for update using (private.is_collection_member(collection_id))
  with check (private.is_collection_member(collection_id));
create policy "Members remove collection cards" on public.collection_cards
  for delete using (private.is_collection_member(collection_id));

create policy "Invites you sent or received, or for your collections" on public.collection_invites
  for select using (
    invitee_id = auth.uid() or inviter_id = auth.uid() or private.is_collection_member(collection_id)
  );

create policy "Read your notifications" on public.notifications
  for select using (user_id = auth.uid());
create policy "Mark your notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Delete your notifications" on public.notifications
  for delete using (user_id = auth.uid());

create policy "Public decks and your own" on public.decks
  for select using (is_public or owner_id = auth.uid());
create policy "Create your own decks" on public.decks
  for insert with check (owner_id = auth.uid());
create policy "Change your own decks" on public.decks
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Delete your own decks" on public.decks
  for delete using (owner_id = auth.uid());

create policy "Cards of decks you can see" on public.deck_cards
  for select using (exists (
    select 1 from public.decks d where d.id = deck_id and (d.is_public or d.owner_id = auth.uid())
  ));
create policy "Change cards of your own decks" on public.deck_cards
  for all using (exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = auth.uid()));

create policy "Public binders and your own" on public.binders
  for select using (is_public or owner_id = auth.uid());
create policy "Create your own binders" on public.binders
  for insert with check (owner_id = auth.uid());
create policy "Change your own binders" on public.binders
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Delete your own binders" on public.binders
  for delete using (owner_id = auth.uid());

create policy "Cards of binders you can see" on public.binder_cards
  for select using (exists (
    select 1 from public.binders b where b.id = binder_id and (b.is_public or b.owner_id = auth.uid())
  ));
create policy "Change cards of your own binders" on public.binder_cards
  for all using (exists (select 1 from public.binders b where b.id = binder_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.binders b where b.id = binder_id and b.owner_id = auth.uid()));

-- Column privileges: what clients may write directly. Everything else goes
-- through the functions below.
revoke insert, update, delete on public.cards from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, full_name, location, bio, avatar_card_id, avatar_crop, is_public)
  on public.profiles to authenticated;
revoke insert, update, delete on public.collections from anon, authenticated;
grant update (name) on public.collections to authenticated;
revoke insert, update, delete on public.collection_members from anon, authenticated;
revoke insert, update, delete on public.collection_invites from anon, authenticated;
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update on public.decks from anon, authenticated;
grant update (name, description, tags, avatar, is_public) on public.decks to authenticated;
revoke update on public.binders from anon, authenticated;
grant update (name, description, is_public) on public.binders to authenticated;
revoke insert, update, delete on public.collection_cards, public.deck_cards, public.binder_cards from anon;
revoke insert, update, delete on public.decks, public.binders from anon;

-- ---------------------------------------------------------------------------
-- Collection functions
-- ---------------------------------------------------------------------------

-- Apply quantity changes (deltas) to a collection. Changes from different
-- devices or members commute, so concurrent edits never overwrite each other.
-- p_changes: [{"card_id": 1, "normal": 1, "foil": 0}, ...]
-- Returns the resulting quantities of every card touched (0 when removed).
create or replace function public.adjust_collection_cards(p_collection uuid, p_changes jsonb)
returns table (card_id integer, normal integer, foil integer)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  r record;
begin
  if not private.is_collection_member(p_collection) then
    raise exception 'not a member of this collection' using errcode = '42501';
  end if;

  for r in
    select (e ->> 'card_id')::integer as cid,
           sum(coalesce((e ->> 'normal')::integer, 0))::integer as dn,
           sum(coalesce((e ->> 'foil')::integer, 0))::integer as df
    from jsonb_array_elements(p_changes) e
    group by 1
  loop
    insert into public.collection_cards as c (collection_id, card_id, normal, foil)
    values (p_collection, r.cid, greatest(r.dn, 0), greatest(r.df, 0))
    on conflict (collection_id, card_id) do update
      set normal = greatest(0, c.normal + r.dn),
          foil = greatest(0, c.foil + r.df),
          updated_at = now();
  end loop;

  delete from public.collection_cards c
  where c.collection_id = p_collection and c.normal = 0 and c.foil = 0;

  return query
    select ids.cid, coalesce(c.normal, 0), coalesce(c.foil, 0)
    from (select distinct (e ->> 'card_id')::integer as cid from jsonb_array_elements(p_changes) e) ids
    left join public.collection_cards c on c.collection_id = p_collection and c.card_id = ids.cid;
end;
$$;

-- Replace a whole collection (imports). p_cards: [{"card_id", "normal", "foil"}]
create or replace function public.replace_collection_cards(p_collection uuid, p_cards jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_collection_member(p_collection) then
    raise exception 'not a member of this collection' using errcode = '42501';
  end if;

  delete from public.collection_cards where collection_id = p_collection;

  insert into public.collection_cards (collection_id, card_id, normal, foil)
  select p_collection, cid, sum(n), sum(f)
  from (
    select (e ->> 'card_id')::integer as cid,
           greatest(coalesce((e ->> 'normal')::integer, 0), 0) as n,
           greatest(coalesce((e ->> 'foil')::integer, 0), 0) as f
    from jsonb_array_elements(p_cards) e
  ) x
  group by cid
  having sum(n) + sum(f) > 0;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Turn sharing on (creating an invite code) or rotate the code.
create or replace function public.rotate_invite_code(p_collection uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not private.is_collection_owner(p_collection) then
    raise exception 'only the owner can change the invite code' using errcode = '42501';
  end if;

  loop
    v_code := upper(substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=0O1Il', ''), 1, 8));
    exit when length(v_code) = 8
      and not exists (select 1 from public.collections where invite_code = v_code);
  end loop;

  update public.collections set invite_code = v_code where id = p_collection;
  return v_code;
end;
$$;

create or replace function public.disable_invite_code(p_collection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_collection_owner(p_collection) then
    raise exception 'only the owner can change the invite code' using errcode = '42501';
  end if;
  update public.collections set invite_code = null where id = p_collection;
end;
$$;

-- Shared by join_collection and respond_to_invite.
create or replace function private.add_member(p_collection uuid, p_user uuid, p_merge boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_own uuid;
begin
  insert into public.collection_members (collection_id, user_id, role)
  values (p_collection, p_user, 'editor')
  on conflict do nothing;

  if p_merge then
    select id into v_own from public.collections where owner_id = p_user;
    if v_own is not null and v_own <> p_collection then
      insert into public.collection_cards as c (collection_id, card_id, normal, foil)
      select p_collection, card_id, normal, foil
      from public.collection_cards where collection_id = v_own
      on conflict (collection_id, card_id) do update
        set normal = c.normal + excluded.normal,
            foil = c.foil + excluded.foil,
            updated_at = now();
    end if;
  end if;

  update public.profiles set active_collection_id = p_collection where user_id = p_user;
end;
$$;

-- Join a shared collection by invite code. With p_merge, your own cards are
-- added to it (your own collection is left unchanged).
create or replace function public.join_collection(p_code text, p_merge boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  select id into v_collection from public.collections
  where invite_code = upper(trim(p_code));

  if v_collection is null then
    raise exception 'invalid invite code' using errcode = 'P0002';
  end if;

  perform private.add_member(v_collection, auth.uid(), p_merge);
  return v_collection;
end;
$$;

-- Leave a collection you were invited to. Your own collection becomes active.
create or replace function public.leave_collection(p_collection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_collection_owner(p_collection) then
    raise exception 'the owner cannot leave their own collection' using errcode = '42501';
  end if;

  delete from public.collection_members
  where collection_id = p_collection and user_id = auth.uid();

  update public.profiles p
  set active_collection_id = (select c.id from public.collections c where c.owner_id = auth.uid())
  where p.user_id = auth.uid() and p.active_collection_id is not distinct from p_collection;
end;
$$;

create or replace function public.remove_collection_member(p_collection uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_collection_owner(p_collection) then
    raise exception 'only the owner can remove members' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'the owner cannot remove themselves' using errcode = '42501';
  end if;

  delete from public.collection_members where collection_id = p_collection and user_id = p_user;

  update public.profiles p
  set active_collection_id = (select c.id from public.collections c where c.owner_id = p_user)
  where p.user_id = p_user and p.active_collection_id = p_collection;

  insert into public.notifications (user_id, kind, data)
  values (p_user, 'collection_removed', jsonb_build_object('collection_id', p_collection));
end;
$$;

create or replace function public.set_active_collection(p_collection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_collection_member(p_collection) then
    raise exception 'not a member of this collection' using errcode = '42501';
  end if;
  update public.profiles set active_collection_id = p_collection where user_id = auth.uid();
end;
$$;

create or replace function public.invite_to_collection(p_collection uuid, p_invitee uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite uuid;
  v_name text;
begin
  if not private.is_collection_member(p_collection) then
    raise exception 'not a member of this collection' using errcode = '42501';
  end if;
  if exists (select 1 from public.collection_members where collection_id = p_collection and user_id = p_invitee) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_invitee) then
    raise exception 'no such user' using errcode = 'P0002';
  end if;

  insert into public.collection_invites (collection_id, inviter_id, invitee_id)
  values (p_collection, auth.uid(), p_invitee)
  returning id into v_invite;

  select display_name into v_name from public.profiles where user_id = auth.uid();

  insert into public.notifications (user_id, kind, data)
  values (p_invitee, 'collection_invite', jsonb_build_object(
    'invite_id', v_invite,
    'collection_id', p_collection,
    'collection_name', (select name from public.collections where id = p_collection),
    'inviter_name', v_name
  ));

  return v_invite;
end;
$$;

create or replace function public.respond_to_invite(p_invite uuid, p_accept boolean, p_merge boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.collection_invites;
begin
  select * into v_inv from public.collection_invites where id = p_invite for update;

  if v_inv.id is null or v_inv.invitee_id <> auth.uid() then
    raise exception 'no such invite' using errcode = 'P0002';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'invite already answered' using errcode = '22023';
  end if;

  update public.collection_invites
  set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where id = p_invite;

  if p_accept then
    perform private.add_member(v_inv.collection_id, auth.uid(), p_merge);
  end if;

  insert into public.notifications (user_id, kind, data)
  values (v_inv.inviter_id, case when p_accept then 'invite_accepted' else 'invite_declined' end,
    jsonb_build_object(
      'collection_id', v_inv.collection_id,
      'invitee_name', (select display_name from public.profiles where user_id = auth.uid())
    ));
end;
$$;

create or replace function public.cancel_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.collection_invites i
  set status = 'cancelled', responded_at = now()
  where i.id = p_invite and i.status = 'pending'
    and (i.inviter_id = auth.uid() or private.is_collection_owner(i.collection_id));
  if not found then
    raise exception 'no such pending invite' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deck functions
-- ---------------------------------------------------------------------------

-- Replace a deck's cards. p_expected_version guards against a stale tab or
-- device overwriting newer changes: pass the version you loaded, get the new
-- one back. Raises LB409 on a mismatch.
create or replace function public.save_deck_cards(p_deck uuid, p_cards jsonb, p_expected_version integer default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  select version into v_version from public.decks
  where id = p_deck and owner_id = auth.uid()
  for update;

  if v_version is null then
    raise exception 'no such deck' using errcode = 'P0002';
  end if;
  if p_expected_version is not null and p_expected_version <> v_version then
    raise exception 'deck was changed elsewhere' using errcode = 'LB409';
  end if;

  delete from public.deck_cards where deck_id = p_deck;
  insert into public.deck_cards (deck_id, card_id, quantity)
  select p_deck, (e ->> 'card_id')::integer, sum((e ->> 'quantity')::integer)
  from jsonb_array_elements(p_cards) e
  group by 2
  having sum((e ->> 'quantity')::integer) > 0;

  update public.decks set version = version + 1 where id = p_deck
  returning version into v_version;
  return v_version;
end;
$$;

create or replace function public.create_deck(
  p_name text,
  p_description text default null,
  p_tags text[] default '{}',
  p_cards jsonb default '[]',
  p_avatar jsonb default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_deck uuid;
begin
  insert into public.decks (owner_id, name, description, tags, avatar)
  values (auth.uid(), p_name, p_description, coalesce(p_tags, '{}'), p_avatar)
  returning id into v_deck;

  insert into public.deck_cards (deck_id, card_id, quantity)
  select v_deck, (e ->> 'card_id')::integer, sum((e ->> 'quantity')::integer)
  from jsonb_array_elements(coalesce(p_cards, '[]')) e
  group by 2
  having sum((e ->> 'quantity')::integer) > 0;

  return v_deck;
end;
$$;

-- Decks with their cards, card count, inks and owner name, in one row each.
create view public.deck_details with (security_invoker = true) as
select
  d.id, d.owner_id, d.name, d.description, d.tags, d.avatar, d.is_public,
  d.version, d.created_at, d.updated_at,
  p.display_name as owner_name,
  coalesce(c.cards, '[]'::jsonb) as cards,
  coalesce(c.card_count, 0)::integer as card_count,
  coalesce(c.inks, '{}'::text[]) as inks
from public.decks d
left join public.profiles p on p.user_id = d.owner_id
left join lateral (
  select
    jsonb_agg(jsonb_build_object('card_id', dc.card_id, 'quantity', dc.quantity) order by dc.card_id) as cards,
    sum(dc.quantity) as card_count,
    (select array_agg(distinct ink order by ink)
       from public.deck_cards dc2
       join public.cards k on k.id = dc2.card_id, unnest(k.inks) ink
       where dc2.deck_id = d.id) as inks
  from public.deck_cards dc
  where dc.deck_id = d.id
) c on true;

-- Public deck search. Every filter is optional; inks match decks whose inks
-- are all within p_inks.
create or replace function public.search_public_decks(
  p_search text default null,
  p_inks text[] default null,
  p_tags text[] default null,
  p_owner uuid default null,
  p_offset integer default 0,
  p_limit integer default 50
)
returns setof public.deck_details
language sql
stable
set search_path = ''
as $$
  select *
  from public.deck_details d
  where d.is_public
    and (p_owner is null or d.owner_id = p_owner)
    and (p_inks is null or d.inks <@ p_inks)
    and (p_tags is null or d.tags && p_tags)
    and (
      p_search is null or p_search = ''
      or d.name ilike '%' || p_search || '%'
      or d.description ilike '%' || p_search || '%'
      or d.owner_name ilike '%' || p_search || '%'
      or exists (select 1 from unnest(d.tags) t where t ilike '%' || p_search || '%')
    )
  order by d.updated_at desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- Binder functions
-- ---------------------------------------------------------------------------

-- Replace a custom binder's cards, in order. Same version guard as decks.
-- p_cards: [{"card_id", "quantity"}] in display order.
create or replace function public.save_binder_cards(p_binder uuid, p_cards jsonb, p_expected_version integer default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  select version into v_version from public.binders
  where id = p_binder and owner_id = auth.uid() and kind = 'custom'
  for update;

  if v_version is null then
    raise exception 'no such binder' using errcode = 'P0002';
  end if;
  if p_expected_version is not null and p_expected_version <> v_version then
    raise exception 'binder was changed elsewhere' using errcode = 'LB409';
  end if;

  delete from public.binder_cards where binder_id = p_binder;
  insert into public.binder_cards (binder_id, card_id, position, quantity)
  select p_binder, cid, min(pos), sum(q)
  from (
    select (e ->> 'card_id')::integer as cid, (e ->> 'quantity')::integer as q, ord as pos
    from jsonb_array_elements(p_cards) with ordinality as t(e, ord)
  ) x
  group by cid
  having sum(q) > 0;

  update public.binders set version = version + 1 where id = p_binder
  returning version into v_version;
  return v_version;
end;
$$;

-- Everything needed to show a binder you may see: the binder, its owner, its
-- cards (custom binders) and the owner's quantities for just the cards the
-- binder shows. Nothing else of the owner's collection is exposed.
create or replace function public.get_binder_view(p_binder uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_binder public.binders;
  v_collection uuid;
begin
  select * into v_binder from public.binders where id = p_binder;

  if v_binder.id is null or not (v_binder.is_public or v_binder.owner_id = auth.uid()) then
    return null;
  end if;

  select active_collection_id into v_collection from public.profiles where user_id = v_binder.owner_id;

  return jsonb_build_object(
    'binder', to_jsonb(v_binder),
    'owner', (select jsonb_build_object('user_id', p.user_id, 'display_name', p.display_name)
              from public.profiles p where p.user_id = v_binder.owner_id),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object('card_id', bc.card_id, 'quantity', bc.quantity) order by bc.position)
      from public.binder_cards bc where bc.binder_id = p_binder
    ), '[]'::jsonb),
    'owned', coalesce((
      select jsonb_agg(jsonb_build_object('card_id', cc.card_id, 'normal', cc.normal, 'foil', cc.foil))
      from public.collection_cards cc
      join public.cards k on k.id = cc.card_id
      where cc.collection_id = v_collection
        and (
          (v_binder.kind = 'set' and k.set_code = v_binder.set_code)
          or (v_binder.kind = 'custom' and exists (
            select 1 from public.binder_cards bc where bc.binder_id = p_binder and bc.card_id = cc.card_id
          ))
        )
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: nothing for anonymous callers except read-only views.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated, anon;
grant execute on function private.is_collection_member(uuid) to authenticated, anon;
grant execute on function private.is_collection_owner(uuid) to authenticated, anon;
grant execute on function private.shares_collection_with(uuid) to authenticated, anon;

revoke execute on function
  public.adjust_collection_cards(uuid, jsonb),
  public.replace_collection_cards(uuid, jsonb),
  public.rotate_invite_code(uuid),
  public.disable_invite_code(uuid),
  public.join_collection(text, boolean),
  public.leave_collection(uuid),
  public.remove_collection_member(uuid, uuid),
  public.set_active_collection(uuid),
  public.invite_to_collection(uuid, uuid),
  public.respond_to_invite(uuid, boolean, boolean),
  public.cancel_invite(uuid),
  public.save_deck_cards(uuid, jsonb, integer),
  public.create_deck(text, text, text[], jsonb, jsonb),
  public.save_binder_cards(uuid, jsonb, integer)
from public, anon;

grant execute on function
  public.adjust_collection_cards(uuid, jsonb),
  public.replace_collection_cards(uuid, jsonb),
  public.rotate_invite_code(uuid),
  public.disable_invite_code(uuid),
  public.join_collection(text, boolean),
  public.leave_collection(uuid),
  public.remove_collection_member(uuid, uuid),
  public.set_active_collection(uuid),
  public.invite_to_collection(uuid, uuid),
  public.respond_to_invite(uuid, boolean, boolean),
  public.cancel_invite(uuid),
  public.save_deck_cards(uuid, jsonb, integer),
  public.create_deck(text, text, text[], jsonb, jsonb),
  public.save_binder_cards(uuid, jsonb, integer)
to authenticated;

grant execute on function public.search_public_decks(text, text[], text[], uuid, integer, integer) to anon, authenticated;
grant execute on function public.get_binder_view(uuid) to anon, authenticated;
