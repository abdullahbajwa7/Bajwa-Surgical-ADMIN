const { getProductsSync, saveProducts } = require('../../lib/store');
const { isAdmin, jsonRes } = require('../../lib/auth');

function sanitize(input, id) {
  const num = (v, d) => (v === '' || v === null || v === undefined || isNaN(+v)) ? d : +v;
  return {
    id: +id,
    name: String(input.name || '').trim(),
    category: String(input.category || 'General').trim(),
    price: num(input.price, 0),
    priceMax: num(input.priceMax, null),
    regularPrice: num(input.regularPrice, null),
    rating: Math.min(5, Math.max(0, num(input.rating, null) || 0)),
    badge: input.badge ? String(input.badge).trim() : null,
    image: String(input.image || '').trim() || 'images/prod-cgm.png',
    desc: String(input.desc || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 12e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { if (!data) return resolve({}); try { resolve(JSON.parse(data)); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });
}

function getId(req) {
  if (req.query && req.query.id) return parseInt(req.query.id);
  const parts = (req.url || '').split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1]);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }); return res.end(); }

  const id = getId(req);
  if (isNaN(id)) return jsonRes(res, 400, { error: 'Invalid ID' });

  const db = getProductsSync();
  const idx = db.products.findIndex(x => x.id === id);
  if (idx === -1) return jsonRes(res, 404, { error: 'Product not found' });

  if (req.method === 'GET') {
    return jsonRes(res, 200, db.products[idx]);
  }

  if (req.method === 'PUT') {
    if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });
    try {
      const body = await readBody(req);
      const product = sanitize({ ...db.products[idx], ...body }, id);
      if (!product.name) return jsonRes(res, 400, { error: 'Name is required' });
      db.products[idx] = product;
      await saveProducts(db);
      return jsonRes(res, 200, product);
    } catch (err) { return jsonRes(res, 400, { error: err.message }); }
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });
    db.products.splice(idx, 1);
    await saveProducts(db);
    return jsonRes(res, 200, { ok: true, id });
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
};
