// ===========================================================================
// Script 005
//
//   EXTENDED REFERENCE  (copy the few fields you always display)
//
//   003 embedded a *bounded, dependent* entity (order lines) into its parent.
//   Reviews are the opposite case: they are shared (shown on the product page
//   AND the customer page) and written on their own timeline, so they stay in
//   their own collection and are *referenced*, not embedded. But a reference by
//   id alone means every review list needs a $lookup just to show the reviewer's
//   name and the product's name.
//
//   The extended-reference pattern copies the handful of fields you always
//   render (authorName, productName) *next to* the id. The list renders from one
//   collection, no join — you trade a little duplication and a refresh cost for a
//   read that never touches customers or products.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Copy the display fields onto each review. Keep the ids too — they remain the
// source of truth and the way back to the full document.
// ---------------------------------------------------------------------------
db.reviews.find().forEach(function (r) {
  const customer = db.customers.findOne({ _id: r.authorId },  { name: 1 });
  const product  = db.products.findOne({ _id: r.productId }, { name: 1 });
  db.reviews.updateOne({ _id: r._id }, { $set: {
    authorName:  customer ? customer.name : null,
    productName: product  ? product.name  : null
  } });
});

// Support the hot query: "reviews for a product, newest first" (ESR: equality
// on productId, sort on createdAt) — now fully served without a join.
db.reviews.createIndex({ productId: 1, createdAt: -1 }, { name: 'review_product_date' });


// ---------------------------------------------------------------------------
// After: a product's review list renders from `reviews` alone — no $lookup.
// ---------------------------------------------------------------------------
print('\n-- reviews for P001, newest first, with reviewer name (no $lookup) --');
printjson(
  db.reviews.find({ productId: 'P001' }, { _id: 0, authorName: 1, rating: 1, content: 1 })
            .sort({ createdAt: -1 }).toArray()
);


// ---------------------------------------------------------------------------
// The trade-off, made concrete: the copy can go stale. When the source changes
// you fan out an update to every copy. We rename a customer, show the staleness,
// refresh the copies, then revert — so the demo is repeatable.
// ---------------------------------------------------------------------------
db.customers.updateOne({ _id: 'C1' }, { $set: { name: 'Alice J.' } });
print('\n-- after renaming C1, the copied authorName is now stale --');
print('   customers.name = ' + db.customers.findOne({ _id: 'C1' }).name +
      '   reviews.authorName = ' + db.reviews.findOne({ authorId: 'C1' }).authorName);

db.reviews.updateMany({ authorId: 'C1' }, { $set: { authorName: 'Alice J.' } }); // fan-out refresh
print('   after fan-out refresh, reviews.authorName = ' +
      db.reviews.findOne({ authorId: 'C1' }).authorName);

// revert both, leaving the database exactly as we found it
db.customers.updateOne({ _id: 'C1' }, { $set: { name: 'Alice Johnson' } });
db.reviews.updateMany({ authorId: 'C1' }, { $set: { authorName: 'Alice Johnson' } });


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use it:
//   * Only copy fields that are (a) small, (b) read far more than written, and
//     (c) tolerant of brief staleness. A name or a thumbnail: yes. A live price
//     or a stock level you must never show wrong: reference it, or recompute.
//   * The copy is a cache, not the truth. The id stays authoritative; keep the
//     fan-out update near the source-of-truth write so the two never drift far.
//   * This is the *reference-side* cousin of 003's embedding and of the computed
//     pattern (011): all three trade write-time work for a cheaper read.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 5 },
  { _id: 5, description: 'Extended reference (copy display fields onto reviews)', appliedAt: new Date() },
  { upsert: true }
);

print('\n005 applied — reviews carry authorName / productName');
