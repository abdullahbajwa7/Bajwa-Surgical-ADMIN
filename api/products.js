const { getProducts, saveProducts } = require('../lib/store');
const { isAdmin, jsonRes } = require('../lib/auth');

function sanitize(input, id) {
  const num = (v, d) => (v === '' || v === null || v === undefined || isNaN(+v)) ? d : +v;
  return {
    id: id !== undefined ? +id : undefined,
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

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }

  if (req.method === 'GET') {
    return jsonRes(res, 200, getProducts());
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });
    try {
      const body = await readBody(req);
      const db = getProducts();
      const nextId = db.products.reduce((m, x) => Math.max(m, x.id), 0) + 1;
      const product = sanitize(body, nextId);
      if (!product.name) return jsonRes(res, 400, { error: 'Name is required' });
      db.products.push(product);
      saveProducts(db);
      return jsonRes(res, 201, product);
    } catch (err) { return jsonRes(res, 400, { error: err.message }); }
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
};
