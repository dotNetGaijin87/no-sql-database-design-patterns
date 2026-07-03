// ===========================================================================
// Script 002
//
//   INDEXING STRATEGY  (single-field, compound, and the ESR rule)
//
//   Re-keying (001) made _id lookups fast, but real screens query by other
//   fields: "this customer's orders, newest first", "products in a category by
//   price". Without an index each of those is a COLLSCAN that reads every
//   document. This is the document-store analog of the relational repo's
//   "indexing strategy" pattern.
//
//   The one rule worth memorising is ESR — a compound index should list fields
//   in the order: Equality first, then Sort, then Range. Get that order right
//   and one index both filters and returns already-sorted results with no
//   in-memory sort.
// ===========================================================================

db = db.getSiblingDB('onlinestore');


// ---------------------------------------------------------------------------
// Helper: print the winning plan stage + how many docs/keys were examined.
// A healthy query examines ~as many documents as it returns; a COLLSCAN
// examines the whole collection.
// ---------------------------------------------------------------------------
function planFor(cursor) {
  const ex = cursor.explain('executionStats');
  const stage = ex.queryPlanner.winningPlan.stage ||
                (ex.queryPlanner.winningPlan.inputStage &&
                 ex.queryPlanner.winningPlan.inputStage.stage);
  return {
    stage: stage,
    nReturned: ex.executionStats.nReturned,
    totalKeysExamined: ex.executionStats.totalKeysExamined,
    totalDocsExamined: ex.executionStats.totalDocsExamined
  };
}


// ---------------------------------------------------------------------------
// 1. Before — "orders for customer C1, newest first" is a COLLSCAN + in-memory
//    SORT: it examines every order document even though only two match.
// ---------------------------------------------------------------------------
print('\n-- BEFORE: orders for C1 newest-first (no index) --');
printjson(planFor(db.orders.find({ customerId: 'C1' }).sort({ orderDate: -1 })));


// ---------------------------------------------------------------------------
// 2. A single-field index already helps the equality match...
// ---------------------------------------------------------------------------
db.orders.createIndex({ customerId: 1 }, { name: 'order_customerId' });

// ...but the { customerId } index can't also satisfy the sort, so MongoDB still
// does a SORT stage. The fix is a COMPOUND index in ESR order: Equality on
// customerId, then Sort on orderDate. One index, no separate sort.
db.orders.createIndex({ customerId: 1, orderDate: -1 }, { name: 'order_customer_date' });

print('\n-- AFTER: same query, compound index (Equality=customerId, Sort=orderDate) --');
printjson(planFor(db.orders.find({ customerId: 'C1' }).sort({ orderDate: -1 })));


// ---------------------------------------------------------------------------
// 3. ESR with all three parts: "DELIVERED orders since 2024-03-01, newest
//    first". Equality = status, Sort = orderDate, Range = orderDate.
//    (Sort and Range share the same field here, which is common and fine.)
// ---------------------------------------------------------------------------
db.orders.createIndex({ status: 1, orderDate: -1 }, { name: 'order_status_date' });

print('\n-- ESR: status = DELIVERED, orderDate >= 2024-03-01, newest first --');
printjson(planFor(
  db.orders.find({ status: 'DELIVERED', orderDate: { $gte: ISODate('2024-03-01') } })
           .sort({ orderDate: -1 })
));


// ---------------------------------------------------------------------------
// 4. Covered query — when the index contains every field the query needs, the
//    documents are never touched (totalDocsExamined = 0). Here we index
//    (customerId, orderDate) and ask only for those fields back.
// ---------------------------------------------------------------------------
print('\n-- COVERED: projection served entirely from the index (0 docs examined) --');
printjson(planFor(
  db.orders.find({ customerId: 'C1' }, { _id: 0, customerId: 1, orderDate: 1 })
           .sort({ orderDate: -1 })
));


// ---------------------------------------------------------------------------
// 5. Partial (sparse-by-predicate) index — only software products carry a
//    requiredRam field. A partial index over just those documents stays small
//    and still answers "software needing <= 4GB".
// ---------------------------------------------------------------------------
db.products.createIndex(
  { requiredRam: 1 },
  { name: 'product_requiredRam_partial', partialFilterExpression: { requiredRam: { $exists: true } } }
);

print('\n-- PARTIAL: products with requiredRam <= 4 (index only spans software) --');
printjson(planFor(db.products.find({ requiredRam: { $lte: 4 } })));


// ---------------------------------------------------------------------------
// 6. Case-insensitive lookups via a collation index — "find the customer named
//    'alice johnson'" regardless of case, without a slow regex. Strength 2 =
//    case-insensitive. The query must use the same collation to hit the index.
// ---------------------------------------------------------------------------
db.customers.createIndex(
  { name: 1 },
  { name: 'customer_name_ci', collation: { locale: 'en', strength: 2 } }
);

print('\n-- CASE-INSENSITIVE: name = "alice johnson" via collation index --');
printjson(
  db.customers.find({ name: 'alice johnson' })
              .collation({ locale: 'en', strength: 2 })
              .toArray()
);


print('\n-- all indexes on orders now --');
db.orders.getIndexes().forEach(function (ix) { print('  ' + ix.name + ': ' + JSON.stringify(ix.key)); });


// ---------------------------------------------------------------------------
// Trade-off note:
//   * Every index speeds reads but taxes writes and RAM (indexes live in the
//     working set). Index for the queries you actually run, not for every field.
//   * ESR is the ordering rule; a compound index also serves any *prefix* of
//     its keys, so { customerId, orderDate } already covers plain { customerId }
//     queries — you rarely need both. The single-field customerId index created
//     in step 2 is redundant once the compound exists; it is left here only to
//     make the prefix point visible.
//   * You cannot index your way out of a bad model. If a screen always needs an
//     order *with* its lines, the real fix is embedding them (003), not a faster
//     $lookup.
// ---------------------------------------------------------------------------

db.getCollection('_migrations').replaceOne(
  { _id: 2 },
  { _id: 2, description: 'Indexing strategy (single, compound, ESR, covered, partial, collation)', appliedAt: new Date() },
  { upsert: true }
);

print('\n002 applied — indexes in place');
