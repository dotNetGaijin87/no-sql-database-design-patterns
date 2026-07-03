# 007 — Referencing the Unbounded Many-Side

**Script:** [`src/007_referencing_unbounded.js`](../../src/007_referencing_unbounded.js) · [Pattern index](../../README.md#the-patterns)

## The problem
[003](003-embedding.md) embedded order lines because they're **bounded**. The opposite rule matters just as much: never embed a many-side that grows **without limit**. A customer places more orders forever; a product accrues reviews forever; a user generates activity forever. Embed any of those as an array on the parent and the document creeps toward MongoDB's hard **16 MB** ceiling, and every append rewrites the whole (ever-larger) document.

## The solution
Keep the many-side in its **own collection** and reference the parent from the **child**. Orders already do this — each order carries `customerId`, the customer carries no `orders[]` array — and that's deliberate: "a customer's orders" is an indexed query on the child. The script also introduces a genuinely high-volume stream, per-product-view `activity` (one document per event, referencing customer and product by id) — the textbook thing you must *not* embed, and the input the bucket pattern ([008](008-bucket.md)) then optimizes.

## Key techniques
Child-side reference + index (`{ customerId, at }`), one-document-per-event modeling, and the reference-direction decision (from child vs. from parent vs. two-way).

## Trade-offs & when *not* to use it
Reference **from the child** by default for an unbounded many-side — cheap appends, no size ceiling. Reference **from the parent** (`childIds[]`) only when the many-side is bounded and small and you load it with the parent. Use **two-way** references only when both directions are hot and you can keep both id lists in step. And when the stream is genuinely high-volume, even one-doc-per-event costs too many documents and index entries — that's what [008](008-bucket.md) fixes. This is the counterweight to embedding, and the document analog of the relational foreign key (003).

---
[← 006 Supertype/subtype](006-supertype-subtype.md) · [Pattern index](../../README.md#the-patterns) · [next → 008 Bucket pattern](008-bucket.md)
