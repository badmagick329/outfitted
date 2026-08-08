# Outfitted

Private, multi-user wardrobe management with local image storage and AI-assisted garment details.

## Local setup

1. Copy `.env.example` to `.env`. Set a long `NEXTAUTH_SECRET`, Google OAuth credentials, and an OpenAI API key.
2. In Google Cloud Console, create a web OAuth client and add `http://localhost:3000/api/auth/callback/google` as its local redirect URI. Add the production equivalent before deploying.
3. To run the full container stack, use `docker compose up --build`. PostgreSQL migrations run before the web and worker containers start.

For normal local development, start PostgreSQL only with `docker compose up -d db`. Keep the `localhost` database URL from `.env.example`, run `bun run db:migrate` once, then use `bun dev` and `bun run worker` in separate terminals. PostgreSQL is exposed locally on port 5432; the app and worker hot-reload locally while Docker supplies only the database.

## Production

Set the same environment values in Dockploy, attach durable Docker volumes, and put the web service behind HTTPS. `NEXTAUTH_URL` must be the public HTTPS URL and Google must list its `/api/auth/callback/google` callback. The image volume contains only optimized WebP inventory images; back it up together with PostgreSQL.

## Commands

- `bun run db:generate` — create a migration after schema changes
- `bun run db:migrate` — apply committed migrations
- `bun run worker` — run the asynchronous AI processor
- `bun run lint` / `bun run build` — validate the app
