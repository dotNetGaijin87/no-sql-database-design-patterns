// ===========================================================================
// Script 000
//
//   INITIAL NAIVE PORT & DIAGNOSTIC TOOLING
//
//   Creates the OnlineStore database as a *literal, table-for-table port of a
//   relational schema* — one collection per table, every relationship faked
//   with a string foreign key, and not a single index. It is deliberately
//   un-idiomatic so the later migrations have real anti-patterns to fix.
//
//   This is the same OnlineStore domain used by the relational and graph sister
//   repos, so the three read as one set. Like the graph repo, a document store
//   has no separate DDL step — the "schema" and its seed data are the same
//   insert, so this one file plays the role of BOTH 000_initial_schema.sql AND
//   seed_db.sql from the relational repo.
//
//   Baked-in anti-patterns (and where each is fixed):
//     * a random ObjectId _id AND a redundant business id field ... fixed in 001
//     * no indexes at all — every lookup is a COLLSCAN ............ fixed in 002
//     * a normalized Order split into orders + orderLines, joined
//       by an orderId string (a $lookup for something you always
//       read together) ......................................... fixed in 003
//     * order lines carry no snapshot of the product name ....... fixed in 004
//     * reviews reference author + product by id only, forcing a
//       $lookup to show a name ................................. fixed in 005
//     * software-only fields (compatibleOs/requiredRam) sit as
//       nullable fields on every product ...................... fixed in 006
//     * category is a "/"-delimited path string, not a tree ..... fixed in 012
//     * wishlist is a CSV string instead of an array ............ fixed later
//     * creditCard is inlined PII on the customer .............. fixed later
// ===========================================================================

db = db.getSiblingDB('onlinestore');

// Start from a clean slate so 000 is re-runnable on its own. (We leave the
// _migrations log created by conventions.js in place and just re-stamp row 0.)
['customers', 'products', 'orders', 'orderLines', 'reviews']
  .forEach(function (c) { db.getCollection(c).drop(); });


// ---------------------------------------------------------------------------
// Customers — name is one blob, state is a bare repeated string, the wishlist
// is a CSV string of product NAMES (not ids), and the credit card is inlined
// PII. Note customerId duplicates what _id should have been (fixed in 001).
// ---------------------------------------------------------------------------
db.customers.insertMany([
  { customerId: 'C1', name: 'Alice Johnson',  email: 'alice@example.com', state: 'CA', creditCard: '4111-1111-1111-1111', wishlist: 'Noise-Cancelling Headphones,4K Webcam' },
  { customerId: 'C2', name: 'Bob Smith',      email: 'bob@example.com',   state: 'NY', creditCard: '4111-2222-3333-4444', wishlist: 'Mechanical Keyboard' },
  { customerId: 'C3', name: 'Carol Williams', email: 'carol@example.com', state: 'CA', creditCard: '4111-5555-6666-7777', wishlist: 'Noise-Cancelling Headphones,Photo Editor Pro' },
  { customerId: 'C4', name: 'David Brown',    email: 'david@example.com', state: 'TX', creditCard: '4111-8888-9999-0000', wishlist: '' },
  { customerId: 'C5', name: 'Eve Davis',      email: 'eve@example.com',   state: 'NY', creditCard: '4111-1212-3434-5656', wishlist: 'Gaming Mouse,Mechanical Keyboard' },
  { customerId: 'C6', name: 'Frank Miller',   email: 'frank@example.com', state: 'CA', creditCard: '4111-7878-9090-1212', wishlist: '4K Webcam' }
]);


