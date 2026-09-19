const { getAnalytics, saveAnalytics } = require('../lib/store');
const { isAdmin, jsonRes } = require('../lib/auth');

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
    if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });
    return jsonRes(res, 200, getAnalytics());
  }

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const analytics = getAnalytics();
      const today = new Date().toISOString().slice(0, 10);

      if (body.type === 'visitor') {
        if (analytics.visitors.todayDate !== today) { analytics.visitors.today = 0; analytics.visitors.todayDate = today; }
        analytics.visitors.total = (analytics.visitors.total || 0) + 1;
        analytics.visitors.today = (analytics.visitors.today || 0) + 1;
        analytics.visitors.daily[today] = (analytics.visitors.daily[today] || 0) + 1;
        saveAnalytics(analytics);
        return jsonRes(res, 200, { ok: true, visitors: analytics.visitors });
      }

      if (body.type === 'productView') {
        const pid = String(body.productId || '');
        if (!analytics.productViews[pid]) analytics.productViews[pid] = { name: '', total: 0, daily: {} };
        analytics.productViews[pid].total = (analytics.productViews[pid].total || 0) + 1;
        analytics.productViews[pid].daily[today] = (analytics.productViews[pid].daily[today] || 0) + 1;
        if (body.productName) analytics.productViews[pid].name = body.productName;
        saveAnalytics(analytics);
        return jsonRes(res, 200, { ok: true });
      }

      if (body.type === 'pageView') {
        const page = String(body.page || '/').trim();
        analytics.pageViews.total = (analytics.pageViews.total || 0) + 1;
        analytics.pageViews.pages[page] = (analytics.pageViews.pages[page] || 0) + 1;
        saveAnalytics(analytics);
        return jsonRes(res, 200, { ok: true });
      }

      if (body.type === 'sale') {
        if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });
        const sale = {
          id: analytics.nextSaleId || 1,
          productId: +body.productId || 0,
          productName: String(body.productName || '').trim(),
          quantity: +body.quantity || 1,
          price: +body.price || 0,
          customer: String(body.customer || '').trim(),
          phone: String(body.phone || '').trim(),
          notes: String(body.notes || '').trim(),
          date: body.date || new Date().toISOString(),
        };
        if (!sale.productName) return jsonRes(res, 400, { error: 'Product name required' });
        analytics.sales.push(sale);
        analytics.nextSaleId = sale.id + 1;
        saveAnalytics(analytics);
        return jsonRes(res, 201, sale);
      }

      return jsonRes(res, 400, { error: 'Invalid type' });
    } catch (err) { return jsonRes(res, 400, { error: err.message }); }
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
};
