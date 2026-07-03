// ===========================================================================
// Script 011
//
//   COMPUTED PATTERN  (precompute what you'd otherwise aggregate on every read)
//
//   A product page shows an average rating and a review count. Computing those by
//   aggregating the `reviews` collection on every page view is wasteful: the
//   answer changes rarely (only when a review is written) but is read constantly.
//
//   The computed pattern moves the work to WRITE time: calculate `avgRating` and
//   `numReviews` once, cache them on the product, and refresh them when a review
//   changes. The hot read becomes a single-document fetch with no aggregation.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Compute the rollup for every product from its reviews, and cache it on the
// product. (A one-shot backfill; the incremental refresh is shown below.)
// ---------------------------------------------------------------------------
const rollups = db.reviews.aggregate([
  { $group: { _id: '$productId', avgRating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
]).toArray();

// products with no reviews get an explicit zero, so the page never sees "missing".
db.products.updateMany({}, { $set: { avgRating: 0, numReviews: 0 } });
rollups.forEach(function (r) {
  db.products.updateOne({ _id: r._id }, { $set: {
    avgRating:  Math.round(r.avgRating * 100) / 100,
    numReviews: r.numReviews
  } });
});


// ---------------------------------------------------------------------------
// After: the product card reads its rating with no join and no aggregation.
// ---------------------------------------------------------------------------
print('\n-- product cards read avgRating / numReviews directly (no aggregation) --');
printjson(
  db.products.find({ numReviews: { $gt: 0 } }, { _id: 1, name: 1, avgRating: 1, numReviews: 1 })
             .sort({ avgRating: -1 }).toArray()
);


// ---------------------------------------------------------------------------
// Keeping it fresh incrementally: when a new review lands, nudge the cached
// values in one atomic update instead of re-aggregating the whole collection.
// (Demonstrated with a throwaway review, then reverted.)
// ---------------------------------------------------------------------------
const before = db.products.findOne({ _id: 'P001' }, { avgRating: 1, numReviews: 1 });
const newRating = 3;
const n2 = before.numReviews + 1;
const avg2 = (before.avgRating * before.numReviews + newRating) / n2;
db.products.updateOne({ _id: 'P001' }, { $set: { avgRating: Math.round(avg2 * 100) / 100, numReviews: n2 } });
print('\n-- P001 after one more rating (' + newRating + '): avg ' + before.avgRating + ' -> ' +
      db.products.findOne({ _id: 'P001' }).avgRating + ', count ' + before.numReviews + ' -> ' + n2);
// revert so the demo is repeatable
db.products.updateOne({ _id: 'P001' }, { $set: { avgRating: before.avgRating, numReviews: before.numReviews } });


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use it:
//   * Compute-on-write wins when reads vastly outnumber writes and mild staleness
//     is fine (a rating a few seconds behind is invisible to users).
//   * The cache can drift if a write path forgets to update it. Keep the refresh
//     next to the review write (or run a periodic reconciliation aggregate) so a
//     missed update is caught. Incremental math avoids re-scanning the source.
//   * If you need exact, always-consistent numbers (accounting balances), either
//     compute inside a transaction with the write, or aggregate live and skip the
//     cache. Related: extended reference (005) caches fields; this caches an
//     aggregate — both trade write work for cheap reads (≈ computed column, 022).
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 11 },
  { _id: 11, description: 'Computed pattern (cached avgRating / numReviews on products)', appliedAt: new Date() },
  { upsert: true }
);

print('\n011 applied — product rating rollups cached');
