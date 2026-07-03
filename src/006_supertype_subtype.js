// ===========================================================================
// Script 006
//
//   SUPERTYPE / SUBTYPE  (polymorphism in one collection)
//
//   The naive port carried software-only fields (compatibleOs, requiredRam) as
//   nullable fields sitting on *every* product, hardware included. That is the
//   relational "one wide table with lots of NULLs" smell ported straight over.
//
//   The document fix is single-collection polymorphism: keep all products in one
//   collection (so "all products" and shared fields stay one query), add a
//   `productType` DISCRIMINATOR, and move each subtype's own fields into a `spec`
//   subdocument that is simply absent on the other subtype. This is the deck's
//   "roll-up" shape — the alternative "roll-down" (a separate collection per
//   subtype) is noted in the trade-offs.
// ===========================================================================

db = db.getSiblingDB('onlinestore');

// Plausible hardware weights (kg) so the Hardware subtype has a real spec field,
// mirroring the deck's software=requiredRam / hardware=weight example.
const hardwareWeightKg = {
  P001: 0.25, P002: 0.12, P003: 0.90, P004: 0.08,
  P007: 0.05, P008: 0.55, P009: 0.15
};

db.products.find().forEach(function (p) {
  if (p.productType) { return; }               // idempotency guard — already migrated

  const isSoftware = p.category.split('/')[0] === 'Software';

  if (isSoftware) {
    const spec = {};
    if (p.compatibleOs !== undefined) spec.compatibleOs = p.compatibleOs;
    if (p.requiredRam  !== undefined) spec.requiredRam  = p.requiredRam;
    db.products.updateOne({ _id: p._id }, {
      $set:   { productType: 'Software', spec: spec },
      $unset: { compatibleOs: '', requiredRam: '' }
    });
  } else {
    db.products.updateOne({ _id: p._id }, {
      $set: { productType: 'Hardware', spec: { weightKg: hardwareWeightKg[p._id] || null } }
    });
  }
});

// A discriminator index, so "give me all software" is index-served.
db.products.createIndex({ productType: 1 }, { name: 'product_type' });

// The requiredRam field moved under spec — move its partial index there too
// (002 built it on the old top-level field, which no longer exists).
try { db.products.dropIndex('product_requiredRam_partial'); } catch (e) { /* absent on re-run */ }
db.products.createIndex(
  { 'spec.requiredRam': 1 },
  { name: 'product_spec_requiredRam_partial',
    partialFilterExpression: { 'spec.requiredRam': { $exists: true } } }
);


// ---------------------------------------------------------------------------
// After: one collection, queried three ways —
// ---------------------------------------------------------------------------
print('\n-- polymorphic: every product with its subtype (shared fields, one query) --');
printjson(
  db.products.find({}, { _id: 1, name: 1, productType: 1 }).sort({ _id: 1 }).toArray()
);

print('\n-- subtype-specific: software needing <= 4GB (discriminator + spec) --');
printjson(
  db.products.find({ productType: 'Software', 'spec.requiredRam': { $lte: 4 } },
                   { _id: 0, name: 1, 'spec.requiredRam': 1 }).toArray()
);

print('\n-- the other subtype: hardware by weight --');
printjson(
  db.products.find({ productType: 'Hardware' }, { _id: 0, name: 1, 'spec.weightKg': 1 })
             .sort({ 'spec.weightKg': 1 }).toArray()
);


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use it:
//   * Single-collection roll-up is the default: it keeps "all products" a single
//     query, lets shared fields (name, listPrice, vendorName) be indexed once,
//     and the absent subtype fields cost nothing (no wide NULL columns).
//   * Prefer separate subtype collections (roll-down) only when the subtypes
//     barely overlap, are almost always queried apart, or have very different
//     index/validation needs — then a shared "supertype" view is the join.
//   * Always branch on the discriminator, never on "does field X exist" — the
//     field's presence is an implementation detail; productType is the contract.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 6 },
  { _id: 6, description: 'Supertype/subtype (productType discriminator + spec subdocument)', appliedAt: new Date() },
  { upsert: true }
);

print('\n006 applied — products carry a productType discriminator');
