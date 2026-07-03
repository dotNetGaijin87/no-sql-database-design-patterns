// ---------------------------------------------------------------------------
// conventions.js — naming conventions + the _migrations bookkeeping collection
// ---------------------------------------------------------------------------
// Run this once before src/000 (the README's apply loop does it for you). It
// documents the conventions used throughout the repo and creates the tiny
// _migrations collection that every src/0NN script stamps itself into.
// ---------------------------------------------------------------------------
//
// Naming conventions
// ------------------
// A document database has three building blocks — collections, documents and
// fields — and, unlike the relational sister repo (snake_case everywhere), the
// MongoDB / JavaScript community idiom is:
//
//   Collection name   : lowercase plural noun; camelCase for multi-word
//                     : customers, products, orders, reviews, orderLines
//   Field key         : camelCase, singular
//                     : customerId, listPrice, orderDate, avgRating
//   Identity field    : _id — the primary key. Prefer a MEANINGFUL natural key
//                       ('C1', 'P001', 'O1001') over a random ObjectId when the
//                       domain already has a stable unique id (see pattern 001).
//   Reference field   : <entity>Id or <entity>Ids for an array of refs
//                     : customerId, productId, tagIds
//   Discriminator     : <entity>Type, for supertype/subtype polymorphism (006)
//                     : productType: 'Software' | 'Hardware'
//   Embedded array    : plural noun naming the children — items, reviews, tags
//
// The casing itself is a design tell, exactly as in the sister repos: a field
// that merely *names another document* (authorId) is a reference; the pattern
// work in this repo is deciding when that reference should instead be an
// embedded subdocument.
//
// Migration history
// -----------------
// The relational sister repo records each applied migration in a
// dbo.migration_history TABLE; the graph repo uses a chain of (:_Migration)
// nodes. A document store records the same audit trail as documents in a
// _migrations collection, keyed by the migration number as _id.
// ---------------------------------------------------------------------------

db = db.getSiblingDB('onlinestore');

// Creating the collection explicitly is optional (MongoDB makes it on first
// insert), but doing it here makes the intent obvious and the apply loop tidy.
if (!db.getCollectionNames().includes('_migrations')) {
  db.createCollection('_migrations');
}

// Usage (every src/0NN script ends with a line like this):
//   db._migrations.replaceOne(
//     { _id: 1 },
//     { _id: 1, description: 'Identity & keys', appliedAt: new Date() },
//     { upsert: true }
//   );

print('conventions applied — onlinestore._migrations ready');
