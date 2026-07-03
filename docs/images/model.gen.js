// ---------------------------------------------------------------------------
// model.gen.js — generates model-before.svg and model-after.svg
// ---------------------------------------------------------------------------
// The before/after diagrams are rendered from the small model definitions at the
// bottom of this file, so they stay editable and consistent. To change a
// collection, field, or connector, edit the `before` / `after` objects and run:
//
//     node docs/images/model.gen.js
//
// (Plain Node, no dependencies.) This plays the role the sister repos' Graphviz
// `.dot` sources play — the editable source next to the rendered SVG.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

// Palette — "light neutral": white boxes, green primary keys, teal references.
const pal = { bg: '#f7f9fc', dot: '#dde5ee', box: '#ffffff', border: '#dbe3ec', header: '#eef2f7',
  headerText: '#0f172a', grip: '#94a3b8', pk: '#16a34a', fk: '#0d9488', fname: '#1f2b38', nested: '#516170',
  type: '#5b6b7b', bracket: '#94a3b8', line: '#94a3b8', shadow: '#1e293b' };

const HEADER = 38, PADTOP = 22, ROW = 25, PADBOT = 14;
const rowBaseline = (b, i) => b.y + HEADER + PADTOP + i * ROW;
const boxH = b => HEADER + PADTOP + b.fields.length * ROW + PADBOT;
const fieldIdx = (b, n) => b.fields.findIndex(f => f.n === n);

function keyIcon(x, y, c) {
  return `<g stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round">`
    + `<circle cx="${x + 3}" cy="${y}" r="3.1"/><line x1="${x + 6}" y1="${y}" x2="${x + 13}" y2="${y}"/>`
    + `<line x1="${x + 10}" y1="${y}" x2="${x + 10}" y2="${y + 3}"/><line x1="${x + 13}" y1="${y}" x2="${x + 13}" y2="${y + 3}"/></g>`;
}
function linkIcon(x, y, c) {
  return `<g stroke="${c}" stroke-width="1.6" fill="none"><circle cx="${x + 3}" cy="${y}" r="3"/><circle cx="${x + 9}" cy="${y}" r="3"/></g>`;
}

