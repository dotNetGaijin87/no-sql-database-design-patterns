# Diagrams

`model-before.svg` (the naive port) and `model-after.svg` (the document model) are the
before/after diagrams shown in the top-level README. Each collection is drawn as an
**aggregate**: a green document box whose embedded sub-documents / arrays are **nested
white boxes** (`items[]`, `card{}`, `spec{}`, `attributes[]`). References between
collections are **connector lines** with a cardinality label (`N:1`, `N:N`, `tree`).

- `before` — flat boxes (no embedding), a separate `orderLines` collection, string
  foreign keys (amber connector dots), `ObjectId` `_id`s.
- `after` — embedded sub-docs as nested boxes, natural `_id`s, real references (blue
  dots). `N:N` where a reference is array-valued (`orders.items[]`, `wishlistProductIds[]`).

They are **generated**, not hand-drawn: edit the `before` / `after` definitions in
[`model.gen.js`](model.gen.js) — each collection's `scalars` / `nested` and the `conns`
(with `bend`, cardinality `c`, `tdy`, `self` / `midlabel`) — then re-render with plain
Node (no dependencies):

```bash
node docs/images/model.gen.js
```

Cardinalities were verified against the seeded data (e.g. `orders`↔`products` is `N:N`
because `items[]` is array-valued). This is the editable source that sits next to the
rendered SVG, mirroring the way the sister `graph-` and `advanced-database-design-patterns`
repos keep Graphviz `.dot` sources beside their diagrams.
