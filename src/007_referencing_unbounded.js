// ===========================================================================
// Script 007
//
//   REFERENCING — the UNBOUNDED many-side  (when NOT to embed)
//
//   003 embedded order lines because they are bounded (a handful per order). The
//   opposite rule matters just as much: NEVER embed a "many" side that grows
//   without limit. A customer places more orders forever; a product accumulates
//   reviews forever; a user generates activity forever. Embed any of those as an
//   array on the parent and the document creeps toward MongoDB's hard 16 MB
//   limit, and every append rewrites the whole (ever larger) document.
//
//   The fix is to keep the many-side in its OWN collection and reference the
//   parent from the CHILD. Orders already do this (each order carries customerId,
//   the customer carries no orders[] array) — that is deliberate. This script
//   makes the rule explicit and introduces a genuinely high-volume stream —
//   product-view `activity` — that 008 will then bucket.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Customer → orders is an unbounded one-to-many. We reference from the CHILD:
// the order holds customerId; the customer holds nothing. "A customer's orders"
// is an indexed query on the child (the index exists from 002).
// ---------------------------------------------------------------------------
print('\n-- orders for customer C1 (child-referenced, index-served — no orders[] array on the customer) --');
printjson(db.orders.find({ customerId: 'C1' }, { _id: 1, orderDate: 1, status: 1 }).sort({ orderDate: -1 }).toArray());


// ---------------------------------------------------------------------------
// A truly high-volume unbounded stream: every product view is one event. This
// is the textbook thing you must NOT embed into the customer. One document per
// event, referencing the customer (and product) by id.
// ---------------------------------------------------------------------------
db.activity.drop();

const events = [];
const feed = [
  ['C1','P001','view','2024-05-01T09:00:00Z','mobile'], ['C1','P007','view','2024-05-01T09:02:00Z','mobile'],
  ['C1','P001','cart','2024-05-01T09:05:00Z','mobile'], ['C2','P003','view','2024-05-01T10:00:00Z','desktop'],
  ['C2','P004','view','2024-05-01T10:01:00Z','desktop'], ['C3','P001','view','2024-05-02T11:00:00Z','tablet'],
  ['C3','P005','view','2024-05-02T11:03:00Z','tablet'], ['C3','P005','cart','2024-05-02T11:04:00Z','tablet'],
  ['C1','P002','view','2024-05-02T12:00:00Z','desktop'], ['C1','P002','view','2024-05-02T12:01:00Z','desktop'],
  ['C4','P008','view','2024-05-03T08:00:00Z','mobile'], ['C5','P003','view','2024-05-03T14:00:00Z','desktop'],
  ['C5','P004','view','2024-05-03T14:02:00Z','desktop'], ['C5','P004','cart','2024-05-03T14:05:00Z','desktop'],
  ['C6','P002','view','2024-05-04T16:00:00Z','tablet'], ['C6','P009','view','2024-05-04T16:01:00Z','tablet'],
  ['C1','P001','view','2024-05-05T09:00:00Z','mobile'], ['C1','P001','purchase','2024-05-05T09:10:00Z','mobile'],
  ['C3','P008','view','2024-05-06T13:00:00Z','desktop'], ['C3','P008','cart','2024-05-06T13:02:00Z','desktop']
];
feed.forEach(function (e) {
  events.push({ customerId: e[0], productId: e[1], action: e[2], at: new Date(e[3]), device: e[4] });
});
db.activity.insertMany(events);

// Reference-from-child index: "this customer's recent activity".
db.activity.createIndex({ customerId: 1, at: -1 }, { name: 'activity_customer_at' });

print('\n-- ' + db.activity.countDocuments({}) + ' activity events, one document each (unbounded — never embedded) --');
print('\n-- recent activity for C1 (index-served) --');
printjson(db.activity.find({ customerId: 'C1' }, { _id: 0, productId: 1, action: 1, at: 1 }).sort({ at: -1 }).limit(4).toArray());


// ---------------------------------------------------------------------------
// Trade-offs & the reference directions (from the deck):
//   * Reference from the CHILD (child holds parentId) — the default for an
//     unbounded many-side. Cheap appends, no document-size ceiling. "All children
//     of a parent" is an indexed query on the child.
//   * Reference from the PARENT (parent holds childIds[]) — only when the many
//     side is BOUNDED and small, and you usually load the parent with its list.
//   * Two-way referencing — both, when you query in both directions and can pay
//     to keep the two id lists in step.
//   * The moment the stream is high-volume, even one-doc-per-event costs too many
//     documents/index entries — that is what the bucket pattern (008) fixes.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 7 },
  { _id: 7, description: 'Referencing the unbounded many-side (child refs; activity stream)', appliedAt: new Date() },
  { upsert: true }
);

print('\n007 applied — unbounded many-side referenced, not embedded');