function render(model) {
  const { W, H, boxes, conns, footer } = model;
  const byId = id => boxes.find(b => b.id === id);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Helvetica, Arial, sans-serif">`;
  s += `<defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${pal.dot}"/></pattern>`;
  s += `<filter id="sh" x="-8%" y="-8%" width="116%" height="124%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="${pal.shadow}" flood-opacity="0.10"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${pal.bg}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>`;

  // connectors (under boxes). One orthogonal path: source edge -> bendX -> target row -> target edge.
  conns.forEach(c => {
    const S = byId(c.from[0]), T = byId(c.to);
    const sy = rowBaseline(S, fieldIdx(S, c.from[1])) - 4;
    const ty = rowBaseline(T, c.toField ? fieldIdx(T, c.toField) : 0) - 4;
    const sx = c.srcEdge === 'left' ? S.x : S.x + S.w;
    const tx = c.tgtEdge === 'left' ? T.x : T.x + T.w;
    const dash = c.dashed ? ` stroke-dasharray="5,4"` : '';
    s += `<path d="M${sx},${sy} H${c.bendX} V${ty} H${tx}" fill="none" stroke="${pal.line}" stroke-width="1.5"${dash}/>`;
    const tk = c.tgtEdge === 'left' ? tx - 6 : tx + 6;
    s += `<line x1="${tk}" y1="${ty - 5}" x2="${tk}" y2="${ty + 5}" stroke="${pal.line}" stroke-width="1.5"/>`;
    const sk = c.srcEdge === 'left' ? sx - 6 : sx + 6;
    s += `<line x1="${sk}" y1="${sy - 4}" x2="${sk}" y2="${sy + 4}" stroke="${pal.line}" stroke-width="1.5"/>`;
  });

  boxes.forEach(b => {
    const h = boxH(b);
    s += `<g filter="url(#sh)"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${h}" rx="10" fill="${pal.box}" stroke="${pal.border}" stroke-width="1.3"/></g>`;
    s += `<path d="M${b.x},${b.y + 12} a10,10 0 0 1 10,-10 h${b.w - 20} a10,10 0 0 1 10,10 v${HEADER - 12} h${-b.w} z" fill="${pal.header}"/>`;
    s += `<line x1="${b.x}" y1="${b.y + HEADER}" x2="${b.x + b.w}" y2="${b.y + HEADER}" stroke="${pal.border}" stroke-width="1.1"/>`;
    for (let col = 0; col < 2; col++) for (let r = 0; r < 3; r++)
      s += `<circle cx="${b.x + 14 + col * 4}" cy="${b.y + 13 + r * 6}" r="1.5" fill="${pal.grip}"/>`;
    s += `<text x="${b.x + 30}" y="${b.y + 25}" font-size="15" font-weight="700" fill="${pal.headerText}">${b.id}</text>`;
    b.fields.forEach((f, i) => {
      const base = rowBaseline(b, i), indent = f.nested ? 16 : 0, cy = base - 4;
      const iconX = b.x + 12 + indent;
      if (f.k === 'pk') s += keyIcon(iconX, cy, pal.pk);
      else if (f.k === 'fk') s += linkIcon(iconX, cy, pal.fk);
      const nameX = b.x + 34 + indent;
      const weight = f.k === 'pk' ? 600 : (f.nested ? 400 : 500);
      s += `<text x="${nameX}" y="${base}" font-size="13.5" font-weight="${weight}" fill="${f.nested ? pal.nested : pal.fname}">${f.n}</text>`;
      const isBr = f.t === '{}' || f.t === '[]';
      s += `<text x="${b.x + b.w - 16}" y="${base}" font-size="13" text-anchor="end" font-family="Consolas,monospace" fill="${isBr ? pal.bracket : pal.type}">${f.t}</text>`;
    });
  });
  if (footer) s += `<text x="44" y="${H - 16}" font-size="12.5" font-family="Consolas,monospace" fill="${pal.type}">${footer}</text>`;
  return s + `</svg>`;
}

// ============================ BEFORE — the naive port ============================
const before = {
  W: 840, H: 842,
  boxes: [
    { id: 'orders', x: 44, y: 30, w: 300, fields: [
      { n: '_id', t: '{}', k: 'pk' }, { n: 'orderId', t: 'string' }, { n: 'customerId', t: 'string', k: 'fk' },
      { n: 'orderDate', t: 'date' }, { n: 'status', t: 'string' } ] },
    { id: 'orderLines', x: 44, y: 300, w: 300, fields: [
      { n: '_id', t: '{}', k: 'pk' }, { n: 'orderId', t: 'string', k: 'fk' }, { n: 'productId', t: 'string', k: 'fk' },
      { n: 'quantity', t: 'int' }, { n: 'listPrice', t: 'double' } ] },
    { id: 'reviews', x: 44, y: 570, w: 300, fields: [
      { n: '_id', t: '{}', k: 'pk' }, { n: 'reviewId', t: 'string' }, { n: 'authorId', t: 'string', k: 'fk' },
      { n: 'productId', t: 'string', k: 'fk' }, { n: 'rating', t: 'int' }, { n: 'content', t: 'string' } ] },
    { id: 'customers', x: 480, y: 30, w: 320, fields: [
      { n: '_id', t: '{}', k: 'pk' }, { n: 'customerId', t: 'string' }, { n: 'name', t: 'string' }, { n: 'email', t: 'string' },
      { n: 'state', t: 'string' }, { n: 'wishlist', t: 'string' }, { n: 'creditCard', t: 'string' } ] },
    { id: 'products', x: 480, y: 470, w: 320, fields: [
      { n: '_id', t: '{}', k: 'pk' }, { n: 'productId', t: 'string' }, { n: 'name', t: 'string' }, { n: 'category', t: 'string' },
      { n: 'vendorName', t: 'string' }, { n: 'listPrice', t: 'double' }, { n: 'compatibleOs', t: 'string' } ] },
  ],
  conns: [
    { from: ['orders', 'customerId'], to: 'customers', srcEdge: 'right', tgtEdge: 'left', bendX: 400, dashed: true },
    { from: ['orderLines', 'orderId'], to: 'orders', srcEdge: 'left', tgtEdge: 'left', bendX: 22, dashed: true },
    { from: ['orderLines', 'productId'], to: 'products', srcEdge: 'right', tgtEdge: 'left', bendX: 420, dashed: true },
    { from: ['reviews', 'authorId'], to: 'customers', srcEdge: 'right', tgtEdge: 'left', bendX: 388, dashed: true },
    { from: ['reviews', 'productId'], to: 'products', srcEdge: 'right', tgtEdge: 'left', bendX: 436, dashed: true },
  ],
  footer: '- - - string foreign key (no real link) — every cross-collection read is a $lookup',
};

