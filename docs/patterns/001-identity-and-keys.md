# 001 — Identity & Keys

**Script:** [`src/001_identity_and_keys.js`](../../src/001_identity_and_keys.js) · [Pattern index](../../README.md#the-patterns)

## The problem
Every document already has a unique, automatically-indexed primary key — the mandatory `_id`. The naive port ignored it: it let MongoDB fill `_id` with a random `ObjectId` **and** stored the real business id (`'C1'`, `'P001'`) in a separate field. That wastes a field, forces a *second* index once you make the business id unique, and means the id your app actually queries by is not the one the engine is built around.

## The solution
Promote the natural business key to `_id` (`_id: 'C1'`) and drop the redundant field, so an id lookup becomes the fastest read MongoDB can do (an `IDHACK` plan). For the remaining identity fields that aren't the `_id` — a customer's `email`, an order line's `(orderId, productId)` pair — add **unique indexes**. This is the document-store analog of the relational repo's *primary key* pattern; here you get the PK index for free and only pay for the alternate keys.

## Key techniques
Rebuilding documents to re-key an immutable `_id` (read → reshape → `drop` → `insertMany`; on big collections you'd `$out`/`$merge` instead), `createIndex(..., { unique: true })`, a unique compound index for a composite natural key, an idempotency guard, and the deck's data-type rule — store ids as ids, dates as `ISODate`, numbers as numbers.

## Trade-offs & when *not* to use it
A natural `_id` is ideal only when it's short, stable and never reused. If the "natural" key can change (an email, a mutable SKU) or you don't own it, keep the default `ObjectId` as `_id` and put a unique index on the business key instead — you can't change an `_id` later without rewriting the document. And beware the opposite failure: a monotonically increasing `_id` (an `ObjectId`, or a counter) sends every insert to one end of the key range, creating a shard hot spot — the very problem [008 bucketing](../../README.md#the-patterns) and a good shard key exist to avoid. Not every collection deserves a meaningful `_id`: `orderLines` has no single natural key, so it keeps its `ObjectId` (and vanishes entirely in [003](003-embedding.md)).

---
[← 000 Initial naive port](000-initial-naive.md) · [Pattern index](../../README.md#the-patterns) · [next → 002 Indexing strategy](002-indexing-strategy.md)
