# Social Audio PRD

> Version: v2.0  
> Updated: 2026-04-14  
> Status: Active Build  
> Repo: https://github.com/hd961245/social-autio

## 1. Product Summary

### 1.1 Positioning

Social Audio is a `Threads-first personal publishing OS`.

It is not a generic multi-tenant SaaS, and it is not a broad social media management suite.
It is a focused tool for one operator to do three things well:

- publish and review Threads content
- turn ideas, links, and source materials into editable drafts
- keep WordPress as a `draft-only longform workspace`

### 1.2 Product Thesis

The user does not need another “post scheduler”.
The user needs a single place to:

- collect source material
- rewrite it in their own voice
- decide whether it should become a Threads post, a WordPress draft, or both
- preserve monetization planning such as affiliate links and promo CTAs

### 1.3 Product Promise

If the user drops in a source URL, a pasted note, a screenshot, or one of their own old articles, the system should quickly produce:

- one sharper Threads-ready draft
- one more structured WordPress draft
- both in editable form, never auto-published to WordPress

## 2. Target User

This product is designed for `one person operating their own content system`.

Primary user profile:

- writes on Threads regularly
- also maintains a WordPress blog
- republishes, reframes, and recycles ideas across formats
- wants drafts faster, but still wants human control before final publish
- may use affiliate links, product mentions, promo links, and CTA blocks intentionally

This product is explicitly not optimized for:

- teams
- agencies
- multi-user permissions
- billing / subscriptions
- enterprise workflows

## 3. Product Scope

### 3.1 Current Core Scope

- Threads account connection and publishing
- Threads draft queue and scheduling
- Threads analytics review
- AI-powered content ingestion and rewrite
- WordPress connection via Application Password
- WordPress draft creation and draft updating only
- WordPress archive analysis to learn writing style
- WordPress archive rewrite into new editable drafts

### 3.2 Explicit Non-Goals Right Now

- direct WordPress publishing
- Facebook profile crawling
- automatic crawling of arbitrary followed Threads accounts
- collaboration features
- approval workflows across multiple users
- multi-platform social suite positioning

## 4. Main User Flows

### 4.1 Threads Publishing Flow

1. User opens `Compose`
2. User writes or edits a Threads draft
3. User publishes immediately or schedules it
4. System sends to Threads and tracks status
5. Published posts can later be turned into WordPress drafts

### 4.2 Source-to-Draft Flow

1. User opens `Content Engine`
2. User inputs one of:
   - URL
   - raw text
   - image URLs / screenshots
3. System previews source extraction when possible
4. System rewrites content using selected AI provider and saved writing guidance
5. System creates:
   - Threads draft
   - WordPress draft
6. User opens draft in `Compose` for final editing

### 4.3 WordPress Draft Flow

1. User connects a WordPress site
2. User creates or updates longform content from:
   - Content Engine
   - Compose
   - Threads sync
   - archive rewrite
3. System sends post to WordPress as `draft`
4. User opens WordPress backend and finishes layout / SEO / embeds there if needed

### 4.4 Archive Rewrite Flow

1. User opens `WordPress`
2. System lists the user's recent WordPress articles
3. User chooses one old article
4. System rewrites it into a fresh new draft in the user's writing style
5. System preserves room for affiliate links, promo blocks, and CTA placement
6. User is redirected to `Compose` to refine the new draft

### 4.5 Writing Style Learning Flow

1. User connects WordPress
2. User clicks `分析我的舊文`
3. System reads a selected number of the user's own existing articles
4. AI produces:
   - writing style profile
   - affiliate / promo planning profile
5. Future generated drafts use these profiles automatically

## 5. Functional Requirements

### F1. Threads Account Management

Priority: P0

- connect Threads account via OAuth
- store active account and token state
- surface account identity and sync status
- keep a Threads-first mental model throughout the UI

### F2. Threads Drafting and Scheduling

Priority: P0

- create draft
- edit draft
- immediate publish
- schedule publish
- keep queue searchable and filterable
- support turning published Threads posts into WordPress drafts

### F3. Content Engine

Priority: P0

