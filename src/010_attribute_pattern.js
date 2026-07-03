// ===========================================================================
// Script 010
//
//   ATTRIBUTE PATTERN  (array of {k, v} vs. one field per attribute)
//
//   Products in different categories carry wildly different specs: a keyboard has
//   a switch type and layout, a webcam a resolution and frame rate, headphones a
//   driver size. Modeling every possible spec as its own top-level field gives a
//   sparse, ever-widening shape — and you'd need a separate index per field to
//   query any of them.
//
//   The attribute pattern stores these open-ended specs as an ARRAY of
//   { k, v } sub-documents. A SINGLE compound multikey index on (k, v) then makes
//   *every* attribute queryable — one index for an unbounded set of fields.
// ===========================================================================

db = db.getSiblingDB('onlinestore');

// Per-product specs — the kind of sparse, category-specific data that would be a
// forest of nullable columns in a relational table.
const specs = {
  P001: [{ k: 'color', v: 'black' }, { k: 'wireless', v: true }, { k: 'driverMm', v: 40 }],
  P002: [{ k: 'resolution', v: '4K' }, { k: 'fps', v: 30 }],
  P003: [{ k: 'color', v: 'black' }, { k: 'switch', v: 'brown' }, { k: 'layout', v: 'ANSI' }],
  P004: [{ k: 'color', v: 'white' }, { k: 'wireless', v: true }, { k: 'dpi', v: 16000 }],
  P005: [{ k: 'license', v: 'perpetual' }],
  P006: [{ k: 'license', v: 'subscription' }, { k: 'seats', v: 5 }],
  P007: [{ k: 'ports', v: 7 }, { k: 'color', v: 'grey' }],
  P008: [{ k: 'pattern', v: 'cardioid' }, { k: 'connector', v: 'USB-C' }],
  P009: [{ k: 'color', v: 'white' }, { k: 'temperatureK', v: 5600 }],
  P010: [{ k: 'license', v: 'subscription' }]
};

db.products.find().forEach(function (p) {
  if (specs[p._id]) {
    db.products.updateOne({ _id: p._id }, { $set: { attributes: specs[p._id] } });
  }
});

// ONE index makes ANY attribute queryable — no per-field index explosion.
db.products.createIndex({ 'attributes.k': 1, 'attributes.v': 1 }, { name: 'product_attributes' });


// ---------------------------------------------------------------------------
// Query by an attribute by name+value. $elemMatch keeps k and v matched within
// the SAME array element (so color=black, not "has color AND has something black").
// ---------------------------------------------------------------------------
print('\n-- products whose color is black (attribute pattern, one index) --');
printjson(
  db.products.find({ attributes: { $elemMatch: { k: 'color', v: 'black' } } }, { _id: 1, name: 1 }).toArray()
);

print('\n-- products that are wireless --');
printjson(
  db.products.find({ attributes: { $elemMatch: { k: 'wireless', v: true } } }, { _id: 1, name: 1 }).toArray()
);


// ---------------------------------------------------------------------------
// Subdocuments vs arrays (the deck's companion point):
//   * Use an ARRAY of { k, v } when the set of keys is open-ended, sparse, or
//     user-defined and you must query across arbitrary keys — one multikey index
//     covers them all.
//   * Use a fixed SUBDOCUMENT ({ spec: { requiredRam, compatibleOs } }, as in
//     006) when the fields are known and stable — dotted paths read cleanly and
//     each can carry its own index/validation.
//   * Don't reach for the attribute pattern when a handful of well-known columns
//     would do; the {k,v} indirection costs readability and needs $elemMatch to
//     query correctly.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 10 },
  { _id: 10, description: 'Attribute pattern (open-ended specs as {k,v} array + one multikey index)', appliedAt: new Date() },
  { upsert: true }
);

print('\n010 applied — product specs as a queryable attribute array');
