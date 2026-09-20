const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

function supaRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return reject(new Error('Supabase not configured'));
    const url = new URL(SUPABASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: '/rest/v1' + path,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : undefined,
      },
    };
    if (!opts.headers.Prefer) delete opts.headers.Prefer;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Supabase timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function createOrder({ name, phone, address, items, total, note }) {
  const payload = { name, phone, address, items, total, status: 'pending' };
  if (note) payload.note = note;
  const r = await supaRequest('POST', '/orders', payload);
  if (r.status >= 200 && r.status < 300 && r.data) return r.data[0];
  throw new Error(r.data && r.data.message ? r.data.message : 'Failed to create order');
}

async function getOrders() {
  const r = await supaRequest('GET', '/orders?select=*&order=created_at.desc');
  if (r.status >= 200 && r.status < 300) return r.data || [];
  throw new Error('Failed to fetch orders');
}

async function getOrdersByPhone(phone) {
  const r = await supaRequest('GET', '/orders?select=*&phone=eq.' + encodeURIComponent(phone) + '&order=created_at.desc');
  if (r.status >= 200 && r.status < 300) return r.data || [];
  throw new Error('Failed to fetch orders');
}

async function updateOrderStatus(id, status) {
  const r = await supaRequest('PATCH', '/orders?id=eq.' + encodeURIComponent(id), { status });
  if (r.status >= 200 && r.status < 300) return true;
  throw new Error(r.data && r.data.message ? r.data.message : 'Failed to update order');
}

module.exports = { createOrder, getOrders, getOrdersByPhone, updateOrderStatus };
