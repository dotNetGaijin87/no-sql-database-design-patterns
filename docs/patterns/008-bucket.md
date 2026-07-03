# 008 — Bucket Pattern

**Script:** [`src/008_bucket.js`](../../src/008_bucket.js) · [Pattern index](../../README.md#the-patterns)

## The problem
[007](007-referencing-unbounded.md) kept product-view `activity` as one document per event — correct (never embed an unbounded stream), but at scale one-doc-per-event is its own problem: billions of tiny documents, an enormous index, and a working set that won't fit in RAM.

## The solution
The **middle ground** between "embed everything" and "one doc per event": group events into **bucket** documents. Here each bucket holds one customer's activity for one day — a bounded `events` array plus a `count`. "What did this customer do on day D" becomes a single bucket fetch instead of N event reads, and the document count drops by the bucket factor. The script rolls the raw events into buckets, then shows the real write path: an **upsert** that `$push`es into the current bucket with `$slice` to cap the array and `$inc`s the count — no read, no growing parent.

## Key techniques
Grouping by a derived bucket key (`customerId|day`), a capped array via `$push … $slice`, a running `$inc` count, and the append-via-upsert write pattern.

## Trade-offs & when *not* to use it
Choose a bucket grain (per hour / per day / fixed N) that keeps a bucket well under 16 MB and matches your read window — you almost always fetch a whole bucket, so bucket by how you read. `$slice` caps a hot bucket so overflow rolls into the next one; keep a `count` for totals without scanning. Don't bucket low-volume data you filter *inside* (you'd fetch a big array to use one element). Bucketing trades granular queryability for read/write efficiency — it shines for append-mostly time-series (metrics, activity, IoT). It's the document analog of the relational repo's horizontal partitioning (014): same data-skew problem, grouped rather than split.

---
[← 007 Referencing (unbounded)](007-referencing-unbounded.md) · [Pattern index](../../README.md#the-patterns) · [next → 009 Many-to-many](009-many-to-many.md)
