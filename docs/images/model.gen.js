// ---------------------------------------------------------------------------
// model.gen.js — generates model-before.svg and model-after.svg
// ---------------------------------------------------------------------------
// Each collection is drawn as a small "document shape" tree: fields with types,
// nested sub-documents/arrays indented under a guide line, and references drawn
// as connector lines to the target collection (with a cardinality label).
//   before : the naive port — ObjectId _ids, duplicate id fields, string
//            foreign keys (dashed lines), a separate orderLines collection.
//   after  : the document model — natural _ids, embedded card/items/spec,
//            real references (solid lines). N:N where a reference is array-valued.
//
// Edit the `before` / `after` definitions below and re-render (plain Node):
//     node docs/images/model.gen.js
// (The editable source next to the SVG, like the sister repos' Graphviz .dot.)
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const F = "'Segoe UI', Helvetica, Arial, sans-serif", MONO = "Consolas, 'Courier New', monospace";
const COL = { customers: '#2563eb', orders: '#00a35c', products: '#7c3aed', reviews: '#d97706', categories: '#0891b2', orderLines: '#0f766e' };
const HDR = 38, ROW = 25, PADB = 14, W_ = 285, LINE = '#94a3b8', REF = '#2563eb', FK = '#b45309';

function build(spec) {
  const { W, H, cards, model, conns } = spec;
  const idx = (c, n) => model[c].findIndex(f => f.n === n);
  const rowY = (c, i) => cards[c].y + HDR + i * ROW + 13;

  function card(id) {
    const { x, y } = cards[id], fs2 = model[id], h = HDR + fs2.length * ROW + PADB;
    let s = `<rect x="${x}" y="${y}" width="${W_}" height="${h}" rx="11" fill="#ffffff" stroke="#e6ebf2" stroke-width="1.3" filter="url(#sh)"/>`;
    s += `<circle cx="${x + 18}" cy="${y + 20}" r="5" fill="${COL[id]}"/>`;
    s += `<text x="${x + 32}" y="${y + 25}" font-size="15" font-weight="800" fill="#0f172a" font-family="${F}">${id}</text>`;
    s += `<line x1="${x}" y1="${y + HDR}" x2="${x + W_}" y2="${y + HDR}" stroke="#eef2f7" stroke-width="1.2"/>`;
    fs2.forEach((f, i) => {
      if (f.t === '{ }' || f.t === '[ ]') { let j = i + 1; while (j < fs2.length && fs2[j].l > f.l) j++;
        if (j > i + 1) { const gx = x + 20 + f.l * 18 + 7; s += `<line x1="${gx}" y1="${y + HDR + i * ROW + ROW - 4}" x2="${gx}" y2="${y + HDR + (j - 1) * ROW + 17}" stroke="#dbe3ec" stroke-width="1.2"/>`; } }
    });
    fs2.forEach((f, i) => {
      const by = rowY(id, i), nx = x + 20 + f.l * 18;
      const nc = f.ref ? REF : (f.fk ? FK : (f.l > 0 ? '#475569' : '#1f2b38')), nw = f.n === '_id' ? 700 : 500;
      s += `<text x="${nx}" y="${by}" font-size="13" font-family="${MONO}" font-weight="${nw}" fill="${nc}">${f.n}</text>`;
      const right = f.ref ? (f.arr ? 'ref [ ]' : 'ref') : f.t;
      const rc = f.ref ? REF : (f.t === '{ }' || f.t === '[ ]' ? '#94a3b8' : '#64748b');
      s += `<text x="${x + W_ - 16}" y="${by}" font-size="12.5" font-family="${MONO}" text-anchor="end" fill="${rc}">${right}</text>`;
    });
    return s;
  }

  function conn(c) {
    const S = cards[c.s], T = cards[c.t];
    const sy = rowY(c.s, idx(c.s, c.sf)) - 4, ty = rowY(c.t, idx(c.t, c.tf || '_id')) - 4 + (c.tdy || 0);
    const sx = c.se === 'R' ? S.x + W_ : S.x, tx = c.te === 'R' ? T.x + W_ : T.x;
    const outS = Math.sign(c.bend - sx) || 1, adir = Math.sign(tx - c.bend) || 1;
    const sf = model[c.s][idx(c.s, c.sf)];
    let s = `<circle cx="${sx}" cy="${sy}" r="3.2" fill="${sf.fk ? FK : REF}"/>`;                    // dot at the reference field
    s += `<path d="M${sx},${sy} H${c.bend} V${ty} H${tx}" fill="none" stroke="${LINE}" stroke-width="1.5"/>`;
    s += `<path d="M${tx},${ty} l${-9 * adir},-4.5 l0,9 z" fill="${LINE}"/>`;                        // arrowhead at the referenced collection
    // cardinality label beside the source field: distinct row per line, so they stay spaced out
    // and sit just above the line rather than overlaying it.
    if (c.c) { const lx = sx + outS * 40, ly = sy - 14;
      s += `<rect x="${lx - 20}" y="${ly - 10}" width="40" height="19" rx="9" fill="#fff" stroke="#cbd5e1" stroke-width="1"/>`;
      s += `<text x="${lx}" y="${ly + 3.5}" font-size="11" font-weight="700" text-anchor="middle" fill="#475569" font-family="${F}">${c.c}</text>`; }
    return s;
  }

  const TOP = 22; // crop the empty top margin (no caption)
  let b = '';
  conns.forEach(c => b += conn(c));
  Object.keys(cards).forEach(id => b += card(id));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${TOP} ${W} ${H - TOP}" font-family="${F}"><defs><filter id="sh" x="-8%" y="-8%" width="116%" height="122%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#1e293b" flood-opacity="0.10"/></filter></defs><rect x="0" y="${TOP}" width="${W}" height="${H - TOP}" fill="#f8fafc"/>${b}</svg>`;
}

