# Lorebook

A Disney Lorcana collection and deck manager: browse cards, track a collection (normal and foil, shared with a household if you like), build decks, and share binders and decks.

React and TypeScript on the front, Supabase (Postgres with row level security) behind it.

## Running it locally

Needs Node and either Docker or rootless podman (the scripts use podman's socket when Docker isn't installed).

```bash
npm install
cp .env.example .env.local     # local stack keys; change the host to reach it from another machine
npm run db:start               # local Supabase: Postgres, auth, API
npm run cards                  # fetch LorcanaJSON, build public/data, load the card catalogue
npm start                      # http://localhost:3000
```

Local sign-up needs no email confirmation. Mail the stack sends (password resets) shows up in Mailpit at http://localhost:54324.

## Database

The schema lives in `supabase/migrations`. To change it, add a migration, then:

```bash
npm run db:reset    # rebuild the local database from the migrations and reload the cards
npm run db:test     # row level security and function tests (supabase/tests)
npm run db:types    # regenerate src/lib/database.types.ts
```

All database access in the app goes through `src/lib/api.ts`.

## Card data

`npm run cards` downloads LorcanaJSON, keeps only the fields the app uses and writes a content-hashed file to `public/data/`, plus the small catalogue table the database needs. Neither is committed. Run it again when a new set comes out. Card legality (Core, Infinity) comes from the data, so rotations and bans need no code change.

Card data comes from [LorcanaJSON](https://lorcanajson.org) and is used under Ravensburger's Community Code Policy. Lorebook is not affiliated with or endorsed by Disney or Ravensburger.
