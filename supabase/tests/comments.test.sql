-- Deck comments: who can read, write, edit and delete. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'owner@example.com', '{"display_name":"Owner"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'fan@example.com', '{"display_name":"Fan"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'troll@example.com', '{"display_name":"Troll"}');

insert into public.decks (id, owner_id, name, is_public) values
  ('00000000-0000-0000-0000-00000000de01', '00000000-0000-0000-0000-0000000000d1', 'Public deck', true),
  ('00000000-0000-0000-0000-00000000de02', '00000000-0000-0000-0000-0000000000d1', 'Private deck', false);

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select lives_ok($$ insert into public.deck_comments (deck_id, author_id, body) values
  ('00000000-0000-0000-0000-00000000de01', '00000000-0000-0000-0000-0000000000d2', 'Love the curve') $$, 'fan comments on a public deck');
select throws_ok($$ insert into public.deck_comments (deck_id, author_id, body) values
  ('00000000-0000-0000-0000-00000000de02', '00000000-0000-0000-0000-0000000000d2', 'Sneaky') $$, '42501', NULL, 'no comments on a private deck');
select throws_ok($$ insert into public.deck_comments (deck_id, author_id, body) values
  ('00000000-0000-0000-0000-00000000de01', '00000000-0000-0000-0000-0000000000d1', 'Impersonating') $$, '42501', NULL, 'cannot comment as someone else');
select throws_ok($$ insert into public.deck_comments (deck_id, author_id, body) values
  ('00000000-0000-0000-0000-00000000de01', '00000000-0000-0000-0000-0000000000d2', '   ') $$, '23514', NULL, 'empty comments refused');
update public.deck_comments set body = 'Love the curve!' where author_id = '00000000-0000-0000-0000-0000000000d2';
select ok((select edited_at is not null from public.deck_comments where author_id = '00000000-0000-0000-0000-0000000000d2'), 'editing marks the comment edited');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select lives_ok($$ insert into public.deck_comments (deck_id, author_id, body) values
  ('00000000-0000-0000-0000-00000000de01', '00000000-0000-0000-0000-0000000000d3', 'Bad deck') $$, 'troll comments');
update public.deck_comments set body = 'Defaced' where author_id = '00000000-0000-0000-0000-0000000000d2';
delete from public.deck_comments where author_id = '00000000-0000-0000-0000-0000000000d2';
select is((select body from public.deck_comments where author_id = '00000000-0000-0000-0000-0000000000d2'), 'Love the curve!', 'others cannot edit or delete your comment');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from public.notifications where kind = 'deck_comment'), 2, 'owner notified of both comments');
delete from public.deck_comments where author_id = '00000000-0000-0000-0000-0000000000d3';
select is((select count(*)::int from public.deck_comments where deck_id = '00000000-0000-0000-0000-00000000de01'), 1, 'owner removes a comment on their deck');

select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.deck_comments where deck_id = '00000000-0000-0000-0000-00000000de01'), 1, 'anyone can read comments on a public deck');
select throws_ok($$ insert into public.deck_comments (deck_id, author_id, body) values
  ('00000000-0000-0000-0000-00000000de01', '00000000-0000-0000-0000-0000000000d2', 'anon') $$, '42501', NULL, 'signed-out users cannot comment');

select * from finish();
rollback;
