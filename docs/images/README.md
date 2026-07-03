# Diagrams

`model-before.svg` (the naive relational port) and `model-after.svg` (the idiomatic
document model) are the before/after schema diagrams shown in the top-level README.

They are **generated**, not hand-drawn: edit the `before` / `after` model definitions
in [`model.gen.js`](model.gen.js) — collections, fields (with `k: 'pk' | 'fk'`, `nested`,
and a type badge), and connectors — then re-render with plain Node (no dependencies):

```bash
node docs/images/model.gen.js
```

This is the editable source that sits next to the rendered SVG, mirroring the way the
sister `graph-` and `advanced-database-design-patterns` repos keep Graphviz `.dot`
sources beside their diagrams.
