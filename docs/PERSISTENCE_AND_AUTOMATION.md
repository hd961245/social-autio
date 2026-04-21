# Persistence And Automation

> Version: v1.0  
> Updated: 2026-04-21  
> Scope: account persistence rules and next-stage AI automation direction

## 1. First Principle

Changing computers should **not** clear Threads or WordPress accounts.

Those records are supposed to live in the cloud database, mainly in:

- `PlatformAccount`
- related `Post`, `AutomationLog`, `MetricsSnapshot`, and source tables

If accounts appear missing after switching computers, the cause is usually:

- wrong `DATABASE_URL`
- app pointing to a different Zeabur environment
- cloud schema drift after new deploy
- deploy succeeded but `npm run db:push` was not run
- the browser is hitting an older deployment

It is **not** because the local machine itself changed.

## 2. Persistence Rule

When resuming development on another computer, the safe rule is:

1. pull latest `main`
2. read `docs/BOOTSTRAP.md`
3. confirm deployed app is using the same cloud database
4. confirm `Ops` shows DB ready and the expected account counts
5. only then continue feature work

If account counts are zero, stop assuming product logic first.
Check environment and schema first.

## 3. What Must Stay Stable

These must remain stable across computers:

- same Zeabur project
- same production PostgreSQL
- same `DATABASE_URL`
- same Threads app credentials
- same encryption and session secrets

Required envs:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `THREADS_APP_ID`
- `THREADS_APP_SECRET`
- `THREADS_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY`

If automation is enabled:

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `INNGEST_SERVE_ORIGIN`

If AI is enabled:

- `OPENAI_API_KEY`
- or `GEMINI_API_KEY`
- or `ANTHROPIC_API_KEY`

## 4. Recovery Rule

If a machine switch is followed by “my Threads / WordPress accounts disappeared”:

1. open `Ops`
2. confirm DB ready
3. confirm `Threads Accounts` and `WordPress Sites`
4. confirm recent deploy is on the expected commit
5. if schema changed recently, run `npm run db:push`

The default assumption should be:

`environment mismatch or schema mismatch before code bug`

## 5. Can AI Auto Schedule And Auto Publish?

Yes.

This repo already has enough building blocks to support it:

- personas
- playbooks
- source inbox
- draft generation
- scheduling
- Inngest jobs
- analytics
- comment / reply surfaces

What is still needed is a safer operating layer on top.

## 6. Recommended Automation Shape

### Layer A. AI Draft Assist

This already exists in partial form.

Desired behavior:

- AI drafts inside `Compose`
- AI chooses persona-aware tone
- AI suggests best posting window
- AI proposes a publish mode

### Layer B. AI Auto Schedule

Desired behavior:

- generate draft from source or queue
- score the draft
- assign a recommended publish time
- put it into scheduled queue automatically

Guardrails:

- only for approved personas
- only if account health is OK
- only if quota is healthy
- user can review before enabling full automation

### Layer C. AI Auto Publish

Desired behavior:

- if draft score passes threshold
- if no blocking warning exists
- if time window is good
- publish automatically without manual click

Guardrails:

- per-persona opt-in
- dry-run mode first
- preflight diagnostics required
- publish outcome logging required

### Layer D. Comment-Aware Optimization

Desired behavior:

- monitor replies and quotes
- classify feedback as:
  - confusion
  - resonance
  - objection
  - follow-up demand
- suggest:
  - better hook
  - clearer explanation
  - stronger CTA
  - follow-up post

This should initially be:

`AI-assisted recommendation`

not:

`fully autonomous public reply bot`

## 7. Best Near-Term Automation Plan

The safest rollout order is:

1. `AI auto-schedule`
2. `AI publish preflight`
3. `AI auto-publish for selected personas`
4. `comment-aware rewrite suggestions`
5. `optional semi-auto reply assistant`

This avoids jumping directly into uncontrolled automation.

## 8. What I Recommend For You

For your use case, the most practical version is:

- AI drafts the post
- AI chooses persona
- AI proposes best time
- AI auto-schedules
- you manually approve auto-publish at first
- AI later learns from replies and suggests version 2

That gives you leverage without losing control.

## 9. Final Rule

The system should behave like:

`an operator co-pilot`

before it behaves like:

`a fully autonomous content bot`

That is the safest path for Threads, voice consistency, and account safety.