// ============================ AFTER — the document model ============================
const after = {
  W: 880, H: 850,
  boxes: [
    { id: 'orders', x: 44, y: 30, w: 300, fields: [
      { n: '_id', t: 'string', k: 'pk' }, { n: 'customerId', t: 'string', k: 'fk' }, { n: 'orderDate', t: 'date' },
      { n: 'status', t: 'string' }, { n: 'items', t: '[]' },
      { n: 'productId', t: 'string', k: 'fk', nested: true }, { n: 'name', t: 'string', nested: true },
      { n: 'quantity', t: 'int', nested: true }, { n: 'listPrice', t: 'double', nested: true } ] },
    { id: 'reviews', x: 44, y: 380, w: 300, fields: [
      { n: '_id', t: 'string', k: 'pk' }, { n: 'authorId', t: 'string', k: 'fk' }, { n: 'productId', t: 'string', k: 'fk' },
      { n: 'rating', t: 'int' }, { n: 'authorName', t: 'string' } ] },
    { id: 'customers', x: 480, y: 30, w: 320, fields: [
      { n: '_id', t: 'string', k: 'pk' }, { n: 'name', t: 'string' }, { n: 'email', t: 'string' },
      { n: 'wishlistProductIds', t: '[]', k: 'fk' }, { n: 'card', t: '{}' },
      { n: 'last4', t: 'string', nested: true }, { n: 'token', t: 'string', nested: true } ] },
    { id: 'products', x: 480, y: 320, w: 320, fields: [
      { n: '_id', t: 'string', k: 'pk' }, { n: 'name', t: 'string' }, { n: 'listPrice', t: 'double' },
      { n: 'productType', t: 'string' }, { n: 'spec', t: '{}' }, { n: 'attributes', t: '[]' },
      { n: 'categoryId', t: 'string', k: 'fk' }, { n: 'avgRating', t: 'double' } ] },
    { id: 'categories', x: 480, y: 620, w: 320, fields: [
      { n: '_id', t: 'string', k: 'pk' }, { n: 'name', t: 'string' }, { n: 'parentId', t: 'string', k: 'fk' },
      { n: 'ancestors', t: '[]' }, { n: 'path', t: 'string' } ] },
  ],
  conns: [
    { from: ['orders', 'customerId'], to: 'customers', srcEdge: 'right', tgtEdge: 'left', bendX: 400 },
    { from: ['orders', 'productId'], to: 'products', srcEdge: 'right', tgtEdge: 'left', bendX: 424 },
    { from: ['reviews', 'authorId'], to: 'customers', srcEdge: 'right', tgtEdge: 'left', bendX: 388 },
    { from: ['reviews', 'productId'], to: 'products', srcEdge: 'right', tgtEdge: 'left', bendX: 412 },
    { from: ['products', 'categoryId'], to: 'categories', srcEdge: 'right', tgtEdge: 'right', bendX: 828 },
    { from: ['categories', 'parentId'], to: 'categories', srcEdge: 'right', tgtEdge: 'right', bendX: 846 },
  ],
  footer: 'embedded items[] · solid line = id reference · categories is a tree (parentId self-ref)',
};

fs.writeFileSync(path.join(__dirname, 'model-before.svg'), render(before));
fs.writeFileSync(path.join(__dirname, 'model-after.svg'), render(after));
console.log('wrote model-before.svg and model-after.svg');
