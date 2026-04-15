# Social Audio PRD

> Version: v2.3  
> Updated: 2026-04-14  
> Status: Active Build  
> Repo: https://github.com/hd961245/social-autio

## 1. Product Summary

### 1.1 Positioning

Social Audio is a `Threads-first personal publishing OS`.

It is designed for one operator who wants to:

- publish and schedule Threads content
- collect outside material and rewrite it fast
- keep WordPress as a draft-only longform studio
- preserve monetization structure such as affiliate links, promo blocks, and CTA sections

This is not a team SaaS and not a broad social media suite.
It is a focused personal content operating system.

### 1.2 Product Thesis

The user does not need more dashboards.
The user needs one place where source collection, rewrite, editorial triage, and draft production are connected.

The core promise is:

- less time moving material around
- more consistent voice
- better reuse of old content
- faster path from source to editable draft

### 1.3 Product Promise

If the user gives the system a source URL, RSS item, pasted text, screenshot, or one of their old WordPress posts, the system should quickly turn it into:

- a sharper Threads draft
- a more structured WordPress draft
- both editable
- with WordPress always staying in `draft`, never auto-published

## 2. Target User

This product is built for `one person running their own content machine`.

Typical user traits:

- writes on Threads often
- also runs a WordPress blog
- republishes ideas across formats
- wants AI acceleration without losing editorial control
- uses recommendations, affiliate links, or promo links intentionally

Non-goals for target audience:

- agencies
- teams
- enterprise content ops
- multi-user review workflows
- billing / subscription products

## 3. Product Scope

### 3.1 Current Scope

- Threads account connection and publishing
- Threads queue, scheduling, and draft editing
- Threads-first analytics
- Content Engine for source ingestion and rewrite
- URL preview before rewrite
- WordPress connection via Application Password
- WordPress draft create / update only
- WordPress writing-style analysis from old posts
- WordPress archive rewrite into fresh drafts
- WordPress templates and affiliate slot blocks
- Source Watchlist for repeat inputs
- Source Inbox for daily triage
- Content Desk for one-page workflow switching
- source dedupe and handled-state tracking
- automatic source refresh via Inngest

### 3.2 Non-Goals Right Now

- direct WordPress publishing
- automatic crawling of followed Threads accounts
- Facebook profile crawling
- multi-user accounts and permissions
- SaaS billing
- generalized cross-platform management

## 4. Main User Flows

### 4.1 Threads Flow

1. User opens `Compose`
2. User writes or edits a Threads draft
3. User publishes immediately or schedules it
4. System tracks status and surfaces it in Queue
5. Published Threads posts can later become WordPress drafts

### 4.2 Content Engine Flow

1. User opens `Content Engine`
2. User inputs a source:
   - URL
   - raw text
   - image-led input
3. User optionally previews extracted content
4. User selects AI provider
5. User selects WordPress article template
6. System creates:
   - Threads draft
   - WordPress draft
7. User opens drafts in `Compose` for refinement

### 4.3 WordPress Draft Studio Flow

1. User connects a WordPress site
2. System can create or update a draft on that site
3. Draft stays in WordPress backend as `draft`
4. User can continue editing in:
   - this app
   - WordPress backend

### 4.4 Style Learning Flow

1. User opens `WordPress`
2. User clicks `分析我的舊文`
3. System reads the user’s own past articles
4. AI produces:
   - writing style profile
   - affiliate / promo planning profile
5. Future drafts use those profiles automatically

### 4.5 Archive Rewrite Flow

1. User opens `WordPress`
2. System lists recent old articles
3. User clicks `複寫成新草稿`
4. System generates a fresh WordPress draft with a new angle
5. Draft preserves room for:
   - affiliate links
   - tool recommendations
   - CTA blocks

### 4.6 Source Watchlist Flow

1. User opens `來源`
2. User adds a recurring source:
   - RSS
   - article page
   - blog URL
3. User manually refreshes, or waits for scheduled refresh
4. System stores the latest fetched item and marks it as:
   - `待處理`
   - `已改寫`
   - `已跳過`
5. System avoids duplicate import for already-handled latest items

### 4.7 Source Inbox Flow

1. User opens `Inbox`
2. System shows the latest candidate item from each tracked source
3. Each item gets lightweight scoring:
   - Threads score
   - WordPress score
   - commercial potential
4. System recommends:
   - Threads first
   - WordPress first
   - dual use
5. User triages with:
   - rewrite now
   - skip
   - open source

### 4.8 Content Desk Flow

1. User opens `Content Desk`
2. User switches between:
   - Inbox
   - Sources
   - Engine
   - Queue
3. User stays inside one workflow surface instead of bouncing across multiple pages

## 5. Functional Requirements

### F1. Threads Account Management

Priority: P0

- connect Threads via OAuth
- store token state
- surface account identity and freshness
- keep UI centered around Threads-first publishing

### F2. Threads Drafting and Scheduling

Priority: P0

- create draft
- edit draft
- publish now
- schedule post
- manage queue
- search and filter queue
- convert published Threads posts into WordPress drafts

### F3. Content Engine

Priority: P0

- accept source URL, text, and image-style input
- preview URL extraction before rewrite
- allow provider selection:
  - Auto
  - Gemini
  - Claude
  - OpenAI
- generate Threads + WordPress outputs together
- keep outputs editable

### F4. WordPress Draft Studio

Priority: P0

- connect via site URL + username + Application Password
- create WordPress draft
- update WordPress draft
- show connected sites
- never auto-publish

### F5. Writing Style Memory

Priority: P1

