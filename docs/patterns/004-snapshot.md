# 004 — Snapshot Data

**Script:** [`src/004_snapshot.js`](../../src/004_snapshot.js) · [Pattern index](../../README.md#the-patterns)

## The problem
When [003](003-embedding.md) embedded the order lines it copied each product's **name and price** onto the line. It would be tempting to read that as denormalization for speed — but it's something more deliberate. An order is an **immutable financial record**: it must show what the customer bought and the price they paid, even after the product is later renamed or repriced. A live reference to the product would silently rewrite history.

## The solution
Freeze the value **at event time**. The order line keeps its own `name` and `listPrice`, captured when the order was placed. The script proves it: rename and reprice `P003`, show the live product changes while order `O1002` still reports the purchase-time snapshot, then reverts.

## Key techniques
Reading a value out of an embedded array element, mutating the referenced source, and showing the embedded snapshot is unaffected — the copy has no link back to the live document by design.

## Trade-offs & when *not* to use it
Snapshot a value when the record must reflect a **moment** — the price paid, the address shipped to, the tax rate applied, the terms accepted. Reference (or recompute) when you always want the **current** value — a product's live price on its detail page, a user's current email. A snapshot is intentional duplication with **no fan-out update**: unlike the extended reference ([005](005-extended-reference.md)), you never refresh it — staleness *is* the point. This is the document analog of the relational repo's history / effective-dating patterns (012/013).

---
[← 003 Embedding](003-embedding.md) · [Pattern index](../../README.md#the-patterns) · [next → 005 Extended reference](005-extended-reference.md)