// ============================ AFTER — the document model ============================
const after = {
  W: 1180, H: 590, caption: 'OnlineStore — document model  ·  solid line = reference  ·  N:1 / N:N = cardinality',
  cards: { orders: { x: 40, y: 46 }, reviews: { x: 40, y: 352 }, customers: { x: 470, y: 46 }, products: { x: 470, y: 330 }, categories: { x: 830, y: 392 } },
  model: {
    customers: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'name', l: 0, t: 'string' }, { n: 'email', l: 0, t: 'string' },
      { n: 'wishlistProductIds', l: 0, ref: 1, arr: 1 }, { n: 'card', l: 0, t: '{ }' }, { n: 'last4', l: 1, t: 'string' }, { n: 'token', l: 1, t: 'string' }],
    orders: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'customerId', l: 0, ref: 1 }, { n: 'orderDate', l: 0, t: 'date' }, { n: 'status', l: 0, t: 'string' },
      { n: 'items', l: 0, t: '[ ]' }, { n: 'productId', l: 1, ref: 1 }, { n: 'quantity', l: 1, t: 'int' }, { n: 'listPrice', l: 1, t: 'double' }],
    products: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'name', l: 0, t: 'string' }, { n: 'listPrice', l: 0, t: 'double' }, { n: 'productType', l: 0, t: 'string' },
      { n: 'categoryId', l: 0, ref: 1 }, { n: 'spec', l: 0, t: '{ }' }, { n: 'weightKg', l: 1, t: 'double' }],
    reviews: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'authorId', l: 0, ref: 1 }, { n: 'productId', l: 0, ref: 1 }, { n: 'rating', l: 0, t: 'int' }, { n: 'authorName', l: 0, t: 'string' }],
    categories: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'name', l: 0, t: 'string' }, { n: 'parentId', l: 0, ref: 1 }, { n: 'ancestors', l: 0, ref: 1, arr: 1 }, { n: 'path', l: 0, t: 'string' }],
  },
  conns: [
    { s: 'orders', sf: 'customerId', t: 'customers', se: 'R', te: 'L', bend: 360, c: 'N:1', tdy: -8 },
    { s: 'orders', sf: 'productId', t: 'products', se: 'R', te: 'L', bend: 400, c: 'N:N', tdy: -8 }, // items[] is array-valued → many-to-many
    { s: 'reviews', sf: 'authorId', t: 'customers', se: 'R', te: 'L', bend: 432, c: 'N:1', tdy: 8 },
    { s: 'reviews', sf: 'productId', t: 'products', se: 'R', te: 'L', bend: 380, c: 'N:1', tdy: 8 },
    { s: 'products', sf: 'categoryId', t: 'categories', se: 'R', te: 'L', bend: 793, c: 'N:1' },
    { s: 'customers', sf: 'wishlistProductIds', t: 'products', se: 'R', te: 'R', bend: 785, c: 'N:N' },
    { s: 'categories', sf: 'parentId', t: 'categories', se: 'R', te: 'R', bend: 1150, c: 'tree' },
  ],
};

