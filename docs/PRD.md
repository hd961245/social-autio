# Social Audio PRD

> Version: v3.0  
> Updated: 2026-04-15  
> Status: Active Build  
> Repo: https://github.com/hd961245/social-autio

## 1. Product Direction

### 1.1 New Positioning

Social Audio is moving from a `Threads-first personal publishing OS`

to a

`self-media entrepreneur management console`.

It should help one operator manage four connected layers in one place:

- content sourcing
- editorial production
- distribution and repurposing
- monetization and operating review

The current product is still Threads-first, but the long-term shape is no longer just “write a post faster.”
It is a control layer for running a small creator business.

### 1.2 Core Thesis

A self-media entrepreneur does not need ten disconnected tools.

They need one operating surface where they can:

- see what to write next
- turn short-form into long-form
- preserve their own voice
- keep affiliate / CTA logic consistent
- understand which content deserves another push
- run their content business with less switching cost

### 1.3 Product Promise

If the user gives the system:

- a Threads post
- a source URL
- an RSS item
- raw notes
- a past WordPress article

the system should turn it into:

- a usable Threads draft
- a usable WordPress draft
- a clearer editorial next step
- a monetization-aware content package

with WordPress staying draft-first and the user retaining final editorial control.

## 2. Target User

This product is for:

`a self-media entrepreneur or solo content operator`

Typical traits:

- publishes on Threads often
- keeps a WordPress site as long-form home base
- repackages the same idea across formats
- wants repeatable workflow, not one-off AI tricks
- uses CTA, affiliate links, product recommendations, or service offers
- treats content as both brand-building and revenue-generating

Non-target users for now:

- agencies
- content teams
- enterprise marketing orgs
- multi-user approval chains
- generic social media managers

## 3. Product Shape

### 3.1 Current Product Shape

Today the system already supports:

- Threads publishing and scheduling
- Threads analytics and post review
- Content Desk for workflow-first daily operations
- Content Engine for source rewrite
- Source Watchlist and Inbox
- WordPress draft creation and update
- WordPress style learning from archive
- WordPress archive rewrite
- affiliate slot library
- Threads to WordPress sync

### 3.2 Future Product Shape

The future shape should look like a creator management console with these modules:

- `Desk`
  daily command center
- `Compose`
  short-form and long-form draft editor
- `Distribution`
  Threads-first publishing lane, later selective downstream distribution
- `WordPress Studio`
  long-form draft inbox, site sync, archive mining
- `Revenue Layer`
  affiliate blocks, CTA modules, offer slots, conversion-aware article structure
- `Review Layer`
  post outcomes, rewrite radar, follow-up opportunities
- `Ops Layer`
  env, token, queue, and health diagnostics

## 4. Product Jobs To Be Done

The system should help the user do these jobs:

### 4.1 Find What To Work On

- collect repeat sources
- score incoming material
- identify what is worth turning into Threads
- identify what is worth becoming a long-form article

### 4.2 Produce Faster Without Losing Voice

- generate first drafts
- preserve writing rhythm
- preserve title and opening habits
- preserve monetization structure

### 4.3 Turn Short-Form Into Long-Form

- sync high-performing Threads into WordPress draft
- add article scaffold, context, and CTA structure
- keep original post context visible

### 4.4 Reuse Existing Assets

- mine old WordPress posts
- rewrite archive into fresh drafts
- turn existing ideas into new angles

### 4.5 Operate Like A Business

- know what is ready to publish
- know what deserves another push
- know what content pattern performs
- keep affiliate / promo structure reusable

## 5. Primary Workflows

### 5.1 Daily Operator Workflow

1. Open `Desk`
2. Check `Rewrite Radar`
3. Check `Inbox`
4. Pick one content direction for today
5. Open `Engine` or `Compose`
6. Build Threads + WordPress draft
7. Send Threads now or schedule it
8. Leave WordPress in draft for later refinement
9. Return to `Analytics` to see if the post deserves expansion

### 5.2 Threads To WordPress Workflow

1. Publish or review a Threads post
2. Identify that it deserves long-form expansion
3. Click sync to WordPress
4. System creates a richer WordPress draft, not a thin copy
5. Draft includes:
   - context block
   - article scaffold
   - extension prompts
   - affiliate / CTA slot
   - source Threads reference
6. User refines draft before WordPress backend publishing

### 5.3 Archive Expansion Workflow

1. Open `WordPress`
2. Browse archive rewrite candidates
3. Choose an older article
4. Create a fresh draft with a new angle
5. Use writing style memory + affiliate planning automatically
6. Edit and ship later

### 5.4 Source To Draft Workflow

1. Track sources in `Source Watchlist`
2. Review latest items in `Inbox`
3. See rewrite scores and recommendation
4. Choose:
   - Threads first
   - WordPress first
   - dual route
