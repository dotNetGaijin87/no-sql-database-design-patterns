# 009 — Many-to-Many

**Script:** [`src/009_many_to_many.js`](../../src/009_many_to_many.js) · [Pattern index](../../README.md#the-patterns)

## The problem
The naive customer stored a wishlist as a CSV string of product **names** (`"Gaming Mouse,Mechanical Keyboard"`) — unqueryable, and not even joined by id. A wishlist is a **many-to-many**: a customer wishes for many products, a product is wished for by many customers.

## The solution
In a relational schema that needs a junction table. In a document store, when both sides are **bounded**, you store an **array of ids** on the side you query from — no junction collection. The script resolves each wishlist name to a product `_id`, stores `wishlistProductIds` on the customer, and drops the string. A single **multikey** index over that array then serves **both** directions: a customer's wishlist (`$in`), and — from the same index — everyone who wishlisted a given product (`{ wishlistProductIds: 'P003' }`).

## Key techniques
Resolving names → ids, an id array on the query side, a multikey index that answers the reverse query, and the note that a relationship with its *own* attributes becomes a subdocument (`{ productId, addedAt }`) rather than a bare id.

## Trade-offs & when *not* to use it
Store the id array on the side(s) you actually query from — one-sided is enough when a multikey index serves the reverse. Store it on **both** sides only when both directions are hot *and* you can keep the two arrays consistent on every change. This works because both sides are **bounded**; if one side is unbounded (a celebrity's followers), the array is the wrong tool — reference from the child ([007](007-referencing-unbounded.md)) or bucket ([008](008-bucket.md)). This is the document analog of the relational associative table (010).

---
[← 008 Bucket pattern](008-bucket.md) · [Pattern index](../../README.md#the-patterns) · [next → 010 Attribute pattern](010-attribute-pattern.md)
