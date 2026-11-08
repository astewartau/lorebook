# Frontend guide

How the app is put together and how new pages should look. The card browser (`src/features/cards`) is the reference implementation: copy its patterns.

## Layout

- `src/app`: the shell (top bar, phone tab bar, footer), routes, theme, query client, sign-in.
- `src/ui`: shared building blocks. Use these before writing new ones:
  - `Dialog` (centred modal, bottom sheet on phones), `Sheet` (side panel, full screen on phones), `Menu` / `MenuItem` (popover menus);
  - `PageLoading`, `PageMessage` (empty, error, not found), `Spinner`;
  - `CardAvatar` (round crop of card art), `InkIcon`, `InkIcons`, `RarityIcon`, `InkableIcon`, `CardRulesText`, `SymbolText` (card text with game symbols).
- `src/features/<area>`: one folder per area (cards, decks, collection, community, account). Pages are the default export of `*Page.tsx`, routed in `src/app/routes.tsx`. Pure logic goes in `.ts` modules next to them, with `.test.ts` files.
- `src/features/cards` also exports pieces other pages reuse: `FilterRail`, `SearchBox`, `CardResults` (virtualized grid, grouped and list views), `CardTile` with `TileAction` (tap and stepper behaviour), `filterCards` / `sortCards` / `groupCards`, `useOwnership`, `CardDetail`.

## Look

- Dark by default (follows the system), with a light theme. Never hard-code colours: use the tokens in `tailwind.config.cjs` / `src/styles.css`: `bg`, `surface`, `surface-2`, `surface-3`, `line` (borders), `fg` (text), `muted`, `accent` (gold text and links), `accent-fill` (gold fills), `on-accent`, `danger`, `success`, and `ink-<colour>` for the six inks. Check both themes.
- Classes in `styles.css`: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-sm`, `icon-btn`, `input`, `panel`, `chip` (with `aria-pressed`), `label` (small uppercase section heading).
- Type: Inter for everything; `font-display` (Fraunces) only for page titles, card names and section titles.
- Page width `mx-auto max-w-[1600px] px-4` (or narrower, e.g. `max-w-5xl`, for reading pages). Page title: `font-display text-3xl font-semibold`.
- Rounded corners `rounded-lg` / `rounded-xl`, thin `border-line` borders, soft shadows (`shadow-card`, `shadow-pop`). No decorative shapes, gradients or art-deco corners. Card art is the colour; the chrome stays quiet.
- Card images keep the card's own shape: `aspect-card rounded-[4.6%/3.3%]`.
- Phones first: the phone tab bar covers the bottom 64 px (the shell already pads for it). Touch targets at least 36 px, ideally 40+. No horizontal page scroll.
- Accessibility: real `<button>`s and `<a>`s, labels on icon-only buttons, Escape closes overlays (the primitives do this), visible focus (global `:focus-visible`), text contrast in both themes.

## Data

- All database access goes through `src/lib/api.ts`. Add functions there rather than calling `supabase` from components.
- Server data (decks, binders, profiles, households, notifications) uses TanStack Query (`useQuery`, `useMutation`) with keys from `keys` in `src/app/queryClient.ts`. Invalidate those keys after mutations.
- The signed-in user's collection is the exception: `useCollection()` (`src/contexts/CollectionContext.tsx`) holds it, applies edits instantly and syncs them through an outbox. Read quantities with `getCardQuantity` or `useOwnership`.
- Card data: `useCardData()` gives `allCards`, `getCard(id)`, `cardsById`, sets.
- Deck rules: `validateDeck`, `maxCopiesFor`, `copiesByName`, `inksOf` in `src/utils/deckValidation.ts`.
- Decks and custom binders save their cards with a version number (`saveDeckCards`, `saveBinderCards`); on `ApiError.isVersionConflict` reload instead of overwriting.
- The schema is in `supabase/migrations`. Don't change it without saying why; if a page needs a schema change, add a new migration and a test in `supabase/tests`.

## Checks

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
```