// ---------------------------------------------------------------------------
// Products — category is a "/"-delimited path string, the vendor is a repeated
// free-text name, and software-only attributes (compatibleOs / requiredRam)
// sit as nullable fields on the same shape as the hardware products.
// ---------------------------------------------------------------------------
db.products.insertMany([
  { productId: 'P001', name: 'Noise-Cancelling Headphones', category: 'Electronics/Audio/Headphones',      vendorName: 'Acme Audio', listPrice: 299.00 },
  { productId: 'P002', name: '4K Webcam',                   category: 'Electronics/Video/Webcams',         vendorName: 'Acme Audio', listPrice: 129.00 },
  { productId: 'P003', name: 'Mechanical Keyboard',         category: 'Electronics/Peripherals/Keyboards', vendorName: 'KeyWorks',   listPrice:  89.00 },
  { productId: 'P004', name: 'Gaming Mouse',                category: 'Electronics/Peripherals/Mice',      vendorName: 'KeyWorks',   listPrice:  59.00 },
  { productId: 'P005', name: 'Photo Editor Pro',            category: 'Software/Creative',                 vendorName: 'PixelSoft',  listPrice: 199.00, compatibleOs: 'Windows, macOS',        requiredRam: 8 },
  { productId: 'P006', name: 'Office Suite',                category: 'Software/Productivity',             vendorName: 'PixelSoft',  listPrice: 149.00, compatibleOs: 'Windows, macOS, Linux', requiredRam: 4 },
  { productId: 'P007', name: 'USB-C Hub',                   category: 'Electronics/Peripherals/Adapters',  vendorName: 'ConnectCo',  listPrice:  39.00 },
  { productId: 'P008', name: 'Studio Microphone',          category: 'Electronics/Audio/Microphones',     vendorName: 'Acme Audio', listPrice: 179.00 },
  { productId: 'P009', name: 'Webcam Light',               category: 'Electronics/Video/Lighting',        vendorName: 'ConnectCo',  listPrice:  49.00 },
  { productId: 'P010', name: 'Antivirus Plus',             category: 'Software/Security',                 vendorName: 'PixelSoft',  listPrice:  79.00, compatibleOs: 'Windows',              requiredRam: 2 }
]);


// ---------------------------------------------------------------------------
// Orders — a normalized master/detail split, ported straight from the relational
// schema: an `orders` HEADER collection plus an `orderLines` DETAIL collection
// joined by an orderId string. In a document store you almost always read an
// order together with its lines, so this split forces a $lookup on the hottest
// read path. Pattern 003 collapses it into an embedded `items` array.
// ---------------------------------------------------------------------------
db.orders.insertMany([
  { orderId: 'O1001', customerId: 'C1', orderDate: ISODate('2024-01-15'), status: 'DELIVERED'  },
  { orderId: 'O1002', customerId: 'C2', orderDate: ISODate('2024-02-03'), status: 'DELIVERED'  },
  { orderId: 'O1003', customerId: 'C3', orderDate: ISODate('2024-02-20'), status: 'SHIPPED'    },
  { orderId: 'O1004', customerId: 'C4', orderDate: ISODate('2024-03-01'), status: 'DELIVERED'  },
  { orderId: 'O1005', customerId: 'C5', orderDate: ISODate('2024-03-10'), status: 'PROCESSING' },
  { orderId: 'O1006', customerId: 'C6', orderDate: ISODate('2024-03-12'), status: 'DELIVERED'  },
  { orderId: 'O1007', customerId: 'C1', orderDate: ISODate('2024-04-02'), status: 'DELIVERED'  },
  { orderId: 'O1008', customerId: 'C3', orderDate: ISODate('2024-04-15'), status: 'DELIVERED'  }
]);

