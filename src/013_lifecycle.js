// ===========================================================================
// Script 013
//
//   DATA LIFECYCLE & INTEGRITY  (PII, soft delete, TTL, validation)
//
//   A schema-flexible store still needs guard rails. This lesson applies four
//   lifecycle techniques the deck flags — none of which the naive port had:
//     * obfuscate the inlined credit-card PII (never store a raw PAN)
//     * soft-delete instead of hard-delete, so history and references survive
//     * expire ephemeral data automatically with a TTL index
//     * enforce a shape with a $jsonSchema validator
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// 1. PII obfuscation — the naive customer inlined a full card number. Replace it
//    with what you may actually keep: the last four digits plus an opaque token.
// ---------------------------------------------------------------------------
db.customers.find({ creditCard: { $exists: true } }).forEach(function (c) {
  const digits = (c.creditCard || '').replace(/\D/g, '');
  db.customers.updateOne({ _id: c._id }, {
    $set:   { card: { last4: digits.slice(-4), token: 'tok_' + c._id + '_' + digits.slice(-4) } },
    $unset: { creditCard: '' }
  });
});
print('\n-- raw card numbers remaining: ' + db.customers.countDocuments({ creditCard: { $exists: true } }) + ' (was 6) --');
printjson(db.customers.findOne({ _id: 'C1' }, { _id: 0, name: 1, card: 1 }));


// ---------------------------------------------------------------------------
// 2. Soft delete — a discontinued product must not vanish (old orders and
//    reviews still point at it). Flag it instead, and index only the live rows
//    with a partial index so the common "active products" query stays fast.
// ---------------------------------------------------------------------------
db.products.updateMany({}, { $set: { isActive: true } });
db.products.updateOne({ _id: 'P010' }, { $set: { isActive: false, deletedAt: new Date() } });
db.products.createIndex(
  { isActive: 1, categoryId: 1 },
  { name: 'product_active', partialFilterExpression: { isActive: true } }
);
print('\n-- active products: ' + db.products.countDocuments({ isActive: true }) +
      ' of ' + db.products.countDocuments({}) + ' (P010 soft-deleted, still referable) --');


// ---------------------------------------------------------------------------
// 3. TTL index — ephemeral data (sessions, carts, verification codes) should
//    expire itself. A TTL index on an `expiresAt` date deletes each document
//    once that moment passes; expireAfterSeconds:0 means "expire exactly at the
//    field's value".
// ---------------------------------------------------------------------------
db.sessions.drop();
db.sessions.insertMany([
  { _id: 'sess_a', customerId: 'C1', createdAt: new Date('2024-05-01T09:00:00Z'), expiresAt: new Date('2027-01-01T00:00:00Z') },
  { _id: 'sess_b', customerId: 'C2', createdAt: new Date('2024-05-01T10:00:00Z'), expiresAt: new Date('2027-01-01T00:00:00Z') }
]);
db.sessions.createIndex({ expiresAt: 1 }, { name: 'session_ttl', expireAfterSeconds: 0 });
print('\n-- sessions collection has a TTL index; MongoDB reaps rows once expiresAt passes --');


// ---------------------------------------------------------------------------
// 4. Schema validation — flexibility does not mean anarchy. Attach a
//    $jsonSchema validator to reviews so a bad rating can't get in. `moderate`
//    validates inserts and updates to already-valid docs, sparing legacy rows.
// ---------------------------------------------------------------------------
db.runCommand({
  collMod: 'reviews',
  validator: { $jsonSchema: {
    bsonType: 'object',
    required: ['productId', 'authorId', 'rating'],
    properties: { rating: { bsonType: 'number', minimum: 1, maximum: 5 } }
  } },
  validationLevel: 'moderate'
});
print('\n-- reviews now enforce rating 1..5 — a bad write is rejected --');
try {
  db.reviews.insertOne({ _id: 'BAD', productId: 'P001', authorId: 'C1', rating: 9 });
  print('   ERROR: invalid rating was accepted');
} catch (e) {
  print('   rejected invalid rating as expected (code ' + (e.code || e.codeName) + ')');
}


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use each:
//   * PII: store the minimum you need (last4 + a token from your vault); never
//     the PAN. This is the document analog of the relational repo's obfuscation
//     (023) — with no column types, YOU own the discipline.
//   * Soft delete: keeps references valid and enables undelete/audit, but every
//     query must now filter isActive, and the rows still cost storage — sweep
//     them eventually. Don't soft-delete truly transient data; hard-delete it.
//   * TTL: great for self-expiring data; it's a background sweep (not instant)
//     and only works off a date field — don't rely on it for precise deadlines.
//   * Validation: start `moderate`/`warn` and tighten to `strict`/`error` once
//     the data is clean, so you don't lock out writes to fix legacy documents.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 13 },
  { _id: 13, description: 'Lifecycle & integrity (PII obfuscation, soft delete, TTL, $jsonSchema)', appliedAt: new Date() },
  { upsert: true }
);

print('\n013 applied — lifecycle guard rails in place');
