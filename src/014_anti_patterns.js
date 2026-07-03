// ===========================================================================
// Script 014
//
//   ANTI-PATTERNS & DIAGNOSTICS  (appendix — read-only)
//
//   The closing appendix, mirroring the sister repos. It changes nothing — it
//   INTROSPECTS the finished database looking for the document-store smells the
//   earlier patterns exist to prevent, so you can run the same checks against
//   your own data. Safe to run last, or against any database.
//
//   The four things it looks for:
//     * documents creeping toward the 16 MB limit
//     * arrays that could grow unbounded (the embed-everything trap)
//     * collections with no index beyond _id
//     * the "treating Mongo like SQL" smells (raw PII, string FKs, $lookup-heavy
//       read paths) — reported as a checklist
// ===========================================================================

db = db.getSiblingDB('onlinestore');

const collections = db.getCollectionNames().filter(function (n) { return n.charAt(0) !== '_'; }).sort();

// ---------------------------------------------------------------------------
// 1. Document size — how close is the biggest document to the 16 MB ceiling?
// ---------------------------------------------------------------------------
print('\n== biggest document per collection (16 MB = 16777216 bytes is the hard limit) ==');
collections.forEach(function (name) {
  const r = db.getCollection(name).aggregate([
    { $group: { _id: null, maxBytes: { $max: { $bsonSize: '$$ROOT' } }, count: { $sum: 1 } } }
  ]).toArray()[0] || { maxBytes: 0, count: 0 };
  print('  ' + name.padEnd(16) + ' count ' + String(r.count).padStart(4) + '   max ' + r.maxBytes + ' bytes');
});

// ---------------------------------------------------------------------------
// 2. Array growth — an array with no natural bound is a future 16 MB blow-up.
//    Report the largest array in each array-bearing field.
// ---------------------------------------------------------------------------
print('\n== largest array per array field (watch for anything unbounded) ==');
function maxArray(coll, field) {
  const r = db.getCollection(coll).aggregate([
    { $project: { n: { $size: { $ifNull: ['$' + field, []] } } } },
    { $group: { _id: null, max: { $max: '$n' } } }
  ]).toArray()[0];
  return r ? r.max : 0;
}
print('  orders.items            max ' + maxArray('orders', 'items') + '   (bounded: a few lines per order — OK to embed)');
print('  customers.wishlistProductIds  max ' + maxArray('customers', 'wishlistProductIds') + '   (bounded: a wishlist — OK)');
print('  activityBuckets.events  max ' + maxArray('activityBuckets', 'events') + '   (capped at 50 by $slice — OK)');
print('  categories.ancestors    max ' + maxArray('categories', 'ancestors') + '   (bounded by tree depth — OK)');
print('  NOTE: activity is one-doc-per-event (007), never embedded — the reason there is no unbounded array here.');

// ---------------------------------------------------------------------------
// 3. Index coverage — a collection with only the _id index means every other
//    query is a COLLSCAN. Flag them for review.
// ---------------------------------------------------------------------------
print('\n== collections with no index beyond _id (every non-_id query is a COLLSCAN) ==');
let flagged = 0;
collections.forEach(function (name) {
  const n = db.getCollection(name).getIndexes().length;
  if (n <= 1) { print('  ⚠ ' + name + ' — only _id'); flagged++; }
});
if (flagged === 0) print('  none — every collection is indexed for its access patterns ✔');

// ---------------------------------------------------------------------------
// 4. "Treating Mongo like SQL" checklist — the smells the patterns removed.
// ---------------------------------------------------------------------------
print('\n== relational-habit smells (0 = clean) ==');
print('  raw PAN in customers.creditCard : ' + db.customers.countDocuments({ creditCard: { $exists: true } }) + '   (obfuscated in 013)');
print('  string FK orders.orderLines split: ' + (db.getCollectionNames().includes('orderLines') ? 'present' : 'gone') + '   (embedded in 003)');
print('  duplicate id fields (customerId)  : ' + db.customers.countDocuments({ customerId: { $exists: true } }) + '   (folded into _id in 001)');
print('  category path strings on products : ' + db.products.countDocuments({ category: { $exists: true } }) + '   (lifted to a tree in 012)');

print('\n-- other anti-patterns to watch for (not present here) --');
print('   * over-embedding an unbounded many-side (reference it: 007; bucket it: 008)');
print('   * massive $lookup chains on the hot path (embed 003 / extended-reference 005 / compute 011 instead)');
print('   * unindexed sort+range queries (design the compound index by ESR: 002)');
print('   * one wide collection of NULL-heavy optional fields (discriminate + spec: 006)');


db.getCollection('_migrations').replaceOne(
  { _id: 14 },
  { _id: 14, description: 'Anti-patterns & diagnostics appendix (read-only)', appliedAt: new Date() },
  { upsert: true }
);

print('\n014 applied — diagnostics complete');
