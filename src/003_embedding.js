// ===========================================================================
// Script 003
//
//   EMBEDDING  (one-to-few / the dependent entity)
//
//   This is THE defining document pattern, and the exact inverse of the graph
//   repo's headline move. Where the relational schema splits an order into an
//   `orders` header and an `orderLines` detail table — and the naive port copied
//   that split faithfully — a document store folds the lines *into* the order as
//   an embedded `items` array. An order and its lines are a classic dependent
//   entity: the lines have no life of their own, you always read them with the
//   order, and there are only a handful per order (one-to-FEW). That is the
//   textbook case for embedding.
//
//   Result: the whole order is one document, fetched in one read, with no
//   $lookup and no join on the hottest path in the app.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Migrate: for each order, gather its lines and embed them as `items`.
// We also snapshot the product NAME onto each line (its price was already
// snapshotted at order time as listPrice). Snapshotting is deliberate: an order
// must show what the customer actually bought and paid, even if the product is
// later renamed or repriced — see pattern 004. The productId stays so we can
// still trace back to the live product.
// ---------------------------------------------------------------------------
db.orders.find().forEach(function (order) {
  const items = db.orderLines.find({ orderId: order._id }).toArray().map(function (line) {
    const product = db.products.findOne({ _id: line.productId }, { name: 1 });
    return {
      productId: line.productId,
      name: product ? product.name : null,   // snapshot at order time
      quantity: line.quantity,
      listPrice: line.listPrice               // price snapshot at order time
    };
  });
  db.orders.updateOne({ _id: order._id }, { $set: { items: items } });
});

// The detail collection has served its purpose — its data now lives inside the
// orders. Drop it (this also drops the compound index 001 put on it).
db.orderLines.drop();


// ---------------------------------------------------------------------------
// After: the entire order — header + every line — is one self-contained
// document, read with a single _id lookup and no join.
// ---------------------------------------------------------------------------
print('\n-- the whole of order O1002 in one read, no $lookup --');
printjson(db.orders.findOne({ _id: 'O1002' }));


// ---------------------------------------------------------------------------
// The order total is now computable from the embedded array alone — no join to
// a line table. $map multiplies quantity x price per item; $sum adds them up.
// ---------------------------------------------------------------------------
print('\n-- order totals straight from the embedded items --');
printjson(
  db.orders.aggregate([
    { $project: {
        _id: 1,
        status: 1,
        lineCount: { $size: '$items' },
        total: { $sum: { $map: { input: '$items', as: 'i',
                                  in: { $multiply: ['$$i.quantity', '$$i.listPrice'] } } } }
    } },
    { $sort: { _id: 1 } }
  ]).toArray()
);


// ---------------------------------------------------------------------------
// You can still query INTO the array without unwinding it. A single index on an
// array field is a "multikey" index — one index entry per array element — so
// "which orders contain product P001?" is index-served.
// ---------------------------------------------------------------------------
db.orders.createIndex({ 'items.productId': 1 }, { name: 'order_items_productId' });

print('\n-- orders containing product P001 (multikey index on items.productId) --');
printjson(
  db.orders.find({ 'items.productId': 'P001' }, { _id: 1, orderDate: 1 }).toArray()
);


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to embed:
//   * Embed for one-to-ONE and one-to-FEW dependent data you read together and
//     that is bounded. Order lines qualify: a handful per order, read with the
//     order, meaningless without it.
//   * Do NOT embed an UNBOUNDED "many" side. An array that grows forever
//     (a customer's every order, a product's every review, a user's activity
//     feed) eventually blows the 16MB document limit and makes every write
//     rewrite a huge document. Those stay in their own collection and are
//     referenced — that is pattern 007, and its high-volume variant is the
//     bucket pattern (008).
//   * Do NOT embed data that is shared or independently updated. Reviews are
//     authored on their own timeline and shown on both product and customer
//     screens, so they remain a collection and use an extended reference (005)
//     rather than being embedded in the product.
//   * The rule of thumb from the course: "data that is accessed together should
//     be stored together" — but only when the together-side is bounded.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 3 },
  { _id: 3, description: 'Embedding (one-to-few dependent entity: order items)', appliedAt: new Date() },
  { upsert: true }
);

print('\n003 applied — order lines embedded into orders');
