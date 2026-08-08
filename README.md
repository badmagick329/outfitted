# Outfitted

Private, multi-user wardrobe management with local image storage and AI-assisted garment details.

## Local development

1. Copy `.env.example` to `.env`. Set `NEXTAUTH_SECRET`, Google OAuth credentials, and an OpenAI API key.
2. Start PostgreSQL only: `docker compose up -d`.
3. Wait for `docker compose ps` to show `healthy`, then apply migrations: `bun run db:migrate`.
4. In one terminal run the web app: `bun dev`.
5. In a second terminal run the AI worker: `bun run worker`.

The application and worker run directly through Bun for fast local reloads. Docker is deliberately limited to PostgreSQL during development.

## Commands

- `docker compose up -d` / `docker compose down` — manage local PostgreSQL
- `bun run db:generate` — create a migration after schema changes
- `bun run db:migrate` — apply committed migrations
- `bun run worker` — run the asynchronous AI processor
- `bun run lint` / `bun run build` — validate the app
