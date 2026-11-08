-- Decks get a long-form guide written in Markdown, separate from the short
-- description shown on deck tiles.

alter table public.decks
  add column guide text check (char_length(guide) <= 20000);

grant update (guide) on public.decks to authenticated;

-- Views fix their column list when created, so recreate it with the guide.
drop function public.search_public_decks(text, text[], text[], uuid, integer, integer);
drop view public.deck_details;

create view public.deck_details with (security_invoker = true) as
select
  d.id, d.owner_id, d.name, d.description, d.guide, d.tags, d.avatar, d.is_public,
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

-- Search also looks in guides.
create function public.search_public_decks(
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
      or d.guide ilike '%' || p_search || '%'
      or d.owner_name ilike '%' || p_search || '%'
      or exists (select 1 from unnest(d.tags) t where t ilike '%' || p_search || '%')
    )
  order by d.updated_at desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.search_public_decks(text, text[], text[], uuid, integer, integer) to anon, authenticated;
grant select on public.deck_details to anon, authenticated;
