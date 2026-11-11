-- One-off: convert the original Lorebook data (moved into the `legacy`
-- schema) into the current schema. Safe to run more than once. Card ids are
-- LorcanaJSON ids in both, so they carry over; unknown ids are skipped.
--
-- Run after the current migrations and after the card catalogue is loaded.

begin;

-- Profiles for every account, taking the old profile where there was one.
insert into public.profiles as p (user_id, display_name, full_name, location, bio, avatar_card_id, avatar_crop, is_public, created_at, updated_at)
select
  u.id,
  left(coalesce(
    nullif(trim(lp.display_name), ''),
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1),
    'Player'
  ), 50),
  left(nullif(trim(lp.full_name), ''), 100),
  left(nullif(trim(lp.location), ''), 100),
  left(nullif(trim(lp.bio), ''), 1000),
  (select k.id from public.cards k where k.id = lp.avatar_card_id),
  lp.avatar_crop_data,
  coalesce(lp.is_public, true),
  coalesce(lp.created_at, u.created_at),
  coalesce(lp.updated_at, u.created_at)
from auth.users u
left join legacy.user_profiles lp on lp.user_id = u.id
on conflict (user_id) do update set
  display_name = excluded.display_name,
  full_name = coalesce(excluded.full_name, p.full_name),
  location = coalesce(excluded.location, p.location),
  bio = coalesce(excluded.bio, p.bio),
  avatar_card_id = coalesce(excluded.avatar_card_id, p.avatar_card_id),
  avatar_crop = coalesce(excluded.avatar_crop, p.avatar_crop),
  is_public = excluded.is_public,
  created_at = least(excluded.created_at, p.created_at);

-- Everyone owns one collection.
insert into public.collections (owner_id)
select p.user_id from public.profiles p
where not exists (select 1 from public.collections c where c.owner_id = p.user_id);

insert into public.collection_members (collection_id, user_id, role)
select c.id, c.owner_id, 'owner' from public.collections c
on conflict do nothing;

update public.profiles p set active_collection_id = c.id
from public.collections c
where c.owner_id = p.user_id and p.active_collection_id is null;

-- Collection rows were stored under the owner of the collection in use (the
-- group owner for group members), so they belong to that owner's collection.
insert into public.collection_cards (collection_id, card_id, normal, foil, updated_at)
select c.id, uc.card_id,
  sum(greatest(coalesce(uc.quantity_normal, 0), 0)),
  sum(greatest(coalesce(uc.quantity_foil, 0), 0)),
  max(coalesce(uc.updated_at, uc.created_at, now()))
from legacy.user_collections uc
join public.collections c on c.owner_id = uc.user_id
join public.cards k on k.id = uc.card_id
group by c.id, uc.card_id
having sum(greatest(coalesce(uc.quantity_normal, 0), 0)) + sum(greatest(coalesce(uc.quantity_foil, 0), 0)) > 0
on conflict (collection_id, card_id) do update set normal = excluded.normal, foil = excluded.foil;

-- Groups become households: the owner's collection, shared, with the same
-- name and invite code; members use it.
update public.collections c
set name = left(coalesce(nullif(trim(g.name), ''), c.name), 60), invite_code = g.invite_code
from legacy.collection_groups g
where g.owner_id = c.owner_id;

insert into public.collection_members (collection_id, user_id, role, joined_at)
select c.id, m.user_id, 'editor', coalesce(m.joined_at, now())
from legacy.collection_group_members m
join legacy.collection_groups g on g.id = m.group_id
join public.collections c on c.owner_id = g.owner_id
where m.user_id <> g.owner_id
  and exists (select 1 from public.profiles p where p.user_id = m.user_id)
on conflict do nothing;

update public.profiles p set active_collection_id = c.id
from legacy.collection_group_members m
join legacy.collection_groups g on g.id = m.group_id
join public.collections c on c.owner_id = g.owner_id
where p.user_id = m.user_id and m.user_id <> g.owner_id;

-- Decks keep their ids, so old links still work.
insert into public.decks (id, owner_id, name, description, tags, avatar, is_public, created_at, updated_at)
select d.id, d.user_id,
  left(coalesce(nullif(trim(d.name), ''), 'Untitled deck'), 100),
  left(nullif(trim(d.description), ''), 5000),
  coalesce(d.tags, '{}'),
  d.avatar,
  coalesce(d.is_public, false),
  coalesce(d.created_at, now()),
  coalesce(d.updated_at, d.created_at, now())
from legacy.user_decks d
where exists (select 1 from public.profiles p where p.user_id = d.user_id)
on conflict (id) do nothing;

-- Old deck cards were {cardId, quantity}, or occasionally a whole card with `id`.
insert into public.deck_cards (deck_id, card_id, quantity)
select d.id, x.cid, least(sum(x.q), 99)
from legacy.user_decks d
cross join lateral (
  select coalesce((e ->> 'cardId')::integer, (e ->> 'id')::integer) as cid,
         coalesce((e ->> 'quantity')::integer, 0) as q
  from jsonb_array_elements(coalesce(d.cards, '[]'::jsonb)) e
) x
join public.cards k on k.id = x.cid
where exists (select 1 from public.decks nd where nd.id = d.id)
group by d.id, x.cid
having sum(x.q) > 0
on conflict do nothing;

-- Binders keep their ids too (shared links). One set binder per owner and set.
insert into public.binders (id, owner_id, kind, set_code, name, description, is_public, created_at, updated_at)
select distinct on (b.user_id, coalesce(b.set_code, b.id::text))
  b.id, b.user_id, b.binder_type,
  case when b.binder_type = 'set' then b.set_code end,
  left(coalesce(nullif(trim(b.name), ''), 'Binder'), 100),
  left(nullif(trim(b.description), ''), 2000),
  coalesce(b.is_public, false),
  coalesce(b.created_at, now()),
  coalesce(b.updated_at, b.created_at, now())
from legacy.user_binders b
where (b.binder_type = 'custom' or (b.binder_type = 'set' and b.set_code is not null))
  and exists (select 1 from public.profiles p where p.user_id = b.user_id)
order by b.user_id, coalesce(b.set_code, b.id::text), b.updated_at desc
on conflict do nothing;

insert into public.binder_cards (binder_id, card_id, position, quantity)
select b.id, x.cid, min(x.pos), least(sum(x.q), 99)
from legacy.user_binders b
cross join lateral (
  select coalesce((e ->> 'cardId')::integer, (e ->> 'id')::integer) as cid,
         coalesce((e ->> 'quantity')::integer, 1) as q, ord as pos
  from jsonb_array_elements(coalesce(b.cards, '[]'::jsonb)) with ordinality t(e, ord)
) x
join public.cards k on k.id = x.cid
where b.binder_type = 'custom' and exists (select 1 from public.binders nb where nb.id = b.id)
group by b.id, x.cid
having sum(x.q) > 0
on conflict do nothing;

commit;
