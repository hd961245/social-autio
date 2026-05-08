# Social Audio PRD v2

> Version: v2.2  
> Updated: 2026-05-08  
> Status: Active Product Direction  
> Repo: https://github.com/hd961245/social-autio

## 1. Product Definition

### 1.1 One-line Positioning

Social Audio is a `Threads-first multi-account AI content operating console` for `solo self-media operators`.

Its job is not just to help write content faster. Its job is to let one operator run multiple content lines with the smallest possible daily manual workload.

### 1.2 North Star

Current product north star:

`Push connected accounts toward top-tier Taiwan finance content traffic while increasing hands-off automation ratio.`

Every core module should answer at least one of these:

- can this help accounts publish more consistently
- can this help accounts validate traffic faster
- can this help strong content turn into long-term assets
- can this reduce daily manual intervention

### 1.3 Product Promise

The system should turn these inputs into one operating flywheel:

- external sources: RSS, websites, official data, articles
- persistent knowledge: longform content, archives, future YouTube / podcast / docs
- existing performance signals: strong Threads, old WordPress posts, SEO opportunities
- account settings: mission, persona, direction, CTA and monetization setup

Output should consistently land in:

- Threads scheduling and publishing
- WordPress draft / expansion workflow
- Review for true exceptions only
- Analytics, learning, and SEO follow-up loops

## 2. Target User And Boundary

### 2.1 Target User

The product is currently optimized for:

- one operator
- multiple content accounts
- Threads as the main growth lane
- WordPress as the asset and conversion lane

### 2.2 Explicit Non-goals

The current product is intentionally not optimized for:

- team collaboration
- permissions
- billing
- multi-tenant SaaS
- publishing expansion to X / LinkedIn / Facebook / Instagram
- heavy BI-style reporting

## 3. Product Shape

### 3.1 Primary Workspaces

The product should be read through these operating layers:

- `PM Ops`
  The portfolio control panel. It should answer: is anything stalled, where are exceptions, what is the highest-value next move, and did automation actually run.
- `Accounts`
  Each account is an independent content business line with its own mission, source preference, autopilot behavior, and learning loop.
- `Review`
  Exception desk only. Low-confidence, high-risk, failed, or high-value human-decision content lands here.
- `Factory`
  Background automation feed. Shows processed work, work in progress, and failures that need repair.
- `Analytics`
  Decision-facing metrics only. Performance, opportunities, and action prompts.
- `Config`
  Wiring, integrations, and non-daily setup.

### 3.2 Secondary Workspaces

These still matter, but they are no longer the product’s top-level mental model:

- `Sources`
- `Compose`
- `WordPress`
- `Inbox / Queue / Inventory`

## 4. Core Operating Model

### 4.1 Portfolio Autopilot

The portfolio layer is responsible for keeping all active lines moving.

It should:

- ensure each active Threads account keeps publishing
- prevent any account from silently stalling
- surface expiring tokens and failed background work
- route only true exceptions into Review
- keep strong content moving into WordPress or SEO follow-up

The desired default is:

`the system runs by itself; the operator only handles exceptions and direction`

### 4.2 Account Autopilot

Each account should be able to run its own loop:

- absorb source inputs
- select topics
- generate Threads content
- schedule or publish
- expand strong content into WordPress
- feed performance learning back into the next cycle

Account decisions should prioritize:

- account mission
- source preference
- persona prompt and playbook
- recent performance
- replies and conversation signals
- operating brief
- account-level learning updates

### 4.3 Explore -> Brief -> Build -> Validate -> Learn

The main operating loop should be:

`explore -> brief -> build -> validate -> learn`

Mapped to system behavior:

- `explore`
  source watches, old post performance, GSC opportunities, persistent knowledge
- `brief`
  decide what this item is trying to validate and which lane it should enter first
- `build`
  generate content using persona, mission, and learned behavior
- `validate`
  collect Threads, WordPress, GA, GSC, and follow-up signals
- `learn`
  push hooks, CTA patterns, topic preferences, and routing insights back into the next cycle

## 5. Publishing And Reliability

