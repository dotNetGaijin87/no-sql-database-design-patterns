# 011 — Computed Pattern

**Script:** [`src/011_computed.js`](../../src/011_computed.js) · [Pattern index](../../README.md#the-patterns)

## The problem
A product page shows an **average rating** and a **review count**. Recomputing those by aggregating the `reviews` collection on every page view is wasteful: the answer changes rarely (only when a review is written) but is read constantly.

## The solution
Move the work to **write time**. Compute `avgRating` and `numReviews` once, cache them on the product, and refresh when a review changes. The hot read becomes a single-document fetch with no aggregation. The script backfills the rollup for every product (`$group` over reviews), gives review-less products an explicit zero, and demonstrates the **incremental** refresh — when a new rating lands, nudge the cached average and count in one atomic update instead of re-aggregating the whole collection.

## Key techniques
An aggregation `$group` backfill, caching the result on the parent document, an incremental running-average update, and rounding for display stability.

## Trade-offs & when *not* to use it
Compute-on-write wins when reads vastly outnumber writes and mild staleness is fine (a rating a few seconds behind is invisible). The cache can drift if a write path forgets to update it — keep the refresh next to the review write, or run a periodic reconciliation aggregate, so a missed update is caught. If you need exact, always-consistent numbers (accounting balances), compute inside a transaction with the write or aggregate live and skip the cache. Related: the extended reference ([005](005-extended-reference.md)) caches *fields*, this caches an *aggregate* — both trade write work for cheap reads (the document analog of the relational computed column, 022).

---
[← 010 Attribute pattern](010-attribute-pattern.md) · [Pattern index](../../README.md#the-patterns) · [next → 012 Tree structures](012-tree-structures.md)
