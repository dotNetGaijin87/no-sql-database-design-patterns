// ===========================================================================
// Script 001
//
//   IDENTITY & KEYS  (make _id your primary key)
//
//   Every document already has a unique primary key for free — the mandatory
//   _id field, which MongoDB indexes automatically. The naive port ignored it:
//   it let MongoDB fill _id with a random ObjectId and *also* stored the real
//   business id ('C1', 'P001', 'O1001') in a separate field. That wastes a
//   field, wastes a second index once you make it unique, and means the id you
//   actually query by is not the one the engine is optimised around.
//
//   This is the document-store analog of the relational repo's "primary key"
//   pattern: promote the natural key to _id, and add unique indexes for the
//   remaining identity fields (a customer's email). It also fixes the data-type
//   smell the deck calls out — store ids/dates/numbers as their real BSON types.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Re-key: make the natural business id the _id.
// _id is immutable, so you cannot $set it — you rebuild the document. For a
// small teaching collection, read → reshape → drop → re-insert is fine; on a
// large collection you would $out / $merge into a new collection instead.
// ---------------------------------------------------------------------------
function rekey(collName, sourceField) {
  const coll = db.getCollection(collName);

  // Idempotency guard: if the source field is already gone, 001 has run.
  if (coll.countDocuments({ [sourceField]: { $exists: true } }) === 0) {
    print('  ' + collName + ': already re-keyed, skipping');
    return;
  }

  const reshaped = coll.find().toArray().map(function (doc) {
    const out = Object.assign({}, doc);
    out._id = doc[sourceField];   // e.g. _id = 'C1'
    delete out[sourceField];      // drop the now-redundant customerId field
    return out;
  });

  coll.drop();
  coll.insertMany(reshaped);
  print('  ' + collName + ': re-keyed on ' + sourceField + ' (' + reshaped.length + ' docs)');
}

rekey('customers', 'customerId');
rekey('products',  'productId');
rekey('orders',    'orderId');
rekey('reviews',   'reviewId');

// orderLines has NO single-field natural key — its identity is the pair
// (orderId, productId). Not every collection needs a meaningful _id, so we
// leave its ObjectId in place and instead enforce the pair with a unique
// compound index below. (It disappears entirely in 003 anyway, when the lines
// get embedded into their order.)


// ---------------------------------------------------------------------------
// Unique indexes for the *other* identity fields.
//   * _id is already unique + indexed, so productId/customerId need nothing more
//     — that is the whole point of re-keying (the relational repo needed an
//     explicit PK index here; we got it for free).
//   * email is an alternate key: unique, but not the _id.
//   * the (orderId, productId) pair uniquely identifies an order line.
// ---------------------------------------------------------------------------
db.customers.createIndex({ email: 1 }, { unique: true, name: 'customer_email_unique' });
db.orderLines.createIndex({ orderId: 1, productId: 1 }, { unique: true, name: 'orderline_order_product_unique' });


// ---------------------------------------------------------------------------
// After: the id you query by IS the indexed primary key — an _id lookup is the
// fastest read MongoDB can do, and there is no duplicate id field to keep in
// sync. The email index rejects duplicates at write time.
// ---------------------------------------------------------------------------
print('\n-- customer C1 by its _id (IDHACK — the fastest possible read) --');
printjson(db.customers.findOne({ _id: 'C1' }));

print('\n-- the unique email index now guards against duplicates --');
try {
  db.customers.insertOne({ _id: 'C999', name: 'Dupe', email: 'alice@example.com', state: 'CA' });
  print('  ERROR: duplicate email was allowed (index missing?)');
} catch (e) {
  print('  rejected duplicate email as expected: ' + (e.codeName || e.code || 'DuplicateKey'));
}


// ---------------------------------------------------------------------------
// Trade-off note:
//   * A natural _id ('P001') is great when it is short, stable and never reused.
//     If your "natural" key can change (an email, a mutable SKU) or you don't
//     control it, keep the default ObjectId as _id and put a unique index on the
//     business key instead — you can't update an _id later without a rewrite.
//   * A monotonically increasing _id (an ObjectId, or an integer counter)
//     concentrates every insert on one shard's key range. If you later shard a
//     write-heavy collection, that hot spot is exactly what pattern 008's
//     bucketing and a well-chosen shard key exist to avoid.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 1 },
  { _id: 1, description: 'Identity & keys (natural _id + unique indexes)', appliedAt: new Date() },
  { upsert: true }
);

print('\n001 applied — natural keys promoted to _id');
