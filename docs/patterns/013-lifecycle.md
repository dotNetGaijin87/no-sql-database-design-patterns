# 013 — Data Lifecycle & Integrity

**Script:** [`src/013_lifecycle.js`](../../src/013_lifecycle.js) · [Pattern index](../../README.md#the-patterns)

## The problem
A schema-flexible store still needs guard rails, and the naive port had none: a **raw credit-card number** inlined on the customer, no way to retire a product without orphaning its orders, no expiry for ephemeral data, and nothing stopping a garbage `rating` from being written.

## The solution
Four lifecycle techniques the deck flags:

- **PII obfuscation** — replace the inlined PAN with the most you may keep: `card.last4` + an opaque `token`; drop the raw number.
- **Soft delete** — flag a discontinued product `isActive: false` (its orders and reviews still reference it), and index only the live rows with a **partial index** so "active products" stays fast.
- **TTL index** — a `sessions` collection whose documents auto-expire once their `expiresAt` passes (`expireAfterSeconds: 0`), so ephemeral data cleans itself up.
- **Schema validation** — a `$jsonSchema` validator on `reviews` (rating `1..5`) attached with `collMod`, so a bad write is rejected (code 121).

## Key techniques
`$set`/`$unset` to reshape PII, a partial index on a soft-delete flag, a TTL index on a date field, and `collMod` + `$jsonSchema` with `validationLevel: 'moderate'`.

## Trade-offs & when *not* to use each
Store the **minimum** PII you need (last4 + a vault token), never the PAN — with no column types, *you* own the discipline (≈ the relational repo's obfuscation, 023). **Soft delete** keeps references valid and enables undelete/audit, but every query must now filter `isActive` and the rows still cost storage — sweep them eventually; don't soft-delete truly transient data. **TTL** is a background sweep (not instant) and only works off a date field — don't rely on it for precise deadlines. Start validation at `moderate`/`warn` and tighten to `strict`/`error` once the data is clean, so you don't lock out writes needed to fix legacy documents.

---
[← 012 Tree structures](012-tree-structures.md) · [Pattern index](../../README.md#the-patterns) · [next → 014 Anti-patterns](014-anti-patterns.md)
