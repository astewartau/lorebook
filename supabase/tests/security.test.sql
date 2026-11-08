-- Row level security and function checks. Run with: npx supabase test db
-- Alice owns a collection she shares with Bob. Mallory is a stranger who
-- tries the attacks the previous schema allowed.

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Card catalogue rows the tests use (the real catalogue is synced separately).
insert into public.cards (id, set_code, number, full_name, inks) values
  (900001, 'T', 1, 'Test - One', '{Amber}'),
  (900002, 'T', 2, 'Test - Two', '{Steel}'),
  (900003, 'U', 1, 'Other - Three', '{Ruby}')
on conflict (id) do nothing;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'mallory@example.com', '{}');

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;
create function pg_temp.as_admin() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- Sign-up creates a profile, a collection and an owner membership.
select is((select display_name from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'), 'Alice', 'display name from metadata');
select is((select display_name from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'), 'bob', 'display name from email');
select is((select count(*)::int from public.collections), 3, 'one collection per user');
select ok((select active_collection_id is not null from public.profiles where user_id = '00000000-0000-0000-0000-00000000000c'), 'active collection set');

create temp table ids as
select
  (select id from public.collections where owner_id = '00000000-0000-0000-0000-00000000000a') as alice_col,
  (select id from public.collections where owner_id = '00000000-0000-0000-0000-00000000000b') as bob_col,
  (select id from public.collections where owner_id = '00000000-0000-0000-0000-00000000000c') as mallory_col;
grant select on ids to authenticated, anon;

-- Alice adds cards; deltas accumulate and clamp at zero.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.adjust_collection_cards((select alice_col from ids),
  '[{"card_id":900001,"normal":2},{"card_id":900001,"normal":1,"foil":1},{"card_id":900003,"normal":1}]') $$, 'alice adjusts her collection');
select is((select normal from public.collection_cards where card_id = 900001), 3, 'deltas add up');
select lives_ok($$ select public.adjust_collection_cards((select alice_col from ids), '[{"card_id":900003,"normal":-5}]') $$, 'removing more than owned');
select is((select count(*)::int from public.collection_cards where card_id = 900003), 0, 'row removed at zero');

-- Alice shares her collection with an invite code.
create temp table code as select public.rotate_invite_code((select alice_col from ids)) as code;
grant select on code to authenticated;
select is(length((select code from code)), 8, 'invite code generated');

-- Bob joins by code and merges his own cards in.
select pg_temp.as_admin();
insert into public.collection_cards (collection_id, card_id, normal) values ((select bob_col from ids), 900002, 4);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.join_collection((select code from code), true) $$, 'bob joins by code');
select is((select normal from public.collection_cards where collection_id = (select alice_col from ids) and card_id = 900002), 4, 'bob''s cards merged in');
select is((select active_collection_id from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'), (select alice_col from ids), 'shared collection active for bob');
select lives_ok($$ select public.adjust_collection_cards((select alice_col from ids), '[{"card_id":900001,"normal":1}]') $$, 'bob edits the shared collection');
select is((select display_name from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'), 'Alice', 'bob sees alice''s profile');

-- Mallory: every attack on the shared collection fails.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.collection_cards where collection_id = (select alice_col from ids)), 0, 'mallory cannot read alice''s cards');
select is((select count(*)::int from public.collections where id = (select alice_col from ids)), 0, 'mallory cannot see alice''s collection');
select throws_ok($$ select public.adjust_collection_cards((select alice_col from ids), '[{"card_id":900001,"normal":-99}]') $$, '42501', NULL, 'mallory cannot change alice''s cards');
select throws_ok($$ insert into public.collection_cards (collection_id, card_id, normal) values ((select alice_col from ids), 900002, 1) $$, '42501', NULL, 'mallory cannot insert into alice''s collection');
select throws_ok($$ insert into public.collection_members (collection_id, user_id, role) values ((select alice_col from ids), '00000000-0000-0000-0000-00000000000c', 'owner') $$, '42501', NULL, 'mallory cannot add herself as a member');
select throws_ok($$ insert into public.notifications (user_id, kind, data) values ('00000000-0000-0000-0000-00000000000a', 'collection_invite', '{}') $$, '42501', NULL, 'mallory cannot forge notifications');
select throws_ok($$ select public.rotate_invite_code((select alice_col from ids)) $$, '42501', NULL, 'mallory cannot rotate alice''s code');
select throws_ok($$ select public.remove_collection_member((select alice_col from ids), '00000000-0000-0000-0000-00000000000b') $$, '42501', NULL, 'mallory cannot remove bob');
select throws_ok($$ update public.profiles set active_collection_id = (select alice_col from ids) where user_id = '00000000-0000-0000-0000-00000000000c' $$, '42501', NULL, 'mallory cannot point her profile at alice''s collection');
select throws_ok($$ select public.join_collection('WRONGCOD') $$, 'P0002', NULL, 'wrong invite code refused');

-- Mallory invites Bob to her collection; only Bob can answer it.
select lives_ok($$ select public.invite_to_collection((select mallory_col from ids), '00000000-0000-0000-0000-00000000000b') $$, 'mallory invites bob');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.respond_to_invite((select id from public.collection_invites limit 1), true) $$, 'P0002', NULL, 'alice cannot answer bob''s invite');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.notifications where kind = 'collection_invite'), 1, 'bob got the invite notification');

-- Decks: private decks stay private; stale saves are refused.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table deck as select public.create_deck('Alice deck', null, '{aggro}', '[{"card_id":900001,"quantity":4}]') as id;
grant select on deck to authenticated, anon;
select is(public.save_deck_cards((select id from deck), '[{"card_id":900002,"quantity":2}]', 1), 2, 'save with current version');
select throws_ok($$ select public.save_deck_cards((select id from deck), '[]', 1) $$, 'LB409', NULL, 'stale version refused');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.deck_details where id = (select id from deck)), 0, 'private deck hidden from mallory');

-- Public binder exposes only the cards it shows.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.binders (owner_id, kind, set_code, name, is_public)
values ('00000000-0000-0000-0000-00000000000a', 'set', 'T', 'Set T', true);
select pg_temp.as_admin();
insert into public.collection_cards (collection_id, card_id, normal) values ((select alice_col from ids), 900003, 1);
select pg_temp.as_anon();
select is(
  (select jsonb_array_length(public.get_binder_view((select id from public.binders limit 1)) -> 'owned')),
  2, 'binder shows only set T cards (not set U)'
);
select is((select count(*)::int from public.collection_cards), 0, 'anonymous users read no collection rows');

select * from finish();
rollback;
