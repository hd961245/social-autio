# Social Audio Bootstrap

> Version: v1.0  
> Updated: 2026-04-21  
> Audience: next AI thread, next computer, or fast project re-entry

## 1. One-Screen Summary

This repo is a:

`Threads-first self-media entrepreneur management console`

Current working shape:

- Threads is the main publishing lane
- WordPress is draft-only
- multi-Threads personas are supported
- Content Desk is the main daily workspace
- Inventory is the content asset view
- Ops is the first place to debug cloud/runtime problems

## 2. Read These First

1. [README.md](../README.md)
2. [docs/STATE.md](./STATE.md)
3. [docs/HANDOFF.md](./HANDOFF.md)

If time is short, read this file and `STATE.md` only.

## 3. Core Product Truths

- Threads publish and schedule are already implemented
- WordPress never publishes directly from this app
- WordPress is used as a draft studio
- persona playbooks affect generation and routing
- source -> persona -> draft -> publish -> review is the intended loop

## 4. Main Pages

- `Desk`
  daily operating entry
- `Compose`
  publishing and scheduling
- `Analytics`
  review and rewrite decisions
- `WordPress`
  draft inbox and backend-linked draft workflow
- `Ops`
  environment, DB, callback, and recovery diagnostics

## 5. First Debug Rule

When something looks broken, do not assume product logic first.

Check in this order:

1. `Ops`
2. `Threads Callback`
3. DB reachability
4. schema drift
5. only then feature logic

## 6. Known Recent Real Problems

- Meta tester / Threads OAuth identity mismatch
- callback succeeds but DB is wrong or unavailable
- DB reachable but schema outdated
- Compose submit appearing dead due to frontend validation behavior

## 7. Current Critical Cloud Rule

After schema changes, deployment often still needs:

`npm run db:push`

If not done, app may load fine but fail at runtime.

## 8. What To Check Before Doing New Work

1. latest `main` is pulled
2. cloud DB is reachable
3. schema is current
4. Threads accounts are visible in `Accounts`
5. `Ops` has no obvious blocking warning

## 8.1 Persistence Reminder

Changing computers should not clear accounts.

If accounts seem missing, assume:

- wrong DB
- wrong environment
- outdated schema
- stale deployment

before assuming product logic is deleting records.

## 9. Best Next Product Work

If continuing feature work, highest-value next items are:

1. Threads publish preflight diagnostics
2. stronger WordPress backend state sync
3. content asset metadata
4. persona outcome learning
5. AI auto-schedule and comment-aware optimization

## 10. Short Prompt For A New AI Thread

Use this as the first message if restarting elsewhere:

`Read docs/BOOTSTRAP.md, docs/STATE.md, docs/HANDOFF.md, and docs/PERSISTENCE_AND_AUTOMATION.md first. This repo is a Threads-first self-media entrepreneur management console with WordPress draft-only workflow, multi-persona Threads accounts, Content Desk, Inventory, Ops diagnostics, and recent cloud/runtime issues around Threads OAuth, DB reachability, schema drift, and stale deployments. Changing computers should not clear accounts; treat missing accounts as DB/environment/schema first. Continue from current main without re-deriving product direction.`