- accept URL, text, or image-led source material
- allow provider choice: `Auto / Gemini / Claude / OpenAI`
- preview extracted content from URLs before rewrite
- generate two outputs by default:
  - Threads draft
  - WordPress draft
- keep outputs editable, not locked

### F4. WordPress Draft Studio

Priority: P0

- connect WordPress using site URL, username, and Application Password
- create new WordPress draft
- update existing synced WordPress draft
- never auto-publish to WordPress
- surface connected sites and their freshness

### F5. Writing Style Memory

Priority: P1

- read user's own WordPress archive
- infer writing rhythm, title style, intro style, transition patterns, conclusion habits
- infer monetization preferences and safe CTA patterns
- save both as reusable style instructions in app settings

### F6. Archive Rewrite

Priority: P1

- show recent WordPress archive articles
- allow one-click rewrite into a new draft
- do not overwrite the source article
- generate a distinct new angle, not a shallow paraphrase
- preserve places for affiliate links and promo mentions

### F7. Analytics

Priority: P1

- keep analytics focused on Threads
- show current performance, trends, and next rewrite opportunities
- support editorial decision-making, not vanity dashboards

## 6. UX Principles

### 6.1 Threads First

The app should feel like a Threads operating room with a connected longform drafting layer, not like a generic social media admin panel.

### 6.2 Draft Before Publish

WordPress content should default to human review.
The system accelerates writing, but does not remove editorial control.

### 6.3 Rewrite, Don’t Just Summarize

Every AI output should aim to become publishable material, not a flat summary blob.

### 6.4 Preserve Monetization Intent

If the user historically uses affiliate links or promo CTAs, the system should keep room for them and reflect that pattern in generated drafts.

### 6.5 Keep the User in Flow

The path from source material to editable draft should be short:

- import
- preview
- generate
- edit
- publish or save as draft

## 7. AI System Design

### 7.1 AI Responsibilities

- summarize source material
- rewrite in the user's voice
- produce platform-shaped outputs
- learn from prior WordPress writing
- preserve affiliate / promo planning

### 7.2 AI Constraints

- Threads output must stay concise and punchy
- WordPress output must feel like a real article draft with sections
- archive rewrites must not become near-duplicate copies
- AI must leave room for human editing and final judgment

### 7.3 Provider Strategy

The system supports:

- Gemini
- Claude
- OpenAI
- Auto fallback mode

Provider selection should stay user-controlled for rewrite tasks.

## 8. Technical Direction

### 8.1 Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Inngest

### 8.2 Data Model Direction

Core persisted objects:

- `PlatformAccount`
- `Post`
- `IngestionRecord`
- `AppSettings`

Important `AppSettings` responsibilities:

- default tone
- AI provider preference
- global persona prompt
- writing style profile
- affiliate link policy

### 8.3 Integration Direction

Threads:

- publish and read account-related data through official API flows

WordPress:

- connect via REST API + Application Password
- read own posts
- create and update drafts

## 9. Success Criteria

### 9.1 Product Success

The product is working if the user can regularly do this without friction:

- drop in a source
- get a Threads draft worth editing
- get a WordPress draft worth refining
- re-use old articles as material for new drafts
- keep their own writing style intact

### 9.2 Quality Bar

- generated WordPress drafts should look like article skeletons, not note dumps
- generated Threads drafts should feel sharper than the source
- old-article rewrites should feel meaningfully fresh
- monetization blocks should remain intentional, not spammy

## 10. Near-Term Roadmap

### Phase A: Locked In

- Threads-first publishing
- WordPress draft-only workflow
- URL import preview
- archive style analysis
- archive rewrite into new drafts

### Phase B: Next Best Additions

- reusable WordPress article templates
- stronger CTA / affiliate block insertion helpers
- source watchlist for RSS and selected blogs
- richer import preview with cleaner extraction controls

### Phase C: Later, If Still Valuable

- Facebook Page copy generation
- more source ingestion formats
- smarter editorial scoring
- partial automation around recurring content recycling

## 11. Final Product Rule

This product should continue moving toward:

`one-person content operating system`

and away from:

`generic multi-platform scheduler`.