- learn from the user’s own WordPress archive
- infer style habits:
  - title shape
  - opening rhythm
  - paragraph pacing
  - analysis style
  - closing pattern
- infer monetization pattern:
  - affiliate link positioning
  - promo tone
  - CTA structure

### F6. Archive Rewrite

Priority: P1

- list old WordPress posts
- one-click rewrite into a fresh new draft
- do not overwrite source article
- generate a distinct angle rather than shallow paraphrase

### F7. WordPress Templates

Priority: P1

Support at least:

- `觀點文`
- `案例拆解`
- `工具推薦`
- `週報 Recap`

Template behavior:

- shape the WordPress draft structure
- guide headings and CTA logic
- preserve room for monetization blocks

### F8. Affiliate Slot Support

Priority: P1

- generated WordPress drafts must preserve a recommendation / affiliate section
- Compose should allow manual insertion of affiliate slot blocks
- system should carry affiliate planning forward from writing-style learning

### F9. Source Watchlist

Priority: P1

- user can save repeat sources
- sources support at least `rss` and `url`
- source can be refreshed on demand
- latest fetched item is stored on the source record
- source status can be marked as:
  - new
  - imported
  - skipped
- duplicate latest items should not create repeated drafts

### F10. Source Inbox

Priority: P1

- show latest candidates across tracked sources
- support daily triage
- support one-click rewrite from inbox
- support skip action
- support simple scoring and recommendation

### F11. Content Desk

Priority: P1

- consolidate inbox, source watchlist, content engine, and queue into one workflow-first workspace
- use horizontal tab-style switching as the primary content workflow entry
- keep the standalone pages available, but make the desk the default daily operating path

### F12. Source Auto Refresh

Priority: P2

- tracked active sources should auto-refresh on a schedule
- current cadence: every 3 hours
- refresh should update latest item and reset handled state when content changes

### F13. Analytics

Priority: P1

- stay focused on Threads
- support editorial decisions
- identify promising posts and rewrite opportunities
- show benchmark-style rates, not just raw counts
- include per-post deep dive with timeline, momentum read, and next-step recommendation
- support account-level and time-window filtering for daily review

## 6. UX Principles

### 6.1 Threads First

The app should always feel like a Threads control room first, with WordPress as the longform drafting layer.

### 6.2 Draft Before Publish

WordPress is a draft destination, not an auto-publishing channel.

### 6.3 Rewrite, Don’t Just Summarize

AI should output useful drafts, not flat notes.

### 6.4 Preserve Monetization Intent

The system should not erase affiliate structure or CTA logic when rewriting content.

### 6.5 Reduce Daily Friction

The app should progressively remove repeated manual work:

- repeated source entry
- repeated content triage
- repeated structural formatting
- repeated page-hopping across scattered tools

### 6.6 Navigation Should Follow Workflow

Primary navigation should foreground the main lane:

- Content Desk
- Compose
- Analytics

Secondary system pages should be grouped into horizontal navigation with dropdown-style reveal, instead of staying flattened in one long menu.

## 7. AI Design

### 7.1 AI Responsibilities

- summarize source material
- rewrite in the user’s voice
- create platform-shaped outputs
- learn from past WordPress writing
- preserve affiliate and promo intent
- help turn archives into fresh drafts

### 7.2 AI Constraints

- Threads output stays concise
- WordPress output must feel like article skeletons, not note dumps
- archive rewrites should feel meaningfully fresh
- drafts must leave room for human editorial judgment

### 7.3 Provider Strategy

Supported providers:

- Gemini
- Claude
- OpenAI
- Auto fallback mode

Provider selection remains user-controlled for rewrite tasks.

## 8. Technical Direction

### 8.1 Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Inngest

### 8.2 Core Stored Entities

- `PlatformAccount`
- `Post`
- `IngestionRecord`
- `AppSettings`
- `SourceWatch`

### 8.3 AppSettings Responsibilities

- default tone
- AI provider preference
- global persona prompt
- writing style profile
- affiliate link policy

### 8.4 Integration Direction

Threads:

- publish and read owned-account data through official API flows

WordPress:

- connect via REST API + Application Password
- read own posts
- create and update drafts

Sources:

- RSS and direct article URLs
- latest-item tracking with dedupe fingerprint

## 9. Success Criteria

### 9.1 Product Success

The system is successful if the user can regularly do this without friction:

- monitor repeat sources
- open Inbox and know what to process first
- rewrite source material fast
- keep their own voice across Threads and WordPress
- re-use old content without starting from zero
- preserve commercial intent while staying editorially natural

### 9.2 Quality Bar

- WordPress drafts should look like editable article structures
- Threads drafts should feel sharper than the original source
- source triage should reduce cognitive load
- duplicate content should not repeatedly create drafts
- affiliate sections should feel intentional, not spammy

## 10. Near-Term Roadmap

### Phase A: Already In

- Threads-first publishing
- WordPress draft-only flow
- URL import preview
- style learning from archive
- archive rewrite
- WordPress templates
- affiliate slot sections
- source watchlist
- source inbox
- dedupe and handled states
- scheduled source refresh

### Phase B: Next High-Value Additions

- affiliate slot library with reusable real CTA blocks
- learning loop from user triage behavior
- richer source extraction controls
- better scoring tuned to user output patterns
- RSS history instead of latest-item only

### Phase C: Later If Still Valuable

- Facebook Page copy generation
- more import formats
- smarter performance feedback loop
- deeper editorial scoring from post outcomes

## 11. Final Product Rule

This product should keep moving toward:

`one-person content operating system`

and away from:

`generic multi-platform scheduler`.