### 5.1 Threads Is The First Growth Curve

Threads is responsible for:

- validating ideas quickly
- keeping each account present in public
- generating interaction signals
- creating the base material for later optimization and expansion

In higher automation modes, Threads should support:

- automatic topic intake
- automatic drafting
- high-confidence direct scheduling
- direct publish via scheduler
- at least one outbound post path per active account

### 5.2 WordPress Is The Second Growth Curve

WordPress is responsible for:

- longform content storage
- SEO capture
- CTA / affiliate / referral conversion surfaces
- expansion of strong Threads ideas
- updating high-opportunity existing pages

WordPress is not just a draft bucket.
It should function as:

`the long-term asset and monetization lane for each account`

### 5.3 Near Full Auto Behavior

In `near_full_auto`, the product should bias toward continuity over hesitation.

Current desired behavior:

- legacy accounts should still be eligible for autopilot if they already have real persona / mission setup
- daily persona generation should not fall back to `draft` only because source confidence is low
- direct-draft promotion should guarantee at least one scheduled Threads candidate when an active account has no outbound post yet for the day
- scheduler should be able to promote and publish without relying on an open browser tab

### 5.4 Server-side Scheduling Requirement

The product must not depend on someone keeping the dashboard open.

Scheduling should be runnable from server-side entry points:

- `/api/cron/heartbeat`
- `/api/cron/scheduler`
- legacy-compatible `/api/autopilot/heartbeat`

These should support external cron fallback even when Inngest is unavailable or unstable.

## 6. Exception Routing

Review is not the default path.

Only these should enter Review:

- low-confidence Threads drafts
- medium-confidence but high-risk SEO / WordPress items
- token / provider / publish failures
- dirty or ambiguous source inputs
- high-value commercial or conversion content that still needs human judgment

Design rule:

`normal work should stay out of Review`

## 7. Runtime Visibility

### 7.1 What PM Ops Must Answer

The control panel should answer these four questions immediately:

1. did automation actually run
2. is any account stalled today
3. where are the exceptions and failures
4. what is the highest-value next move

### 7.2 Required Runtime Signals

The product should visibly expose:

- latest heartbeat execution
- latest scheduler execution
- whether cron has ever reached the app
- summary of what automation did last run
- count of failed background work in recent windows

These signals should be visible in:

- `Ops`
- `PM Ops / Desk`

The operator should not need server logs to answer:

`did cron enter the app, and did it publish anything`

## 8. Success Metrics

### 8.1 Primary Product Metrics

- active account publishing continuity
- hands-off automation ratio
- scheduled-to-published success rate
- direct-draft promotion success rate
- reduction in Review backlog share

### 8.2 Secondary Growth Metrics

- Threads reach and engagement quality
- reply / conversation signal
- number of strong Threads expanded to WordPress
- SEO opportunities turned into drafts or published assets
- daily operating exceptions per account

## 9. Current Constraints And Reality

The product direction should reflect current operational reality:

- schema drift has caused real failures before
- Threads OAuth and environment mismatch have caused real failures before
- server-side scheduling reliability matters more right now than expanding to new platforms
- visibility into cron and scheduler execution is currently more valuable than adding more front-end surfaces

So the immediate product priority is:

`stabilize autopilot, prove it runs, then expand the growth loops`

## 10. Immediate Product Priorities

### 10.1 Priority 1: Reliability

- keep Threads autopilot reliable
- keep cron / scheduler observable
- keep schema and deployment assumptions visible
- keep failures legible in PM Ops and Factory

### 10.2 Priority 2: Operating Control

- make PM Ops the real daily control panel
- make Accounts the true account operating lines
- keep Review strict and exception-only
- keep Factory focused on background execution health

### 10.3 Priority 3: Growth Flywheel

- improve WordPress expansion loop
- improve SEO opportunity routing
- improve 14-day optimization loop
- improve learning feedback into persona generation

## 11. Rule Of Thumb

If a future feature does not improve one of these, it is probably not current-priority product work:

- publishing continuity
- automation reliability
- exception reduction
- long-term asset creation
- operator leverage
