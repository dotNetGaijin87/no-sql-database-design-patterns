// ===========================================================================
// Script 004
//
//   SNAPSHOT DATA  (freeze the value at event time)
//
//   When 003 embedded the order lines it copied the product's name and price
//   ONTO each line. That copy is not denormalization for speed — it is a
//   deliberate SNAPSHOT. An order is an immutable financial record: it must show
//   what the customer actually bought and the price they actually paid, even
//   after the product is later renamed or repriced. A live reference would
//   silently rewrite history.
//
//   This short lesson proves that: we rename and reprice a product, show the old
//   order is unchanged, then revert so the demo is repeatable.
// ===========================================================================

db = db.getSiblingDB('onlinestore');

const line = db.orders.findOne({ _id: 'O1002' }).items.find(function (i) { return i.productId === 'P003'; });
print('\n-- order O1002 recorded product P003 as --');
print('   name="' + line.name + '"  listPrice=' + line.listPrice + '  (snapshot at order time)');

// The product changes after the sale: new name, new price.
db.products.updateOne({ _id: 'P003' }, { $set: { name: 'Mechanical Keyboard v2', listPrice: 99 } });
print('\n-- the live product is now --');
printjson(db.products.findOne({ _id: 'P003' }, { _id: 0, name: 1, listPrice: 1 }));

// The order is untouched — the snapshot preserves the sale exactly.
const still = db.orders.findOne({ _id: 'O1002' }).items.find(function (i) { return i.productId === 'P003'; });
print('\n-- order O1002 still shows the purchase-time snapshot --');
print('   name="' + still.name + '"  listPrice=' + still.listPrice + '   (unchanged)');

// Revert the product so re-running this script is stable.
db.products.updateOne({ _id: 'P003' }, { $set: { name: 'Mechanical Keyboard', listPrice: 89 } });


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use it:
//   * Snapshot a value when the record must reflect a MOMENT — the price paid,
//     the address shipped to, the terms accepted, the tax rate applied. These
//     must never change under you.
//   * Reference (or recompute) when you always want the CURRENT value — a
//     product's live price on its detail page, a user's current email.
//   * A snapshot is intentional duplication with no fan-out update: unlike the
//     extended reference (005), you never "refresh" it — staleness is the point.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 4 },
  { _id: 4, description: 'Snapshot data (order items are immutable purchase-time copies)', appliedAt: new Date() },
  { upsert: true }
);

print('\n004 applied — snapshot immutability demonstrated');
