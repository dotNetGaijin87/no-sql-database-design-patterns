// ===========================================================================
// Script 012
//
//   TREE STRUCTURES  (modeling a hierarchy four ways)
//
//   The naive port stored a product's place in the catalogue as a "/"-delimited
//   PATH STRING: category = "Electronics/Audio/Headphones". You cannot ask "what
//   are the direct children of Electronics?" or "every product anywhere under
//   Electronics?" without string surgery on every document.
//
//   This script lifts that hierarchy into a real `categories` collection and, on
//   each node, records it THREE ways at once — the encodings the deck compares:
//     * parentId    — the immediate parent (child/parent references)
//     * ancestors[] — every ancestor id, root→parent (array of ancestors)
//     * path        — the human "/"-delimited path (materialized path)
//   Then products reference their leaf category by id. Different questions are
//   cheap under different encodings, so we keep all three and pick per query.
// ===========================================================================

db = db.getSiblingDB('onlinestore');

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Only (re)build from the path string when it is still present. On a repeat run
// the products already reference categoryId and have no `category`, so we skip
// the rebuild and leave the existing tree untouched (idempotency).
if (db.products.countDocuments({ category: { $exists: true } }) > 0) {

  // ---- Build one category document per node in every product's path ----------
  const cats = {};
  db.products.find({}, { category: 1 }).forEach(function (p) {
    if (!p.category) return;
    const parts = p.category.split('/');
    let ancestorIds = [];
    let acc = [];
    parts.forEach(function (name) {
      acc.push(name);
      const path = acc.join('/');
      const id = slug(path);
      if (!cats[id]) {
        cats[id] = {
          _id: id,
          name: name,
          parentId: ancestorIds.length ? ancestorIds[ancestorIds.length - 1] : null,
          ancestors: ancestorIds.slice(),
          path: path
        };
      }
      ancestorIds.push(id);
    });
  });

  db.categories.drop();
  db.categories.insertMany(Object.keys(cats).map(function (k) { return cats[k]; }));

  db.categories.createIndex({ parentId: 1 },  { name: 'category_parent' });
  db.categories.createIndex({ ancestors: 1 }, { name: 'category_ancestors' });
  db.categories.createIndex({ path: 1 },      { name: 'category_path' });

  // ---- Point each product at its leaf category, drop the redundant string ----
  db.products.find({}, { category: 1 }).forEach(function (p) {
    if (!p.category) return;
    db.products.updateOne({ _id: p._id },
      { $set: { categoryId: slug(p.category) }, $unset: { category: '' } });
  });
  db.products.createIndex({ categoryId: 1 }, { name: 'product_categoryId' });
}


// ---------------------------------------------------------------------------
// The same tree answers different questions cheaply under different encodings.
// ---------------------------------------------------------------------------
print('\n-- direct children of Electronics (parentId) --');
printjson(db.categories.find({ parentId: 'electronics' }, { _id: 1, name: 1 }).sort({ _id: 1 }).toArray());

print('\n-- EVERY descendant of Electronics, one indexed query (ancestors[]) --');
printjson(db.categories.find({ ancestors: 'electronics' }, { _id: 0, path: 1 }).sort({ path: 1 }).toArray());

print('\n-- EVERY descendant via indexed path prefix (materialized path) --');
printjson(db.categories.find({ path: /^Electronics\// }, { _id: 0, path: 1 }).sort({ path: 1 }).toArray());

print('\n-- breadcrumb: the ancestors of the Headphones node --');
const hp = db.categories.findOne({ _id: 'electronics-audio-headphones' });
printjson(db.categories.find({ _id: { $in: hp.ancestors } }, { _id: 0, name: 1, path: 1 }).sort({ path: 1 }).toArray());

print('\n-- all products anywhere under Electronics (subtree → categoryId $in) --');
const subtree = db.categories.find({ $or: [{ _id: 'electronics' }, { ancestors: 'electronics' }] }, { _id: 1 })
                             .toArray().map(function (c) { return c._id; });
printjson(db.products.find({ categoryId: { $in: subtree } }, { _id: 1, name: 1, categoryId: 1 }).sort({ _id: 1 }).toArray());

print('\n-- server-side recursive walk of the parentId links ($graphLookup) --');
printjson(
  db.categories.aggregate([
    { $match: { _id: 'electronics' } },
    { $graphLookup: { from: 'categories', startWith: '$_id',
                      connectFromField: '_id', connectToField: 'parentId', as: 'descendants' } },
    { $project: { _id: 1, name: 1, descendantCount: { $size: '$descendants' } } }
  ]).toArray()
);


// ---------------------------------------------------------------------------
// Trade-offs & when *not* to use each encoding:
//   * child / parent references — smallest to store and cheapest to write; great
//     for "immediate children" and top-down walks. A whole subtree needs
//     recursion — either app-side or $graphLookup (shown above).
//   * array of ancestors — one indexed query for "all descendants" and instant
//     breadcrumbs; the cost is that MOVING a subtree rewrites the ancestors of
//     every node beneath it.
//   * materialized path — an indexed prefix regex (/^Electronics\//) answers
//     "all descendants" with zero joins; the cost is string upkeep on moves and
//     that a leading-wildcard match can't use the index.
//   Keeping all three (as here) is common for a small, read-heavy taxonomy. For a
//   deep, frequently-restructured tree, store fewer and lean on $graphLookup.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 12 },
  { _id: 12, description: 'Tree structures (categories: parentId + ancestors[] + materialized path)', appliedAt: new Date() },
  { upsert: true }
);

print('\n012 applied — category hierarchy extracted into a tree');
