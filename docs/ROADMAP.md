# Social Audio Next-Stage Roadmap

> Version: v1.0  
> Updated: 2026-04-16  
> Scope: next-stage optimization plan for evolving into a self-media entrepreneur management console

## 1. Roadmap Goal

The next stage is not about adding more platforms.

It is about making the current system:

- more reliable
- more state-aware
- more asset-oriented
- more persona-aware
- more monetization-aware

The product already has strong breadth.
The roadmap now focuses on depth and operational trust.

## 2. Phase Order

### Phase A. Reliability First

Priority: P0

This phase should land first.

Core work:

- Threads publish outcome log
- clearer publish error messages
- token expiry warning and preflight state
- scheduler failure visibility and retry hints
- WordPress draft backend status sync
- WordPress draft last-edited / scheduled / published visibility

Why this comes first:

- if publishing feels unreliable, the rest of the console loses trust
- if WordPress state is blind, long-form workflow always feels half-connected

Definition of done:

- the user can tell what happened to a post without guessing
- the user can tell whether a WordPress draft still needs work
- failure states point to the next action clearly

## 3. Phase B. Content Asset Layer

Priority: P1

Core work:

- content inventory filtering
- topic / pillar tags
- business intent tags
- reusable asset status
- better source-to-draft lineage
- stronger “expandable” and “monetizable” signals

Why it matters:

- content should stop being treated as isolated posts
- this phase turns the system into a reusable content asset library

Definition of done:

- the user can find reusable ideas quickly
- the user can identify what deserves long-form treatment
- the user can see what content is close to revenue use

## 4. Phase C. Persona Learning

Priority: P1

Core work:

- track which hook types perform best per persona
- track which CTA types are actually retained by the user
- learn which source types fit which persona
- improve routing from real outcomes, not just prompt overlap

Why it matters:

- multiple Threads accounts only become powerful when each one gets smarter over time

Definition of done:

- each persona has a clearer winning pattern
- system recommendations feel less generic
- routing becomes more accurate after repeated use

## 5. Phase D. Revenue Layer

Priority: P2

Core work:

- affiliate module performance notes
- CTA usage memory
- offer-aware content suggestions
- monetization readiness scoring
- stronger WordPress draft monetization scaffolds

Why it matters:

- this product is moving toward creator-business operations, not just content drafting

Definition of done:

- monetization blocks feel intentional
- the user can identify which topics are more commercially viable
- drafts are closer to business-ready before backend refinement

## 6. Phase E. Operating Console

Priority: P2

Core work:

- launch-mode or campaign grouping
- content planning by goal
- offer-linked content view
- simple business review layer

Why it matters:

- this is the step that completes the transition from “tool” to “console”

Definition of done:

- the user can see content, repurposing, and monetization as one system
- the app supports operating a self-media business, not only publishing posts

## 7. Recommended Build Order

1. Publish reliability
2. WordPress backend status sync
3. Content inventory metadata
4. Persona learning
5. Revenue layer
6. Campaign / operating console features

## 8. Immediate Recommendation

If only one thing is built next, it should be:

`publish reliability + WordPress backend status sync`

This is the shortest path to making the whole console feel trustworthy.
