# Social Audio State

> Version: v1.0  
> Updated: 2026-04-18  
> Scope: current project state, real implementation status, and recent operational issues

## 1. Current Product State

The product is already usable as a:

`Threads-first self-media entrepreneur management console`

for one operator.

The current real workflow is:

`source -> route to persona -> generate draft -> publish on Threads -> review -> expand to WordPress draft`

## 2. What Is Already Working

### Core workflow

- multi-Threads account support
- per-account persona
- persona playbook
- Content Desk
- Inbox + Source Watchlist
- Content Engine
- Compose
- Queue
- Analytics
- Inventory
- WordPress draft workflow

### Content intelligence

- source scoring
- persona routing
- rewrite radar
- persona memory
- writing style memory from WordPress archive
- affiliate slot library
- archive rewrite

### Operational support

- Ops diagnostics
- publish outcome log
- Threads callback diagnostics
- WordPress backend status readback

## 3. Current Product Boundaries

This product is intentionally optimized for:

- one operator
- Threads as main publishing lane
- WordPress as draft studio
- content reuse and monetization planning

It is not yet optimized for:

- teams
- billing
- permissions
- multi-tenant SaaS
- heavy reporting

## 4. Important Current Behaviors

### Threads

- supports immediate publish
- supports scheduling
- publish health is shown in Compose
- publish outcomes are logged

### WordPress

- draft only
- no direct publish from this app
- local drafts can sync to backend
- backend draft status can be read back into WordPress page

### Personas

- each Threads account can define:
  - persona label
  - persona prompt
  - default tone
  - topic focus
  - hook style
  - CTA style
  - voice guardrails

## 5. Recent Real Issues

These are not theoretical.
They were hit recently in real use.

### Threads OAuth / account binding

Observed issues:

- Meta tester / invite acceptance problem
- callback could succeed while DB or environment state was still wrong
- callback diagnostics were added to Ops to make this visible

### Zeabur database issues

Observed issues:

- app could point to old or unreachable DB host
- DB could be running but schema still outdated
- app failed when new Prisma columns were missing

### Schema drift

Common symptom:

- Prisma error like:
  `The column 'PlatformAccount.personaLabel' does not exist`

Fix:

- run `npm run db:push` in the deployed environment

### Compose submit issues

Observed issues:

- scheduling button could appear to do nothing
- browser-level form validation could block silently

Fixes already added:

- disable reason is shown in UI
- submit uses app-side validation instead of silent browser blocking

## 6. Required Deployment Assumptions

For cloud to work correctly, the environment must have:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `THREADS_APP_ID`
- `THREADS_APP_SECRET`
- `THREADS_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY`

If scheduling / automation is expected:

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `INNGEST_SERVE_ORIGIN`

## 7. Required Post-Deploy Steps

After schema changes, cloud usually needs:

`npm run db:push`

Without this, app code may deploy fine while runtime writes fail.

## 8. Current Highest-Value Next Work

If continuing product work, the best next areas are:

1. Threads publish preflight diagnostics
2. stronger WordPress backend state sync
3. content asset metadata
4. persona outcome learning

## 9. Current Rule Of Thumb

If something looks broken:

1. check `Ops`
2. check `Threads Callback`
3. confirm DB reachability
4. confirm schema is up to date
5. only then debug product logic
