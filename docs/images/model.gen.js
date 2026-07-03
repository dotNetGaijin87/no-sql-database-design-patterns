// ---------------------------------------------------------------------------
// model.gen.js — generates model-before.svg and model-after.svg
// ---------------------------------------------------------------------------
// Each collection is drawn as an "aggregate": a green document box whose
// embedded sub-documents / arrays are nested white boxes (items[], card{},
// spec{}, attributes[]). References between collections are drawn as connector
// lines with a cardinality label (N:1 / N:N / tree).
//   before : the naive port — flat boxes (no embedding), a separate orderLines
//            collection, string foreign keys (amber dots), ObjectId _ids.
//   after  : the document model — embedded sub-docs (nested boxes), natural
//            _ids, real references (blue dots). N:N where a ref is array-valued.
//
// Edit the `before` / `after` definitions below and re-render (plain Node):
//     node docs/images/model.gen.js
// (The editable source next to the SVG, like the sister repos' Graphviz .dot.)
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const F = "'Segoe UI', Helvetica, Arial, sans-serif";
const SIDE = 14, TOPPAD = 10, BOTPAD = 12, HEADER = 28, LINE = 22, NESTGAP = 9, NHEADER = 26, IP = 9;
const LN = '#94a3b8', REF = '#2563eb', FK = '#b45309';
const G = { outer: '#18e074', outerBorder: '#0c8f4c', title: '#08321d', field: '#0d3a22', bullet: '#0a3a20',
  nest: '#ffffff', nestBorder: '#155c37', nestTitle: '#08321d', badge: '#0c8f4c' };

const fname = f => (typeof f === 'string' ? f : f.n);
const nbHeight = nb => NHEADER + nb.fields.length * LINE + IP;
function collHeight(c) { let h = TOPPAD + HEADER + c.scalars.length * LINE; (c.nested || []).forEach(nb => h += NESTGAP + nbHeight(nb)); return h + BOTPAD; }
const bullet = (x, y, col) => `<circle cx="${x}" cy="${y - 4}" r="2.5" fill="${col}"/>`;

// baseline Y of a field: a scalar name, or "nestedBox.field"
function fieldBaseY(c, pth) {
  const cy0 = c.y + TOPPAD + HEADER, dot = pth.indexOf('.');
  if (dot < 0) { const i = c.scalars.findIndex(f => fname(f) === pth); return cy0 + i * LINE + 15; }
  const nbName = pth.slice(0, dot), fName = pth.slice(dot + 1);
  let cy = cy0 + c.scalars.length * LINE;
  for (const nb of (c.nested || [])) { cy += NESTGAP; if (nb.name === nbName) { const j = nb.fields.findIndex(f => fname(f) === fName); return cy + NHEADER + j * LINE + 15; } cy += nbHeight(nb); }
  return cy0;
}

function aggBox(c) {
  const h = collHeight(c);
  let s = `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${h}" rx="4" fill="${G.outer}" stroke="${G.outerBorder}" stroke-width="1.5" filter="url(#sh)"/>`;
  s += `<text x="${c.x + SIDE}" y="${c.y + 30}" font-size="15.5" font-weight="800" fill="${G.title}">${c.id}</text>`;
  let cy = c.y + TOPPAD + HEADER;
  c.scalars.forEach(f => { s += bullet(c.x + SIDE + 10, cy + 15, G.bullet) + `<text x="${c.x + SIDE + 22}" y="${cy + 15}" font-size="13.5" fill="${G.field}">${fname(f)}</text>`; cy += LINE; });
  (c.nested || []).forEach(nb => {
    cy += NESTGAP; const nh = nbHeight(nb), nx = c.x + SIDE, nw = c.w - 2 * SIDE;
    s += `<rect x="${nx}" y="${cy}" width="${nw}" height="${nh}" rx="3" fill="${G.nest}" stroke="${G.nestBorder}" stroke-width="1.5"/>`;
    s += `<text x="${nx + 11}" y="${cy + 18}" font-size="13.5" font-weight="800" fill="${G.nestTitle}">${nb.name} <tspan fill="${G.badge}">${nb.kind}</tspan></text>`;
    let ny = cy + NHEADER; nb.fields.forEach(f => { s += bullet(nx + 26, ny + 15, G.bullet) + `<text x="${nx + 38}" y="${ny + 15}" font-size="13" fill="${G.field}">${fname(f)}</text>`; ny += LINE; }); cy += nh;
  });
  return s;
}

