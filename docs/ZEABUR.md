# Zeabur Deployment And Recovery

## 1. Services To Create

Inside the same Zeabur project, create:

- one `Next.js` service for this repo
- one `PostgreSQL` addon for production data

If you use Inngest, keep it connected to the same production app endpoint.

## 2. Required Environment Variables

Set these on the Zeabur app service:

```env
DATABASE_URL=<from the production PostgreSQL addon>
ADMIN_PASSWORD=<set your own password>
ADMIN_SESSION_SECRET=<long random secret>
THREADS_APP_ID=<your Threads app id>
THREADS_APP_SECRET=<your Threads app secret>
THREADS_REDIRECT_URI=https://your-domain/api/threads/callback
TOKEN_ENCRYPTION_KEY=<long random secret>
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
CRON_SECRET=<random secret>
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
INNGEST_SERVE_ORIGIN=https://your-domain
```

Important:

- never commit real secrets into docs or repo files
- `ADMIN_SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` must be high-entropy strings
- `DATABASE_URL` must point to the same production database you originally used, otherwise account records will appear to “disappear”

## 3. First Production Boot

After the first deploy, run:

```bash
npm run db:push
```

Only run seed data if you explicitly want demo content:

```bash
npm run db:seed
```

## 4. Inngest Setup

Set the serve endpoint to:

```text
https://your-domain/api/inngest
```

Current scheduled jobs:

- every 1 minute: publish scheduled Threads posts
- every 6 hours: collect metrics and refresh expiring tokens
- every 30 minutes: keyword scan
- every 30 minutes: automation rules
- every 3 hours: refresh source watchlist

If Inngest is not connected correctly, scheduled work will stop running even if the UI still looks normal.

## 4.1 External Cron Fallback

If Inngest is not stable yet, configure at least one external cron fallback:

- every 15 minutes:

```text
https://your-domain/api/cron/heartbeat?secret=<CRON_SECRET>
```

This runs the whole operating heartbeat:

- source refresh
- source imports
- daily persona generation
- direct-draft promotion
- scheduled Threads publishing
- SEO opportunity autopilot

- every 1 minute:

```text
https://your-domain/api/cron/scheduler?secret=<CRON_SECRET>
```

This is the lighter fallback for publication only. It now also promotes high-confidence drafts before checking due scheduled posts, so good drafts do not get stuck in `draft`.

## 5. Threads Redirect Setup

In Meta Developer Console, set the redirect URI to:

```text
https://your-domain/api/threads/callback
```

Also make sure the testing / allowed Threads accounts are configured correctly in Meta.

## 6. Recovery Checklist When WordPress Or Threads Accounts “Disappear”

If previously connected WordPress or Threads accounts suddenly no longer appear in the UI, check these in order:

1. Confirm the current Zeabur app is using the expected `DATABASE_URL`.
2. Confirm the app is connected to the original production PostgreSQL addon, not a newly created empty one.
3. Confirm you are checking the correct Zeabur environment or project, not preview / staging.
4. Confirm the deploy did not lose environment variables after redeploy.
5. Confirm `npm run db:push` was run against the intended production database after schema changes.

Most of the time, “my WordPress connection disappeared” does **not** mean the record was deleted.
It means the running app is pointing at a different database.

## 7. Fast Cloud Triage Checklist

Use this short checklist directly in Zeabur:

1. Open the app service.
2. Open Environment Variables.
3. Check whether `DATABASE_URL` is present.
4. Check whether the hostname / db name inside `DATABASE_URL` matches the original production PostgreSQL addon.
5. Open the PostgreSQL addon list in the same Zeabur project.
6. Confirm the app service is bound to the intended database, not a new empty one.
7. If the database changed recently, rebind the app to the original database and redeploy.
8. Re-run `npm run db:push` only after confirming the target database is correct.

## 8. Safe Migration Rule

Before any schema update:

1. confirm which database the service is using
2. confirm it is production, not an empty replacement
3. then run `npm run db:push`

The dangerous case is not `db:push` itself.
The dangerous case is `db:push` against the wrong database.