// ============================ BEFORE — the naive port ============================
// Relational normalization ported as-is: a separate orderLines collection turns the
// order↔product many-to-many into two N:1 string FKs. Dashed = faked (string) FK.
const before = {
  W: 905, H: 690, caption: 'OnlineStore — naive port  ·  dashed line = string foreign key (a $lookup)  ·  N:1 = cardinality',
  cards: { orders: { x: 60, y: 44 }, orderLines: { x: 60, y: 252 }, reviews: { x: 60, y: 460 }, customers: { x: 580, y: 44 }, products: { x: 580, y: 320 } },
  model: {
    orders: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'orderId', l: 0, t: 'string' }, { n: 'customerId', l: 0, fk: 1, t: 'string' }, { n: 'orderDate', l: 0, t: 'date' }, { n: 'status', l: 0, t: 'string' }],
    orderLines: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'orderId', l: 0, fk: 1, t: 'string' }, { n: 'productId', l: 0, fk: 1, t: 'string' }, { n: 'quantity', l: 0, t: 'int' }, { n: 'listPrice', l: 0, t: 'double' }],
    reviews: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'reviewId', l: 0, t: 'string' }, { n: 'authorId', l: 0, fk: 1, t: 'string' }, { n: 'productId', l: 0, fk: 1, t: 'string' }, { n: 'rating', l: 0, t: 'int' }, { n: 'content', l: 0, t: 'string' }],
    customers: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'customerId', l: 0, t: 'string' }, { n: 'name', l: 0, t: 'string' }, { n: 'email', l: 0, t: 'string' }, { n: 'state', l: 0, t: 'string' }, { n: 'wishlist', l: 0, t: 'string' }, { n: 'creditCard', l: 0, t: 'string' }],
    products: [{ n: '_id', l: 0, t: 'ObjectId' }, { n: 'productId', l: 0, t: 'string' }, { n: 'name', l: 0, t: 'string' }, { n: 'category', l: 0, t: 'string' }, { n: 'vendorName', l: 0, t: 'string' }, { n: 'listPrice', l: 0, t: 'double' }, { n: 'compatibleOs', l: 0, t: 'string' }],
  },
  conns: [
    { s: 'orders', sf: 'customerId', t: 'customers', tf: 'customerId', se: 'R', te: 'L', bend: 448, c: 'N:1', dashed: 1, tdy: -8 },
    { s: 'orderLines', sf: 'orderId', t: 'orders', tf: 'orderId', se: 'L', te: 'L', bend: 34, c: 'N:1', dashed: 1 },
    { s: 'orderLines', sf: 'productId', t: 'products', tf: 'productId', se: 'R', te: 'L', bend: 470, c: 'N:1', dashed: 1, tdy: -8 },
    { s: 'reviews', sf: 'authorId', t: 'customers', tf: 'customerId', se: 'R', te: 'L', bend: 430, c: 'N:1', dashed: 1, tdy: 8 },
    { s: 'reviews', sf: 'productId', t: 'products', tf: 'productId', se: 'R', te: 'L', bend: 490, c: 'N:1', dashed: 1, tdy: 8 },
  ],
};

fs.writeFileSync(path.join(__dirname, 'model-after.svg'), build(after));
fs.writeFileSync(path.join(__dirname, 'model-before.svg'), build(before));
console.log('wrote model-before.svg and model-after.svg');
