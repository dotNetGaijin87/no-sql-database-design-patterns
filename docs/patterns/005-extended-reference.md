# 005 — Extended Reference

**Script:** [`src/005_extended_reference.js`](../../src/005_extended_reference.js) · [Pattern index](../../README.md#the-patterns)

## The problem
[003](003-embedding.md) embedded a bounded, dependent entity. Reviews are the opposite case: they're **shared** (shown on both the product page and the customer page) and written on their own timeline, so they stay in their own collection and are *referenced*. But a review that references its author and product by **id only** forces a `$lookup` on every review list just to display a name.

## The solution
Copy the handful of fields you always render — `authorName`, `productName` — **next to** the ids on each review. A product's review list now renders from the `reviews` collection alone, no join, backed by a compound index (`{ productId, createdAt }`, ESR). The ids stay as the source of truth and the path back to the full document; the copies are a read-time cache.

## Key techniques
`forEach` + `updateOne` `$set` to denormalize the copies, an ESR compound index for the hot "reviews for a product, newest first" query, and a demonstrated **fan-out refresh** (rename a customer → the copies go stale → `updateMany` the copies → revert), which makes the write-side cost explicit.

## Trade-offs & when *not* to use it
Only copy fields that are small, read far more than written, and tolerant of brief staleness — a name or a thumbnail, yes; a live price or a stock level you must never show wrong, no (reference it or recompute). The copy is a cache, not the truth: keep the fan-out update next to the source-of-truth write so the two never drift far, and don't extend-reference a field that changes constantly (you'd spend more on refreshes than you save on reads). This is the reference-side cousin of [003](003-embedding.md)'s embedding and of the computed pattern (011) — all three trade write-time work for a cheaper read.

---
[← 004 Snapshot data](004-snapshot.md) · [Pattern index](../../README.md#the-patterns) · [next → 006 Supertype/subtype](006-supertype-subtype.md)
