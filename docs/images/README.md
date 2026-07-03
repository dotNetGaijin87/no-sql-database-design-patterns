# Diagrams

`model-before.svg` (the naive port) and `model-after.svg` (the document model) are the
before/after diagrams shown in the top-level README. Each collection is drawn as a small
**document-shape tree** — fields with types, embedded sub-documents/arrays nested under a
guide line, and references drawn as **connector lines** to the target collection with a
cardinality label (`N:1`, `N:N`, `tree`). In `before`, string foreign keys are amber and
their connectors are **dashed**; in `after`, real references are blue with **solid** lines.

They are **generated**, not hand-drawn: edit the `before` / `after` definitions in
[`model.gen.js`](model.gen.js) — each collection's fields (`{ n, l, t }`, or `ref`/`fk`
flags), the card positions, and the `conns` (with `bend`, cardinality, `dashed`) — then
re-render with plain Node (no dependencies):

```bash
node docs/images/model.gen.js
```

Cardinalities were verified against the seeded data (e.g. `orders`↔`products` is `N:N`
because `items[]` is array-valued). This is the editable source that sits next to the
rendered SVG, mirroring the way the sister `graph-` and `advanced-database-design-patterns`
repos keep Graphviz `.dot` sources beside their diagrams.
