FROM oven/bun:1.2 AS dependencies
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY . .
# Next 16 currently fails during a Linux production build under Bun 1.2.
# Use Node for Next's build and web server; Bun remains available for the
# worker and Drizzle migration commands in the final image.
RUN node node_modules/next/dist/bin/next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# The worker and migration command run TypeScript directly, while the web
# service uses Next's standalone server. Keeping both in this release image
# means every service runs the same application version.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=dependencies /usr/local/bin/bun /usr/local/bin/bun

EXPOSE 3000
# Docker injects the container ID as HOSTNAME. Next's standalone server uses
# that value as its listen address unless it is overridden, which leaves
# localhost health checks unable to connect. Bind explicitly to all interfaces.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
