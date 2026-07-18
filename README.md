# NexCup

## Netlify setup

This app can use local SQLite for development, but Netlify must use a hosted PostgreSQL database. Do not use a local SQLite `file:` database URL in Netlify.

Add these environment variables in Netlify before deploying:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
AUTH_SECRET="use-a-random-secret-with-at-least-32-characters"
SEED_ADMIN_EMAIL="admin@nexcup.gg"
SEED_ADMIN_PASSWORD="use-a-strong-admin-password"
```

The Netlify build command is configured in `netlify.toml`. It creates/updates the Prisma schema in the hosted database, generates the Postgres Prisma client, and then runs the Next.js build.
