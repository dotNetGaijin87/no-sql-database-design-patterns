# 014 — Anti-Patterns & Diagnostics (appendix)

**Script:** [`src/014_anti_patterns.js`](../../src/014_anti_patterns.js) · [Pattern index](../../README.md#the-patterns)

## The problem
It's easy to carry relational habits into a document store and only discover it in production — a document creeping toward the 16 MB limit, an array growing without bound, a collection every query scans, PII sitting in the clear.

## The solution
A **read-only** appendix, mirroring the sister repos. It changes nothing; it **introspects** the finished database for the smells the earlier patterns exist to prevent, so you can run the same checks against your own data. It reports four things:

- **Document size** — the biggest document per collection, against the 16 MB ceiling.
- **Array growth** — the largest array in each array field, flagging anything that could grow unbounded (order items, wishlist, bucket events, ancestors — all bounded here, by design).
- **Index coverage** — collections with no index beyond `_id` (every other query a `COLLSCAN`).
- **Relational-habit smells** — a checklist that should read `0`: raw PAN, a split `orderLines`, duplicate id fields, category path strings — each pointing back to the pattern that removed it.

## Key techniques
`$bsonSize` for document weight, `$size` over array fields, `getIndexes()` coverage checks, and `countDocuments` probes for the legacy smells — all read-only.

## Trade-offs & when *not* to use it
This is a diagnostic, not a fix: it tells you *where* to look, and each finding points at the pattern that addresses it (embed [003](003-embedding.md), reference [007](007-referencing-unbounded.md), bucket [008](008-bucket.md), index by ESR [002](002-indexing-strategy.md), discriminate [006](006-supertype-subtype.md)). Run it last, or against any database, any time. Safe by construction — it never writes (beyond stamping its own migration record).

---
[← 013 Lifecycle & integrity](013-lifecycle.md) · [Pattern index](../../README.md#the-patterns)
