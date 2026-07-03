// ===========================================================================
// Script 009
//
//   MANY-TO-MANY  (id arrays instead of a junction collection)
//
//   The naive customer carried a wishlist as a CSV string of product *names*
//   ("Gaming Mouse,Mechanical Keyboard") — unqueryable, and not even joined by
//   id. A wishlist is a many-to-many between customers and products: a customer
//   wishes for many products, a product is wished for by many customers.
//
//   In a relational schema that needs a junction table. In a document store,
//   when both sides are bounded, you store an ARRAY OF IDS on the side(s) you
//   query from — no junction collection. A multikey index over that array makes
//   the relationship traversable in BOTH directions from one field.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Turn the CSV of product NAMES into an array of product IDS (resolve each name
// to its _id), then drop the string. We store the array on the customer — the
// side we read from ("show me my wishlist").
// ---------------------------------------------------------------------------
db.customers.find().forEach(function (c) {
  const names = (c.wishlist || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const ids = names.map(function (name) {
    const p = db.products.findOne({ name: name }, { _id: 1 });
    return p ? p._id : null;
  }).filter(Boolean);
  db.customers.updateOne({ _id: c._id }, { $set: { wishlistProductIds: ids }, $unset: { wishlist: '' } });
});

// A multikey index over the id array answers the REVERSE direction too:
// "which customers wishlisted this product?"
db.customers.createIndex({ wishlistProductIds: 1 }, { name: 'customer_wishlist' });


// ---------------------------------------------------------------------------
// Direction 1 — a customer's wishlist, with product names ($lookup or $in).
// ---------------------------------------------------------------------------
print('\n-- C5\'s wishlist (ids resolved to names) --');
const c5 = db.customers.findOne({ _id: 'C5' });
printjson(db.products.find({ _id: { $in: c5.wishlistProductIds } }, { _id: 1, name: 1 }).toArray());

// ---------------------------------------------------------------------------
// Direction 2 — everyone who wishlisted a product (the reverse), served by the
// SAME multikey index — no second id list to maintain.
// ---------------------------------------------------------------------------
print('\n-- customers who wishlisted P003 (multikey index, reverse direction) --');
printjson(db.customers.find({ wishlistProductIds: 'P003' }, { _id: 1, name: 1 }).toArray());


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use it:
//   * Store the id array on the side(s) you actually query from. One-sided is
//     enough when a multikey index serves the reverse query (as above). Store it
//     on BOTH sides (two-way) only when both directions are hot AND you can keep
//     the two arrays consistent on every change.
//   * This works because both sides are BOUNDED (a wishlist is dozens, not
//     millions). If one side is unbounded — a celebrity's followers — the array
//     is the wrong tool; reference from the child (007) or bucket (008) instead.
//   * If the relationship itself grows attributes (added-on date, priority,
//     quantity), promote it from a bare id to a small subdocument
//     `{ productId, addedAt }` — the document version of a junction row.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 9 },
  { _id: 9, description: 'Many-to-many (wishlist CSV -> product id array + multikey index)', appliedAt: new Date() },
  { upsert: true }
);

print('\n009 applied — wishlist is a queryable many-to-many');
