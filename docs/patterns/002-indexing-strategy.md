# 002 — Indexing Strategy (the ESR rule)

**Script:** [`src/002_indexing_strategy.js`](../../src/002_indexing_strategy.js) · [Pattern index](../../README.md#the-patterns)

## The problem
Re-keying (001) made `_id` lookups fast, but real screens query by other fields — "this customer's orders, newest first", "products in a category by price". With no index each of those is a `COLLSCAN` that reads every document and then sorts the results in memory. In the script, "orders for C1 newest-first" examines all 8 documents to return 2, with a blocking `SORT` stage.

## The solution
Add indexes that match the query, and order their keys by the **ESR rule**: **E**quality fields first, then the **S**ort field, then any **R**ange field. A compound `{ customerId: 1, orderDate: -1 }` both filters *and* returns rows already in order — the same query drops to a `FETCH` that examines exactly the 2 documents it returns, with no in-memory sort. The script walks the full ladder: single-field → compound (ESR) → three-part ESR (`status` = eq, `orderDate` = sort+range) → a **covered** query served entirely from the index (`totalDocsExamined: 0`) → a **partial** index over only the software products that have a `requiredRam` → a **collation** index for case-insensitive name lookups.

## Key techniques
`createIndex`, compound & multikey keys, `explain('executionStats')` (reading `totalDocsExamined` vs `nReturned`), covered queries via projection, `partialFilterExpression`, and `collation: { locale, strength: 2 }` for case-insensitive matches.

## Trade-offs & when *not* to use it
Every index speeds reads but taxes writes and lives in RAM (the working set), so index for the queries you actually run — not every field. A compound index also serves any **prefix** of its keys, so `{ customerId, orderDate }` already covers plain `{ customerId }` queries; the standalone `customerId` index in the script is redundant and kept only to make that point visible. Most importantly: **you cannot index your way out of a bad model.** If a screen always needs an order *with* its lines, the real fix isn't a faster `$lookup` — it's embedding them, which is [003](003-embedding.md).

---
[← 001 Identity & keys](001-identity-and-keys.md) · [Pattern index](../../README.md#the-patterns) · [next → 003 Embedding](003-embedding.md)
