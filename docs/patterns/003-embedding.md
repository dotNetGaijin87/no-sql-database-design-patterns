# 003 — Embedding (one-to-few / the dependent entity)

**Script:** [`src/003_embedding.js`](../../src/003_embedding.js) · [Pattern index](../../README.md#the-patterns)

## The problem
The relational schema splits an order into an `orders` header and an `orderLines` detail table, and the naive port copied that split faithfully. But an app almost never wants an order *without* its lines — the order screen, the invoice, the total all read them together. In the document store that split means a `$lookup` (a join) on the single hottest read path in the whole application.

## The solution
Fold the lines **into** the order as an embedded `items` array. An order and its lines are a textbook **dependent entity**: the lines have no independent life, you always read them with the order, and there are only a handful per order (one-to-*few*). After the migration the entire order — header plus every line — is one self-contained document, read with a single `_id` lookup and no join. This is the defining document pattern, and the exact inverse of the graph repo's headline move (which turns a foreign key into a relationship you traverse). Totals now compute straight from the array with `$map` + `$sum`, and a **multikey** index on `items.productId` still answers "which orders contain P001?".

## Key techniques
`forEach` + `updateOne` with `$set` to embed, snapshotting the product `name`/`listPrice` at order time, dropping the now-empty detail collection, aggregation over an embedded array (`$map`, `$sum`, `$size`), and multikey indexing of an array field.

## Trade-offs & when *not* to use it
Embed for one-to-one and one-to-**few** dependent data that you read together and that is **bounded**. Do **not** embed an unbounded "many" side — an array that grows forever (a customer's every order, a product's every review, a user's activity feed) eventually hits the **16 MB document limit** and makes every write rewrite a huge document; those stay in their own collection and are *referenced* ([007](../../README.md#the-patterns)), with the high-volume variant handled by the bucket pattern ([008](../../README.md#the-patterns)). Do not embed data that is shared or independently updated either: reviews live on their own timeline and appear on multiple screens, so they stay a collection and use an *extended reference* ([005](../../README.md#the-patterns)). The course's rule of thumb: *data accessed together should be stored together* — **but only when the together-side is bounded.**

---
[← 002 Indexing strategy](002-indexing-strategy.md) · [Pattern index](../../README.md#the-patterns) · [next → 004 Snapshot data](004-snapshot.md)
