# 000 — Initial Naive Port & Diagnostic Tooling

**Script:** [`src/000_initial_naive.js`](../../src/000_initial_naive.js) · [Pattern index](../../README.md#the-patterns)

## The problem
The fastest way to get a relational schema into MongoDB is also the wrong way: one collection per table, every relationship faked with a string foreign key, and no indexes. It *works* — but it throws away everything a document store is good at and keeps everything a relational database was good at (minus the joins, transactions and constraints you just gave up). This script builds exactly that naive port so the later migrations have real, concrete anti-patterns to fix.

## The solution
There is no "solution" here yet — this is the deliberately-imperfect starting point, the document-store sibling of the relational repo's `000_initial_schema` + `seed_db` and the graph repo's `000_initial_graph`. It seeds the same `OnlineStore` domain (6 customers, 10 products, 8 orders + 13 order lines, 6 reviews) so all three repos read as one set, and it ships the **diagnostics** every later lesson leans on: collection counts, an order read that needs a `$lookup`, `getIndexes()`, and `explain()` showing a `COLLSCAN`.

## Key techniques
`insertMany`, `ISODate` for real date types, `$lookup` (to show the join we're about to design away), `explain('queryPlanner')`, `getCollectionNames`, and the `_migrations` bookkeeping collection.

## The anti-patterns baked in (and where each is fixed)
| Smell in the naive port | Fixed in |
| --- | --- |
| Random `ObjectId` `_id` **and** a redundant `customerId`/`productId` field | [001](001-identity-and-keys.md) |
| No indexes — every non-`_id` lookup is a `COLLSCAN` | [002](002-indexing-strategy.md) |
| `orders` + `orderLines` split, joined by a string — a `$lookup` for data you always read together | [003](003-embedding.md) |
| Order lines carry no product-name snapshot | 004 (planned) |
| Reviews reference author/product by id only, forcing a `$lookup` to show a name | 005 (planned) |
| Software-only fields (`compatibleOs`, `requiredRam`) as nullable fields on every product | 006 (planned) |
| `category` as a `"/"`-delimited path string, not a tree | 012 (planned) |
| `wishlist` as a CSV string; `creditCard` as inlined PII | later |

## Trade-offs & when *not* to "fix" it
A literal port is a legitimate **first migration step** — get the data in, verify counts, *then* remodel against your access patterns. What you must not do is stop here and call it a document database: you would be paying MongoDB's costs (no multi-document ACID by default, no foreign-key enforcement) while getting none of its benefits (locality, embedded reads, flexible schema). Every pattern that follows earns one of those benefits back.

---
[Pattern index](../../README.md#the-patterns) · [next → 001 Identity & keys](001-identity-and-keys.md)
