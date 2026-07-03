# 010 — Attribute Pattern

**Script:** [`src/010_attribute_pattern.js`](../../src/010_attribute_pattern.js) · [Pattern index](../../README.md#the-patterns)

## The problem
Products in different categories carry wildly different specs: a keyboard has a switch type and layout, a webcam a resolution and frame rate, headphones a driver size. Model every possible spec as its own top-level field and you get a sparse, ever-widening shape — and you'd need a **separate index per field** to query any of them.

## The solution
Store open-ended specs as an **array of `{ k, v }`** sub-documents. A single compound **multikey** index on `(k, v)` then makes *every* attribute queryable — one index for an unbounded set of fields. Query by name+value with `$elemMatch`, which keeps `k` and `v` matched **within the same element** (so `color = black`, not "has a `color` key AND has something equal to `black`").

## Key techniques
An `attributes: [{k, v}]` array, one `{ 'attributes.k': 1, 'attributes.v': 1 }` multikey index, and `$elemMatch` for correct key+value matching.

## Trade-offs & when *not* to use it
Use an array of `{k, v}` when the set of keys is open-ended, sparse, or user-defined and you must query across arbitrary keys — one index covers them all. Use a fixed **subdocument** (like the `spec` in [006](006-supertype-subtype.md)) when the fields are known and stable — dotted paths read cleanly and each can carry its own index and validation. Don't reach for the attribute pattern when a handful of well-known fields would do; the `{k,v}` indirection costs readability and needs `$elemMatch` to query correctly. This is the document take on the relational repo's vertical partitioning (015) — variability handled in one collection instead of split tables.

---
[← 009 Many-to-many](009-many-to-many.md) · [Pattern index](../../README.md#the-patterns) · [next → 011 Computed pattern](011-computed.md)
