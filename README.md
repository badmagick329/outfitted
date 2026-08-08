# Outfitted

Private, multi-user wardrobe management with local image storage and AI-assisted garment details.

## Local setup

1. Copy `.env.example` to `.env`. Set a long `AUTH_SECRET`, Google OAuth credentials, and an OpenAI API key.
2. In Google Cloud Console, create a web OAuth client and add `http://localhost:3000/api/auth/callback/google` as its local redirect URI. Add the production equivalent before deploying.
3. Start the stack with `docker compose up --build`. PostgreSQL migrations run before the web and worker containers start.

For app-only development, run PostgreSQL with Docker, set `DATABASE_URL` to your local database, run `bun run db:migrate`, then use `bun dev` and `bun run worker` in separate terminals.

## Production

Set the same environment values in Dockploy, attach durable Docker volumes, and put the web service behind HTTPS. `AUTH_URL` must be the public HTTPS URL and Google must list its `/api/auth/callback/google` callback. The image volume contains only optimized WebP inventory images; back it up together with PostgreSQL.

## Commands

- `bun run db:generate` — create a migration after schema changes
- `bun run db:migrate` — apply committed migrations
- `bun run worker` — run the asynchronous AI processor
- `bun run lint` / `bun run build` — validate the app
