-- Comments on decks. Anyone signed in can comment on a public deck (and on
-- their own decks); authors edit or delete their comments; deck owners can
-- remove any comment on their deck. The deck owner is notified.

create table public.deck_comments (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index deck_comments_deck_idx on public.deck_comments (deck_id, created_at);

alter table public.deck_comments enable row level security;

create policy "Comments on decks you can see" on public.deck_comments
  for select using (exists (
    select 1 from public.decks d where d.id = deck_id and (d.is_public or d.owner_id = auth.uid())
  ));
create policy "Comment as yourself on decks you can see" on public.deck_comments
  for insert with check (
    author_id = auth.uid() and exists (
      select 1 from public.decks d where d.id = deck_id and (d.is_public or d.owner_id = auth.uid())
    )
  );
create policy "Edit your own comments" on public.deck_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Delete your comments, or any on your deck" on public.deck_comments
  for delete using (
    author_id = auth.uid()
    or exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = auth.uid())
  );

revoke insert, update, delete on public.deck_comments from anon;
revoke update on public.deck_comments from authenticated;
grant update (body) on public.deck_comments to authenticated;

create or replace function private.comment_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger deck_comments_touch before update on public.deck_comments
  for each row execute function private.comment_touch();

-- Tell the deck's owner about comments from other people.
create or replace function private.notify_deck_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name text;
begin
  select owner_id, name into v_owner, v_name from public.decks where id = new.deck_id;
  if v_owner is not null and v_owner <> new.author_id then
    insert into public.notifications (user_id, kind, data)
    values (v_owner, 'deck_comment', jsonb_build_object(
      'deck_id', new.deck_id,
      'deck_name', v_name,
      'comment_id', new.id,
      'author_name', (select display_name from public.profiles where user_id = new.author_id)
    ));
  end if;
  return new;
end;
$$;

create trigger deck_comments_notify after insert on public.deck_comments
  for each row execute function private.notify_deck_comment();