5. Generate draft package
6. Move to `Queue` or `Compose`

## 6. Functional Requirements

### F1. Desk As Daily Command Center

Priority: P0

- make `Desk` the default daily entry
- show today’s rewrite opportunities
- show source triage status
- show draft workload
- connect directly into Compose, Queue, and Analytics

### F2. Threads Publishing Lane

Priority: P0

- create draft
- publish now
- schedule post
- show publish health before submission
- show success / failure feedback clearly
- preserve a clean Threads-first default path

### F3. WordPress Draft Studio

Priority: P0

- create WordPress draft
- update WordPress draft
- keep WordPress draft-only
- show local draft inbox before settings
- support opening draft in app and in WordPress backend

### F4. Threads To WordPress Expansion

Priority: P0

- sync high-performing Threads into WordPress draft
- do not produce a shallow mirror
- generate a long-form-ready structure
- preserve source link
- carry writing style memory forward
- carry affiliate library forward

### F5. Content Engine

Priority: P0

- accept URL, raw text, and image-led input
- preview extraction before rewrite
- produce Threads + WordPress together
- let user choose provider
- let user choose WordPress template

### F6. Source Watchlist And Inbox

Priority: P1

- save repeat sources
- refresh manually and automatically
- avoid duplicate latest imports
- score candidates for Threads / WordPress / business potential
- support skip / import / prioritize actions

### F7. Writing Style Memory

Priority: P1

- learn from own WordPress archive
- infer style instruction set
- infer monetization placement rules
- reuse those instructions across generated drafts

### F8. Affiliate And Offer Layer

Priority: P1

- save reusable affiliate modules
- save CTA modules
- save disclosure text
- inject these into WordPress drafts
- make them available in Compose

### F9. Archive Rewrite

Priority: P1

- list old WordPress posts
- create fresh draft from archive
- do not overwrite source article
- bias toward new angle, not shallow paraphrase

### F10. Analytics And Rewrite Radar

Priority: P1

- show raw counts and benchmark-style rates
- identify top posts
- identify rewrite candidates
- support account and time-window filtering
- support per-post review with next-step recommendation

### F11. Ops And Recovery

Priority: P1

- show DB readiness
- show env health
- show token health
- show account counts
- show likely recovery hints when cloud state looks wrong

## 7. UX Principles

### 7.1 Workflow Over Feature Listing

The UI should not feel like a pile of tools.
It should feel like one operator moving through a continuous content business workflow.

### 7.2 Draft Before Publish

WordPress stays draft-first.
The system helps prepare long-form output, not auto-publish it.

### 7.3 Revenue Without Sloppiness

Affiliate blocks and CTA logic should feel intentional and editable, not spammy or auto-inserted in a careless way.

### 7.4 Review Must Lead To Action

Analytics is not for passive dashboard watching.
Every review surface should point toward:

- rewrite
- expansion
- series follow-up
- archive reuse

### 7.5 Daily Entry Must Be Short

The operator should be able to open the app and know:

- what to work on
- what can publish
- what deserves long-form treatment

within one or two screens.

## 8. Product Boundaries

### 8.1 What This Product Is

- a solo creator operating console
- a Threads-first publishing and review system
- a WordPress draft studio
- a repurposing engine
- a monetization-aware content workspace

### 8.2 What This Product Is Not

- a generalized social media SaaS
- a team collaboration suite
- a paid subscriber platform
- a CRM
- an email marketing tool
- a universal publishing bus

## 9. Next PRD Roadmap

### Phase 1. Already Built

- Threads publish / schedule
- Content Desk
- Source Watchlist + Inbox
- Content Engine
- WordPress draft flow
- archive rewrite
- writing style memory
- affiliate slot library
- publish health
- post review and rewrite mode

### Phase 2. Next High-Value Moves

- WordPress draft status memory
  learn which drafts actually get finished and used
- richer Threads to WordPress expansion templates
  different long-form shapes from different Threads post types
- better editorial routing
  know when a post should become:
  - a Threads follow-up
  - a WordPress article
  - both
- outcome-aware monetization suggestions
  know when to use soft CTA vs hard CTA

### Phase 3. Management Console Direction

- topic / pillar tracking
- campaign or launch-mode content grouping
- offer-aware content mapping
- content inventory by stage:
  - source
  - draft
  - published
  - expandable
  - monetizable
- simple revenue-aware editorial planning

## 10. Success Criteria

The product is successful when the user can operate like this:

- run daily content triage from one desk
- publish Threads without friction
- turn strong Threads into long-form drafts fast
- preserve voice and monetization structure
- keep WordPress as a controlled editorial back office
- feel like the system is helping run a creator business, not just generating text

## 11. Final Rule

The product should continue moving toward:

`self-media entrepreneur management console`

and away from:

`generic AI content toy`

and away from:

`generic multi-platform scheduler`.
