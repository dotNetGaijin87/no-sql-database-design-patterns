// ===========================================================================
// Script 008
//
//   BUCKET PATTERN  (group a high-volume stream into capped documents)
//
//   007 kept product-view `activity` as one document per event — correct (never
//   embed an unbounded stream), but at scale one-doc-per-event is its own
//   problem: billions of tiny documents, a huge index, and a working set that
//   won't fit in RAM. The bucket pattern is the middle ground between "embed
//   everything" and "one doc per event": group events into BUCKET documents
//   (here, per customer per day) holding a bounded array plus a count.
//
//   Reads for "what did this customer do on day D" become a single bucket fetch
//   instead of N event reads; the document count drops by the bucket factor.
// ===========================================================================

db = db.getSiblingDB('onlinestore');

function dayKey(d) { return d.toISOString().slice(0, 10); }  // 'YYYY-MM-DD'

// ---------------------------------------------------------------------------
// Roll the raw events into one bucket per (customerId, day). Each bucket caps
// its `events` array and keeps a `count` so a client can page without scanning.
// ---------------------------------------------------------------------------
db.activityBuckets.drop();

const buckets = {};
db.activity.find().sort({ at: 1 }).forEach(function (e) {
  const day = dayKey(e.at);
  const key = e.customerId + '|' + day;
  if (!buckets[key]) {
    buckets[key] = { _id: key, customerId: e.customerId, day: day, count: 0, events: [] };
  }
  buckets[key].count += 1;
  buckets[key].events.push({ productId: e.productId, action: e.action, at: e.at, device: e.device });
});

db.activityBuckets.insertMany(Object.keys(buckets).map(function (k) { return buckets[k]; }));
db.activityBuckets.createIndex({ customerId: 1, day: -1 }, { name: 'bucket_customer_day' });


// ---------------------------------------------------------------------------
// After: one document holds a whole day of a customer's activity.
// ---------------------------------------------------------------------------
print('\n-- ' + db.activity.countDocuments({}) + ' raw events rolled into ' +
      db.activityBuckets.countDocuments({}) + ' buckets --');

print('\n-- C1 on 2024-05-01 — a single bucket read, not N event reads --');
printjson(db.activityBuckets.findOne({ _id: 'C1|2024-05-01' }));


// ---------------------------------------------------------------------------
// How writes actually work in production: one upsert per event appends into the
// CURRENT bucket, caps the array with $slice, and bumps the count — no read,
// no growing parent document. (Demonstrated against a throwaway bucket.)
// ---------------------------------------------------------------------------
db.activityBuckets.updateOne(
  { _id: 'C1|2024-05-01' },
  {
    $push:  { events: { $each: [{ productId: 'P009', action: 'view', at: new Date('2024-05-01T09:30:00Z'), device: 'mobile' }], $slice: -50 } },
    $inc:   { count: 1 },
    $setOnInsert: { customerId: 'C1', day: '2024-05-01' }
  },
  { upsert: true }
);
print('\n-- after an upsert-append, the bucket count is ' + db.activityBuckets.findOne({ _id: 'C1|2024-05-01' }).count +
      ' (array capped at 50 by $slice) --');


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use it:
//   * Pick a bucket grain (per day / per hour / fixed N) so a bucket stays well
//     under 16 MB and matches how you read — you almost always fetch a whole
//     bucket, so bucket by your read window.
//   * $slice caps the array so a hot bucket can't grow unbounded; overflow rolls
//     into the next bucket. Keep a `count` for totals without scanning.
//   * Don't bucket low-volume data you filter *inside* — you'd fetch a big array
//     to use one element. Bucketing trades granular queryability for read/write
//     efficiency; it shines for append-mostly time-series (metrics, activity, IoT).
//   * This is the document analog of the relational repo's horizontal
//     partitioning (014): same data-skew problem, grouped instead of split.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 8 },
  { _id: 8, description: 'Bucket pattern (activity rolled into per-customer-per-day buckets)', appliedAt: new Date() },
  { upsert: true }
);

print('\n008 applied — activity bucketed');
