# User Workflow Spec

## Purpose

This document defines the intended end-to-end user workflow for a self-media entrepreneur using this platform to:

- collect external signals and source material,
- refine ideas with AI,
- generate publishable Threads drafts,
- accumulate long-form knowledge in WordPress drafts,
- and gradually automate recurring content operations.

This is a workflow and UX specification, not an implementation note.

---

## Product Positioning

The platform is not just a publishing tool.

It is an:

`AI-assisted self-media operating console`

for creators who want to continuously turn:

- external information,
- personal knowledge,
- market signals,
- AI rewriting,
- and post-performance feedback

into an ongoing content business.

---

## Core Product Promise

The product should help the user do five things well:

1. Find what is worth writing today
2. Decide how to frame it before writing
3. Let AI generate a useful first draft
4. Publish or schedule with minimal friction
5. Recycle good content into long-term assets

The platform should not push users into a publish form too early.

The platform should guide users through:

`signal -> assignment -> draft -> publish -> feedback -> archive`

---

## Primary User Types

### 1. Self-media entrepreneur

This user:

- runs one or more Threads personas
- wants to post frequently
- wants to accumulate long-form knowledge in WordPress
- wants AI to reduce drafting effort
- wants the system to help decide what is worth posting

### 2. Knowledge-driven creator / operator

This user:

- consumes a lot of articles, news, YouTube, and podcasts
- wants to normalize information into reusable content building blocks
- wants a clean review workflow before content gets published

---

## Core UX Principles

### Principle 1: Desk first

The first page should help the user decide what to do today.

It should not start with forms or configuration.

### Principle 2: Review before publish

When a user clicks a candidate draft, source item, or autopilot item, they should first enter a review and assignment step.

They should not be dropped straight into a final publish form.

### Principle 3: AI should prepare, not surprise

AI should help by:

- summarizing,
- classifying,
- drafting,
- suggesting CTA,
- suggesting timing,
- and proposing next angles.

AI should not feel like a black box.

### Principle 4: WordPress is a draft sink, not the main publishing path

WordPress should primarily be used for:

- long-form accumulation,
- article expansion,
- affiliate blocks,
- CTA blocks,
- and knowledge archive.

Threads remains the primary fast-publishing channel.

### Principle 5: Automation should default to review-first

Autopilot should create content candidates and route them into review.

It should not default to fully autonomous publishing.

---

## Main Daily Workflow

This is the ideal default daily workflow:

1. Open Desk
2. See today’s overview
3. Review recommended topics
4. Choose one candidate
5. Enter review workspace
6. Give assignment to AI
7. Generate a publishable Threads draft
8. Confirm / lightly edit
9. Publish now or schedule
10. If the topic performs well, expand it into a WordPress draft

In one line:

`Desk -> Review Workspace -> Compose -> Publish -> Feedback -> WordPress Draft`

---

## Desk Workflow

Desk should be the main daily control center.

### Desk should contain only the most important things:

#### 1. Today Overview

Pure numeric summaries, not heavy charts.

Recommended items:

- drafts waiting for review
- high-value source signals today
- autopilot output today
- scheduled posts pending
- recently published posts

#### 2. Today Draft Picks

A small set of prioritized content items:

- can publish directly
- should review first
- worth expanding into long form

Each item should show:

- title
- persona
- source rationale
- candidate quality
- recommended action

#### 3. Inbox Signals

Source opportunities categorized into:

- official first-hand signal
- deep analysis / research
- media quick signal
- long-term knowledge source

#### 4. Main workflow entry points

Only three strong actions should dominate:

- choose a topic
- review and generate
- publish / schedule

---

## Source Intake Workflow

Sources should be treated as structured content inputs.

### Source classes

#### A. Official first-hand signals

Examples:

- TWSE
- SEC
- Federal Reserve
- BLS
- BEA
- Treasury

Purpose:

- policy reaction
- macro quick commentary
- market interpretation

#### B. Media quick signals

Examples:

- RSS feeds
- finance news sites
- short market updates

Purpose:

- fast Threads commentary
- same-day angle generation

#### C. Deep analysis / research sites

Examples:

- research blogs
- macro articles
- long-form market opinion

Purpose:

- deeper Threads breakdowns
- WordPress expansion

#### D. Long-term knowledge inputs

Examples:

- YouTube transcripts
- podcast transcripts
- personal notes
- future Notion / Docs / Markdown inputs

Purpose:

- long-term knowledge archive
- educational content
- evergreen article building

### Source intake requirements

All incoming sources should go through:

1. discovery
2. article-body-first normalization
3. summary extraction
4. source classification
5. quality scoring
6. AI rewrite readiness

The system should prioritize article/news body content only.

It should avoid pulling:

- sidebars
- navigation
- footer noise
- unrelated recommendation blocks

---

## Inbox Workflow

Inbox is not just a list of source items.

It is the user’s daily topic selection queue.

Each Inbox item should clearly show:

- source title
- brief summary
- source lane
- quality label
- recommended persona
- why it is worth writing
- suggested output path

Suggested output path examples:

- do Threads first
- do long-form first
- worth archiving only

### Inbox actions

Actions must feel explicit and observable.

A user should be able to:

- open source article
- do Threads first
- do long-form first
- skip

When an action is triggered, the user should clearly see:

- that the system is working
- what was created
- where to go next

The product should never leave the user wondering whether a button did anything.

---

## Review Workspace

This is the most important workflow correction.

When a user clicks `編輯` from a candidate or draft item, they should **not** land directly in a publish form.

They should enter a `Review Workspace`.

### Review Workspace should show:

#### Left / source context

- original candidate draft
- source title
- source summary
- rationale
- persona suggestion

#### Assignment section

The user or system should define:

- objective
- chosen persona
- content mode
- optimization target

### Suggested assignment fields

- What is this post trying to do?
- Which persona should publish it?
- Is this a quick take, deep breakdown, or educational thread?
- Optimize for:
  - replies
  - reposts
  - saves
  - link intent
  - authority
- What needs improvement?
  - hook
  - clarity
  - pacing
  - CTA
  - angle

### Review Workspace actions

- generate Threads draft from assignment
- generate WordPress draft from assignment
- bring original text into editor manually

Only after this step should the user move into final editing / publishing.

---

## Compose Workflow

Compose should be the final drafting and publishing area.

It should not be the first stop for raw candidates.

### Compose is for:

- final review
- final AI-assisted refinement
- CTA adjustment
- scheduling decision
- publish confirmation

### Compose should support:

- direct manual drafting
- AI rewrite from pasted text or URL
- AI rewrite from YouTube / transcript source
- draft loaded from review workspace
- Threads publish
- Threads scheduling
- WordPress draft creation

### Compose should not do:

- raw topic selection
- source browsing
- early candidate triage

---

## AI Drafting Modes

AI drafting should be split into two mental models.

### 1. Source Rewrite Mode

Used when the user provides:

- article URL
- Threads URL
- YouTube URL
- transcript
- pasted notes

Goal:

- turn source material into a usable draft

### 2. Assignment Mode

Used after the user chooses a topic and defines purpose.

Goal:

- transform source + intent into a publishable version

This distinction is important.

Users should understand whether AI is:

- converting source material,
- or executing an editorial brief.

---

## Publish Workflow

Publishing should be the last mile only.

By the time the user reaches publish state, they should already have:

- selected the topic
- chosen the persona
- clarified the angle
- generated the draft
- reviewed the CTA

### Publish area should focus on:

- final copy
- suggested time
- suggested CTA
- post now
- schedule

It should not become a dumping ground for every other workflow.

---

## WordPress Workflow

WordPress should behave as a knowledge expansion and archive layer.

It should not compete with Threads as the primary fast-posting interface.

### WordPress is mainly for:

- expanding a strong Threads idea
- preserving knowledge long-term
- adding affiliate blocks
- adding resource blocks
- preparing long-form drafts

### Recommended flow

1. Test topic on Threads
2. Watch performance
3. Decide if it should become long-form
4. Create WordPress draft
5. Refine inside WordPress workflow

In one line:

`Threads validates attention -> WordPress accumulates value`

---

## Autopilot Workflow

Autopilot should be review-first by default.

### Good autopilot behavior

1. Watch source pools
2. Prefer high-writeability inputs
3. Consider persona strategy
4. Consider recent performance
5. Consider recent reply signals
6. Generate daily candidate drafts
7. Push drafts into review queue

### Optional later behavior

For selected personas only:

- auto schedule
- limited auto publish

But full autonomy should not be the default.

### User expectation

Autopilot should feel like:

`AI prepared the day’s content board for me`

not:

`AI posted things without enough editorial control`

---

## Analytics and Feedback Workflow

Analytics should not just show numbers.

It should answer:

- what worked
- why it worked
- which persona is winning
- which post should be rewritten
- which comments suggest a follow-up topic

### Feedback loop actions

From a strong post, the user should be able to:

- generate follow-up draft from replies
- summarize reply insights
- turn a winning post into a WordPress draft
- feed performance insights back into autopilot

---

## Long-Term Knowledge Workflow

The system should support long-term content accumulation, not just daily posting.

### Long-term content inputs

- research articles
- macro notes
- YouTube transcript
- podcast transcript
- personal notes
- future CMS / docs inputs if needed

### Long-term content outputs

- educational Threads
- evergreen WordPress drafts
- reusable source archive
- editorial knowledge base

The long-term goal is:

`Every consumed signal can become reusable media inventory`

---

## UX Anti-Patterns To Avoid

The product should avoid:

### 1. Directly dropping candidates into publish form

This skips editorial thinking too early.

### 2. Black-box buttons

If a user clicks something, the system must clearly show:

- what is happening
- what was created
- where to go next

### 3. Too many fragmented entry points

There should be one dominant mental model, not many disconnected tools.

### 4. Heavy dashboard visuals

The product should prefer:

- clean numbers
- status labels
- rationale text

instead of decorative charts everywhere.

### 5. WordPress as a second fast publishing channel

That confuses the core content flow.

---

## Final Desired User Journey

The product should ultimately feel like this:

1. I open Desk
2. I immediately know what is worth doing today
3. I click a candidate
4. I give AI an assignment
5. AI generates a solid first draft
6. I confirm it
7. I publish or schedule to Threads
8. Strong content becomes WordPress drafts
9. Feedback loops improve future content automatically

In one sentence:

`The platform should help a creator continuously turn signals, knowledge, and feedback into an AI-assisted publishing engine.`