function build(spec) {
  const { W, H, cards, conns } = spec, byId = id => cards.find(c => c.id === id);
  function conn(c) {
    const S = byId(c.s), T = byId(c.t);
    const sy = fieldBaseY(S, c.sf) - 4, ty = fieldBaseY(T, c.tf || '_id') - 4 + (c.tdy || 0);
    const sx = c.se === 'R' ? S.x + S.w : S.x, tx = c.te === 'R' ? T.x + T.w : T.x;
    const outS = Math.sign(c.bend - sx) || 1, adir = Math.sign(tx - c.bend) || 1;
    let s = `<circle cx="${sx}" cy="${sy}" r="3.2" fill="${c.fk ? FK : REF}"/>`;
    s += `<path d="M${sx},${sy} H${c.bend} V${ty} H${tx}" fill="none" stroke="${LN}" stroke-width="1.5"/>`;
    s += `<path d="M${tx},${ty} l${-9 * adir},-4.5 l0,9 z" fill="${LN}"/>`;
    if (c.c) {
      // normal: beside the source field, above the line. self-loop / side-routed: beside the bend.
      const lx = c.self ? c.bend + 22 : (c.midlabel ? c.bend + (outS >= 0 ? 22 : -22) : sx + outS * 40);
      const ly = (c.self || c.midlabel) ? (sy + ty) / 2 : sy - 14;
      s += `<rect x="${lx - 20}" y="${ly - 10}" width="40" height="19" rx="9" fill="#fff" stroke="#cbd5e1" stroke-width="1"/>`;
      s += `<text x="${lx}" y="${ly + 3.5}" font-size="11" font-weight="700" text-anchor="middle" fill="#475569" font-family="${F}">${c.c}</text>`; }
    return s;
  }
  const TOP = 22;
  let b = ''; conns.forEach(c => b += conn(c)); cards.forEach(c => b += aggBox(c));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${TOP} ${W} ${H - TOP}" font-family="${F}"><defs><filter id="sh" x="-6%" y="-6%" width="112%" height="115%"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#14532d" flood-opacity="0.20"/></filter></defs><rect x="0" y="${TOP}" width="${W}" height="${H - TOP}" fill="#ffffff"/>${b}</svg>`;
}

// ============================ AFTER — the document model ============================
const after = {
  W: 1085, H: 690,
  cards: [
    { id: 'orders', x: 40, y: 40, w: 255, scalars: ['_id', 'customerId', 'orderDate', 'status'],
      nested: [{ name: 'items', kind: '[ ]', fields: ['productId', 'name', 'quantity', 'listPrice'] }] },
    { id: 'reviews', x: 40, y: 345, w: 255, scalars: ['_id', 'authorId', 'productId', 'rating', 'authorName'], nested: [] },
    { id: 'customers', x: 390, y: 40, w: 250, scalars: ['_id', 'name', 'email', 'wishlistProductIds'],
      nested: [{ name: 'card', kind: '{ }', fields: ['last4', 'token'] }] },
    { id: 'products', x: 390, y: 320, w: 262, scalars: ['_id', 'name', 'listPrice', 'productType', 'categoryId', 'avgRating'],
      nested: [{ name: 'spec', kind: '{ }', fields: ['requiredRam'] }, { name: 'attributes', kind: '[ ]', fields: ['k', 'v'] }] },
    { id: 'categories', x: 730, y: 400, w: 255, scalars: ['_id', 'name', 'parentId', 'ancestors', 'path'], nested: [] },
  ],
  conns: [
    { s: 'orders', sf: 'customerId', t: 'customers', se: 'R', te: 'L', bend: 330, c: 'N:1', tdy: -8 },
    { s: 'orders', sf: 'items.productId', t: 'products', se: 'R', te: 'L', bend: 362, c: 'N:N', tdy: -8 },
    { s: 'reviews', sf: 'authorId', t: 'customers', se: 'R', te: 'L', bend: 372, c: 'N:1', tdy: 8 },
    { s: 'reviews', sf: 'productId', t: 'products', se: 'R', te: 'L', bend: 346, c: 'N:1', tdy: 8 },
    { s: 'products', sf: 'categoryId', t: 'categories', se: 'R', te: 'L', bend: 692, c: 'N:1' },
    { s: 'customers', sf: 'wishlistProductIds', t: 'products', se: 'R', te: 'R', bend: 682, c: 'N:N' },
    { s: 'categories', sf: 'parentId', t: 'categories', se: 'R', te: 'R', bend: 1018, c: 'tree', self: 1 },
  ],
};

// ============================ BEFORE — the naive port ============================
const before = {
  W: 880, H: 620,
  cards: [
    { id: 'orders', x: 64, y: 40, w: 250, scalars: ['_id', 'orderId', 'customerId', 'orderDate', 'status'], nested: [] },
    { id: 'orderLines', x: 64, y: 225, w: 250, scalars: ['_id', 'orderId', 'productId', 'quantity', 'listPrice'], nested: [] },
    { id: 'reviews', x: 64, y: 410, w: 250, scalars: ['_id', 'reviewId', 'authorId', 'productId', 'rating', 'content'], nested: [] },
    { id: 'customers', x: 584, y: 40, w: 255, scalars: ['_id', 'customerId', 'name', 'email', 'state', 'wishlist', 'creditCard'], nested: [] },
    { id: 'products', x: 584, y: 310, w: 255, scalars: ['_id', 'productId', 'name', 'category', 'vendorName', 'listPrice', 'compatibleOs'], nested: [] },
  ],
  conns: [
    { s: 'orders', sf: 'customerId', t: 'customers', tf: 'customerId', se: 'R', te: 'L', bend: 462, c: 'N:1', fk: 1, tdy: -8 },
    { s: 'orderLines', sf: 'orderId', t: 'orders', tf: 'orderId', se: 'L', te: 'L', bend: 44, c: 'N:1', fk: 1, midlabel: 1 },
    { s: 'orderLines', sf: 'productId', t: 'products', tf: 'productId', se: 'R', te: 'L', bend: 492, c: 'N:1', fk: 1, tdy: -8 },
    { s: 'reviews', sf: 'authorId', t: 'customers', tf: 'customerId', se: 'R', te: 'L', bend: 442, c: 'N:1', fk: 1, tdy: 8 },
    { s: 'reviews', sf: 'productId', t: 'products', tf: 'productId', se: 'R', te: 'L', bend: 512, c: 'N:1', fk: 1, tdy: 8 },
  ],
};

fs.writeFileSync(path.join(__dirname, 'model-after.svg'), build(after));
fs.writeFileSync(path.join(__dirname, 'model-before.svg'), build(before));
console.log('wrote model-before.svg and model-after.svg');
