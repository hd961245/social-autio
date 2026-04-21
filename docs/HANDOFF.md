# Social Audio Handoff

> Version: v1.0  
> Updated: 2026-04-21  
> Scope: practical handoff notes for switching computers, reopening the project, or continuing in a new Codex thread

## 1. What To Read First

When resuming work from another machine or a new thread, read these in order:

1. [README.md](../README.md)
2. [docs/STATE.md](./STATE.md)
3. [docs/WORKFLOW.md](./WORKFLOW.md)
4. [docs/ROADMAP.md](./ROADMAP.md)

That gives the minimum context needed to continue safely.

## 2. What To Pull

Always pull latest `main` first.

This repo is being updated directly on `main`, not through a long-lived feature branch workflow.

## 3. What To Set Up On A New Computer

### Local

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run dev
```

### Required cloud assumptions

- same Zeabur app service
- same PostgreSQL
- same Inngest setup
- same Threads app credentials

## 4. What Does Not Automatically Carry Over

These do carry over:

- code
- docs
- cloud DB state
- deployed env vars

These do not carry over automatically:

- chat history reasoning
- why specific fixes were chosen
- recent debugging path unless written into docs

That is why `STATE.md` exists.

## 5. Common Recovery Checklist

If the app seems wrong after switching machines:

1. open `Ops`
2. check DB readiness
3. check environment variables
4. check `Threads Callback`
5. confirm `Threads Accounts` count
6. confirm schema is current

## 6. Common Real Failure Modes

### Case A. Threads account disappears

Likely causes:

- wrong DB / environment
- old or empty database
- callback succeeded in one environment but UI is looking at another

### Case B. Threads OAuth succeeds but account still not visible

Likely causes:

- callback hit DB error
- schema not up to date
- app cannot reach DB

### Case C. Prisma runtime error mentions missing column

Action:

- run `npm run db:push`

### Case D. Compose button appears dead

Action:

- refresh to latest deploy
- check UI disable reason
- verify DB banner / Threads account availability

### Case E. Accounts look cleared after switching computers

Action:

- verify production `DATABASE_URL`
- verify current Zeabur deployment is the expected commit
- check `Ops` account counts
- run `npm run db:push` if recent schema changes exist

Do not assume local machine changes deleted cloud accounts.

## 7. Current Key Debug Surfaces

Use these pages first:

- `Ops`
  for environment, DB, callback, and recovery signals
- `Accounts`
  for Threads account presence
- `Compose`
  for publish health and submit behavior
- `WordPress`
  for draft inbox and backend draft state

## 8. How To Continue Product Work Safely

When restarting development:

1. read docs
2. verify cloud health
3. verify schema
4. only then implement product changes

## 9. Current Practical Rule

Before assuming a logic bug, always ask:

`Is this code, schema, environment, or cloud state?`

Most recent failures were environment or schema first, not product logic first.

## 10. Next Strategic Direction

The next major product layer is:

`AI auto-schedule + controlled auto-publish + comment-aware optimization`

Read [docs/PERSISTENCE_AND_AUTOMATION.md](./PERSISTENCE_AND_AUTOMATION.md) before implementing that layer.
