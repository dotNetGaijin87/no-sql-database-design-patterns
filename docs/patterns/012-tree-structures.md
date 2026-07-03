# 012 — Tree Structures

**Script:** [`src/012_tree_structures.js`](../../src/012_tree_structures.js) · [Pattern index](../../README.md#the-patterns)

## The problem
The naive port stored a product's place in the catalogue as a `"/"`-delimited **path string**: `category = "Electronics/Audio/Headphones"`. You can't ask "direct children of Electronics?" or "every product anywhere under Electronics?" without string surgery on every document, and there's no node to hang a name, an image, or a slug on.

## The solution
Lift the hierarchy into a real `categories` collection and record each node **three ways at once** — the encodings the deck compares:

- **`parentId`** — the immediate parent (child/parent references)
- **`ancestors[]`** — every ancestor id, root → parent (array of ancestors)
- **`path`** — the human `"/"`-delimited string (materialized path)

Products then reference their **leaf** category by `categoryId`. Different questions are cheap under different encodings, so we keep all three and pick per query: direct children by `parentId`; the whole subtree by `ancestors: 'electronics'` **or** by an indexed path prefix `/^Electronics\//`; breadcrumbs by `$in` over `ancestors`; and a server-side recursive walk with **`$graphLookup`** over the `parentId` links.

## Key techniques
Parsing the path into nodes, building `parentId` / `ancestors[]` / `path` in one pass, a multikey index on `ancestors`, an index on `path` for prefix-regex range scans, `$graphLookup` for recursive traversal, and an idempotency guard (rebuild only while the source `category` string is still present).

## Trade-offs & when *not* to use each
- **child / parent references** — smallest to store, cheapest to write; great for immediate children and top-down walks. A whole subtree needs recursion (app-side or `$graphLookup`).
- **array of ancestors** — one indexed query for "all descendants" and instant breadcrumbs; the cost is that **moving** a subtree rewrites the `ancestors` of every node beneath it.
- **materialized path** — an indexed prefix regex answers "all descendants" with zero joins; the cost is string upkeep on moves, and a *leading*-wildcard match can't use the index.

Keeping all three suits a small, read-heavy taxonomy like this one. For a deep, frequently-restructured tree, store fewer encodings and lean on `$graphLookup`. This is the document analog of the relational sister repo's hierarchical-data pattern (016) and the graph repo's native hierarchy (007) — where the same tree is just relationships you traverse.

---
[← 011 Computed pattern](011-computed.md) · [Pattern index](../../README.md#the-patterns) · [next → 013 Lifecycle & integrity](013-lifecycle.md)