// The detail rows. listPrice on the line is the price *at order time* — already
// a (partial) snapshot; pattern 004 adds the product name snapshot too.
db.orderLines.insertMany([
  { orderId: 'O1001', productId: 'P001', quantity: 1, listPrice: 299.00 },
  { orderId: 'O1001', productId: 'P007', quantity: 1, listPrice:  39.00 },
  { orderId: 'O1002', productId: 'P003', quantity: 1, listPrice:  89.00 },
  { orderId: 'O1002', productId: 'P004', quantity: 2, listPrice:  59.00 },
  { orderId: 'O1003', productId: 'P001', quantity: 1, listPrice: 299.00 },
  { orderId: 'O1003', productId: 'P005', quantity: 1, listPrice: 199.00 },
  { orderId: 'O1004', productId: 'P008', quantity: 1, listPrice: 179.00 },
  { orderId: 'O1005', productId: 'P003', quantity: 1, listPrice:  89.00 },
  { orderId: 'O1005', productId: 'P004', quantity: 1, listPrice:  59.00 },
  { orderId: 'O1006', productId: 'P002', quantity: 1, listPrice: 129.00 },
  { orderId: 'O1006', productId: 'P009', quantity: 1, listPrice:  49.00 },
  { orderId: 'O1007', productId: 'P002', quantity: 1, listPrice: 129.00 },
  { orderId: 'O1008', productId: 'P008', quantity: 1, listPrice: 179.00 }
]);


// ---------------------------------------------------------------------------
// Reviews — reference their author and product by id only. Showing a review
// with the reviewer's name or the product's name therefore needs a $lookup.
// Pattern 005 (extended reference) copies the few fields we always display.
// ---------------------------------------------------------------------------
db.reviews.insertMany([
  { reviewId: 'R1', authorId: 'C1', productId: 'P001', rating: 5, content: 'Incredible noise cancellation.', createdAt: ISODate('2024-02-01') },
  { reviewId: 'R2', authorId: 'C3', productId: 'P001', rating: 4, content: 'Great, but pricey.',            createdAt: ISODate('2024-03-05') },
  { reviewId: 'R3', authorId: 'C2', productId: 'P003', rating: 5, content: 'Best keyboard I have owned.',   createdAt: ISODate('2024-02-20') },
  { reviewId: 'R4', authorId: 'C5', productId: 'P004', rating: 3, content: 'The mouse is just okay.',       createdAt: ISODate('2024-03-25') },
  { reviewId: 'R5', authorId: 'C4', productId: 'P008', rating: 4, content: 'Crisp, clean audio.',           createdAt: ISODate('2024-03-20') },
  { reviewId: 'R6', authorId: 'C6', productId: 'P002', rating: 5, content: 'Razor-sharp 4K image.',         createdAt: ISODate('2024-03-30') }
]);


// ===========================================================================
// Diagnostic tooling
// ---------------------------------------------------------------------------
// Every later lesson proves an improvement actually happened, so we need a way
// to introspect the database — the document equivalent of the relational repo's
// DBCC / sys.dm_* diagnostics. Run these now to capture the naive baseline,
// then again after any migration to see what changed.
// ===========================================================================

print('\n-- collections and document counts --');
db.getCollectionNames().sort().forEach(function (c) {
  print('  ' + c + ': ' + db.getCollection(c).countDocuments({}));
});

print('\n-- a naive order read needs a $lookup to see its lines (and another for the customer) --');
printjson(
  db.orders.aggregate([
    { $match: { orderId: 'O1002' } },
    { $lookup: { from: 'orderLines', localField: 'orderId', foreignField: 'orderId', as: 'lines' } },
    { $lookup: { from: 'customers',  localField: 'customerId', foreignField: 'customerId', as: 'customer' } }
  ]).toArray()
);

print('\n-- indexes on customers: only the default _id (the gap 001/002 close) --');
printjson(db.customers.getIndexes());

print('\n-- "find product P001" is a COLLSCAN today (no index on productId) --');
printjson(
  db.products.find({ productId: 'P001' }).explain('queryPlanner').queryPlanner.winningPlan
);


// ---------------------------------------------------------------------------
// Record this migration (see helpers/conventions.js for the convention)
// ---------------------------------------------------------------------------
db.getCollection('_migrations').replaceOne(
  { _id: 0 },
  { _id: 0, description: 'Initial naive port & diagnostic tooling', appliedAt: new Date() },
  { upsert: true }
);

print('\n000 applied — naive OnlineStore created');
