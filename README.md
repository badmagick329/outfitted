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

- `docker compose up -d` / `docker compose down`: manage local PostgreSQL
- `bun run db:generate`: create a migration after schema changes
- `bun run db:migrate`: apply committed migrations
- `bun run worker`: run the asynchronous AI processor
- `bun run maintenance:normalize-wardrobe`: preview safe metadata cleanup; add `--apply` to write it
- `bun run lint` / `bun run build`: validate the app

Existing records are not rewritten during deployment. Run the maintenance command explicitly when
you want safe whitespace, empty-value, case-only duplicate, and already-controlled-value cleanup.

## Discord notifications

Outfitted can post a message when a member creates an account and when a member adds their first
garment. This is optional and stays disabled unless `DISCORD_WEBHOOK_URL` is set.

1. Create a webhook in the target channel under Server Settings → Integrations, then copy its URL
   ([official guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)).
2. In production, set `DISCORD_WEBHOOK_URL` in Dokploy. Also give the worker `NEXTAUTH_URL` so
   messages can link to the admin member page.
3. For local development, set it in `.env`.
4. Restart the web and worker processes after changing it.
