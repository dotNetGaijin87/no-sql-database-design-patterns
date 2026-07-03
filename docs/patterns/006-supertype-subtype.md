# 006 — Supertype / Subtype

**Script:** [`src/006_supertype_subtype.js`](../../src/006_supertype_subtype.js) · [Pattern index](../../README.md#the-patterns)

## The problem
The naive port carried software-only fields (`compatibleOs`, `requiredRam`) as nullable fields on **every** product, hardware included — the relational "one wide table full of NULLs" smell ported straight across. There's also no reliable way to ask "give me all software": you'd have to test whether a field happens to exist.

## The solution
Single-collection polymorphism: keep all products in one collection (so "all products" and the shared fields stay one query and one set of indexes), add a `productType` **discriminator** (`'Software'` / `'Hardware'`), and move each subtype's own fields into a `spec` subdocument that is simply **absent** on the other subtype. This is the deck's "roll-up" shape. The absent fields cost nothing — no wide NULL columns — and the discriminator makes `{ productType: 'Software' }` an index-served query.

## Key techniques
Deriving the discriminator from the data (category root), `$set` + `$unset` to relocate fields into a `spec` subdocument, an idempotency guard (`if (p.productType) return`), a discriminator index, and **migrating the partial index** from the old top-level `requiredRam` to `spec.requiredRam` (the [002](002-indexing-strategy.md) index would otherwise point at a field that no longer exists).

## Trade-offs & when *not* to use it
Roll-up (one collection) is the default. Prefer **roll-down** (a separate collection per subtype) only when the subtypes barely overlap, are almost always queried apart, or need very different indexes/validation — then a shared "supertype" view becomes the join. Always branch on the **discriminator**, never on "does field X exist": a field's presence is an implementation detail, `productType` is the contract. Compare with the relational sister repo's separate subtype *tables* (017/018) — same modeling decision, opposite default.

---
[← 005 Extended reference](005-extended-reference.md) · [Pattern index](../../README.md#the-patterns) · [next → 007 Referencing (unbounded)](007-referencing-unbounded.md)
