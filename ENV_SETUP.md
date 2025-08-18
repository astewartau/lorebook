# Environment Setup

This project uses environment variables to configure different environments.

## Local Development

```bash
npm run local
```
Uses `.env.local` (already configured with local Supabase)

## Development Database

```bash
npm run dev  
```
Uses `.env.development` (configured with dev Supabase)

## Production Database (Testing Locally)

```bash
npm run prod
```
Uses `.env.production` (configured with production Supabase)

## Setup Instructions

1. Copy `.env.example` to create your environment files:
```bash
cp .env.example .env.local
cp .env.example .env.development  
cp .env.example .env.production
```

2. Fill in the appropriate Supabase URL and anon key for each environment

## Environment Files

- `.env.local` - Local Supabase instance
- `.env.development` - Development Supabase instance
- `.env.production` - Production Supabase instance
- `.env.example` - Template file (committed to repo)

## Note on Security

The keys in these files are **anon (public) keys**, not secret keys. They are:
- Safe to commit to version control
- Already exposed in your deployed app
- Protected by Row Level Security (RLS) policies

GitGuardian may flag these, but they are not security risks. However, **never commit**:
- Service role keys
- JWT secrets
- Database passwords
- Admin keys