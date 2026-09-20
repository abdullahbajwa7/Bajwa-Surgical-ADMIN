const { createOrder, getOrders, updateOrderStatus } = require('../lib/supabase');
const { isAdmin, jsonRes } = require('../lib/auth');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) { req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (req.method === 'GET') {
    try {
      const orders = await getOrders();
      return jsonRes(res, 200, orders);
    } catch (err) {
      return jsonRes(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body.name || !body.phone || !body.address) {
        return jsonRes(res, 400, { error: 'Name, phone and address are required' });
      }
      if (!body.items || !body.items.length) {
        return jsonRes(res, 400, { error: 'At least one item is required' });
      }
      const order = await createOrder({
        name: body.name,
        phone: body.phone,
        address: body.address,
        items: body.items,
        total: body.total || 0,
        note: body.note || '',
      });
      return jsonRes(res, 201, order);
    } catch (err) {
      return jsonRes(res, 500, { error: err.message });
    }
  }

  if (req.method === 'PUT') {
    if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });
    try {
      const body = await readBody(req);
      if (!body.id || !body.status) {
        return jsonRes(res, 400, { error: 'Order ID and status are required' });
      }
      await updateOrderStatus(body.id, body.status);
      return jsonRes(res, 200, { ok: true });
    } catch (err) {
      return jsonRes(res, 500, { error: err.message });
    }
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
};
