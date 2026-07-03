// ---------------------------------------------------------------------------
// embedding.gen.js — generates model-embedding.svg
// ---------------------------------------------------------------------------
// A complementary "aggregate" view of the document model that foregrounds what
// is EMBEDDED: each collection is a green document box, and embedded
// sub-documents / arrays are drawn as nested boxes (items[], card{}, spec{},
// attributes[]). Collections with no embedding (reviews, categories) are flat;
// id references stay as plain fields. Edit the `cards` list and re-render:
//
//     node docs/images/embedding.gen.js
//
// (Plain Node, no dependencies. See model.gen.js for the before/after diagrams.)
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const F = "'Segoe UI', Helvetica, Arial, sans-serif";
const SIDE = 14, TOPPAD = 10, BOTPAD = 12, HEADER = 28, LINE = 22, NESTGAP = 9, NHEADER = 26, IP = 9;
const P = { outer: '#18e074', outerBorder: '#0c8f4c', title: '#08321d', field: '#0d3a22', bullet: '#0a3a20',
  nest: '#ffffff', nestBorder: '#155c37', nestTitle: '#08321d', badge: '#0c8f4c' };

const nbHeight = nb => NHEADER + nb.fields.length * LINE + IP;
function collHeight(c) { let h = TOPPAD + HEADER + c.scalars.length * LINE; (c.nested || []).forEach(nb => h += NESTGAP + nbHeight(nb)); return h + BOTPAD; }
const bullet = (x, y, col) => `<circle cx="${x}" cy="${y - 4}" r="2.5" fill="${col}"/>`;

function agg(c) {
  const { id, x, y, w } = c, h = collHeight(c);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${P.outer}" stroke="${P.outerBorder}" stroke-width="1.5" filter="url(#sh)"/>`;
  s += `<text x="${x + SIDE}" y="${y + 30}" font-size="15.5" font-weight="800" fill="${P.title}">${id}</text>`;
  let cy = y + TOPPAD + HEADER;
  c.scalars.forEach(f => { s += bullet(x + SIDE + 10, cy + 15, P.bullet) + `<text x="${x + SIDE + 22}" y="${cy + 15}" font-size="13.5" fill="${P.field}">${f}</text>`; cy += LINE; });
  (c.nested || []).forEach(nb => {
    cy += NESTGAP; const nh = nbHeight(nb), nx = x + SIDE, nw = w - 2 * SIDE;
    s += `<rect x="${nx}" y="${cy}" width="${nw}" height="${nh}" rx="3" fill="${P.nest}" stroke="${P.nestBorder}" stroke-width="1.5"/>`;
    s += `<text x="${nx + 11}" y="${cy + 18}" font-size="13.5" font-weight="800" fill="${P.nestTitle}">${nb.name} <tspan fill="${P.badge}">${nb.kind}</tspan></text>`;
    let ny = cy + NHEADER;
    nb.fields.forEach(f => { s += bullet(nx + 26, ny + 15, P.bullet) + `<text x="${nx + 38}" y="${ny + 15}" font-size="13" fill="${P.field}">${f}</text>`; ny += LINE; });
    cy += nh;
  });
  return s;
}

const cards = [
  { id: 'customers', x: 30, y: 28, w: 250, scalars: ['_id', 'name', 'email', 'state', 'wishlistProductIds'],
    nested: [{ name: 'card', kind: '{ }', fields: ['last4', 'token'] }] },
  { id: 'reviews', x: 30, y: 305, w: 250, scalars: ['_id', 'authorId', 'productId', 'rating', 'authorName'], nested: [] },
  { id: 'orders', x: 305, y: 28, w: 255, scalars: ['_id', 'customerId', 'orderDate', 'status'],
    nested: [{ name: 'items', kind: '[ ]', fields: ['productId', 'name', 'quantity', 'listPrice'] }] },
  { id: 'categories', x: 305, y: 330, w: 255, scalars: ['_id', 'name', 'parentId', 'ancestors', 'path'], nested: [] },
  { id: 'products', x: 585, y: 28, w: 262, scalars: ['_id', 'name', 'listPrice', 'productType', 'categoryId', 'avgRating'],
    nested: [{ name: 'spec', kind: '{ }', fields: ['requiredRam'] }, { name: 'attributes', kind: '[ ]', fields: ['k', 'v'] }] },
];

const W = 877, H = 508;
const body = cards.map(agg).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${F}"><defs><filter id="sh" x="-6%" y="-6%" width="112%" height="114%"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#14532d" flood-opacity="0.22"/></filter></defs><rect width="${W}" height="${H}" fill="#ffffff"/>${body}</svg>`;
fs.writeFileSync(path.join(__dirname, 'model-embedding.svg'), svg);
console.log('wrote model-embedding.svg');
