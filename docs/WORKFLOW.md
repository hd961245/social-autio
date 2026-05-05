# Social Audio Workflow

> Note: 這份文件保留為 `legacy workflow 補充`。最新產品主線請優先看 `docs/PRD_V2.md` 與 `docs/REQUIREMENTS_V2.md`。

> Version: v1.0  
> Updated: 2026-04-16  
> Scope: Daily operating workflow for a self-media entrepreneur using multiple Threads personas and WordPress drafts

For the full UX-oriented workflow spec, also see:

`docs/USER_WORKFLOW_SPEC.md`

## 1. Workflow Goal

This product is not meant to be used as a set of disconnected pages.

The intended operating model is:

`find signal -> route to the right persona -> publish on Threads -> review -> expand into WordPress draft -> monetize later`

The user should spend most of their time in:

- `Desk`
- `Inbox`
- `Compose`
- `Analytics`
- `WordPress`

Everything else supports those five surfaces.

## 2. Daily Workflow

### 2.1 Start In Desk

Open `Desk` first.

Check:

- `Rewrite Radar`
  which existing Threads deserve another push
- `Inbox`
  which new source items are worth processing today

The goal is to decide:

- what topic to work on
- which Threads persona should carry it

### 2.2 Pick A Content Entry Point

There are three valid entry points:

- `Inbox`
  when starting from RSS, blog, or imported links
- `Content Engine`
  when starting from a raw URL, notes, or screenshots
- `Compose`
  when the idea is already clear and you want to write directly

When a user is starting from a candidate draft or queue item, they should not skip directly into final publishing.
They should first go through a `Review Workspace` step to define assignment and generate a publishable version.

## 3. Source Workflow

Use this path when starting from outside content.

`Sources / Inbox -> persona routing -> draft generation`

### 3.1 What Inbox Does

Inbox should help answer:

- Is this better for Threads first or WordPress first?
- Does it have monetization potential?
- Which Threads persona is the best fit?

### 3.2 What To Do In Inbox

For each source item:

1. Check the recommendation:
   `Threads first`, `WordPress first`, or `dual`
2. Check the routed persona
3. Decide whether to:
   - `先做 Threads`
   - `先做長文`
   - `略過`

### 3.3 Persona Routing Rule

If the system recommends a Threads persona:

- trust it as the default
- override only if you already know another account should own the topic

The system is optimizing for:

- persona label
- persona prompt
- tone
- recent account behavior

## 4. Threads Workflow

Use this path when the main goal is fast testing, reach, or iteration.

`Inbox / Engine / Review Workspace -> Compose -> Publish or Schedule -> Analytics`

### 4.0 Review Workspace Rule

When entering from `Queue`, `Inbox`, or other candidate surfaces:

1. inspect the original candidate
2. define assignment / goal / optimization target
3. let AI generate a publishable draft
4. then move into final compose

This avoids dropping raw candidate drafts directly into the publish form too early.

### 4.1 Compose For Threads

In `Compose`, always verify:

- selected Threads account
- current persona label
- current default tone
- persona memory hints

### 4.2 Writing Sequence

The intended writing sequence is:

1. choose the correct Threads account
2. use a persona-aware hook
3. write one focused body
4. use a persona-aware CTA
5. publish now or schedule

### 4.3 Compose Assist Layers

Threads compose currently gives you:

- persona prompt context
- persona-specific hook suggestions
- persona-specific CTA suggestions
- account-level content memory
- recent strong opener / closer patterns

This means each Threads account should feel different in practice, not only in theory.

## 5. Review Workflow

Threads publishing is not the end of the workflow.

After posts go out:

`Analytics -> Review -> Rewrite or Expand`

### 5.1 What To Check

In `Analytics`, review:

- which account / persona is performing better
- which post is best right now
- which post deserves rewrite next
- whether a persona is winning via discussion or via amplification

### 5.2 What To Do With Strong Posts

If a Threads post performs well:

- rewrite it for another round
- turn it into a follow-up
- sync it into WordPress draft

## 6. WordPress Workflow

WordPress is not a second publishing channel inside this product.

It is a:

`draft studio for long-form expansion`

### 6.1 Intended Path

`Threads signal -> WordPress draft -> backend refinement -> publish later in WordPress`

### 6.2 What Belongs In WordPress

Move a topic into WordPress when it is:

- already validated on Threads
- useful as evergreen content
- suitable for affiliate blocks, recommendations, or CTA structure

### 6.3 What To Do In WordPress

In `WordPress`:

- open `Draft Inbox`
- continue editing long-form drafts
- use writing style memory
- use affiliate slot library
- only publish later inside the actual WordPress backend

## 7. Monetization Workflow

Monetization should happen after content fit is visible, not before.

The intended path is:

`performing topic -> WordPress draft -> affiliate / CTA structure -> backend refinement`

For monetizable drafts, check:

- primary recommendation block
- secondary recommendation block
- disclosure
- CTA

## 8. Weekly Workflow

Run this once or twice per week.

### 8.1 Review Personas

Go to `Accounts` and check:

- whether each Threads account still has a clear role
- whether persona prompts are still distinct
- whether default tones still match the account direction

### 8.2 Review Inventory

Go to `Inventory` and check:

- which sources are still unprocessed
- which drafts are stuck
- which Threads are expandable
- which WordPress drafts are close to monetizable

### 8.3 Review Analytics

Go to `Analytics` and answer:

- which persona is winning
- what kind of opener works for that persona
- what kind of closer or CTA works for that persona
- what should be repeated next week

## 9. Recommended Operating Rhythm

### Daily

`Desk -> Inbox -> Compose -> Analytics`

### Every 2 to 3 Days

Take one strong Threads post and move it into:

`WordPress draft`

### Weekly

Review all three together:

- `Accounts`
- `Analytics`
- `Inventory`

## 10. Page Roles

- `Desk`
  daily command center
- `Inbox`
  source triage and persona routing
- `Content Engine`
  source-to-draft generation
- `Compose`
  actual writing and publishing
- `Analytics`
  account / persona / post review
- `WordPress`
  long-form draft workflow
- `Inventory`
  stage-based content management
- `Accounts`
  Threads account and persona management
- `Ops`
  deployment and system diagnostics

## 11. One-Line Summary

Run the system like this:

`Use Desk to decide the topic, Inbox to route it to the right persona, Compose to publish it on Threads, Analytics to see what wins, and WordPress to turn winners into long-form assets.`
