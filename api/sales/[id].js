const { getAnalytics, saveAnalytics } = require('../../lib/store');
const { isAdmin, jsonRes } = require('../../lib/auth');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }

  if (!isAdmin(req)) return jsonRes(res, 401, { error: 'Admin login required' });

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);
    if (isNaN(id)) return jsonRes(res, 400, { error: 'Invalid ID' });
    const analytics = getAnalytics();
    const idx = analytics.sales.findIndex(x => x.id === id);
    if (idx === -1) return jsonRes(res, 404, { error: 'Sale not found' });
    analytics.sales.splice(idx, 1);
    saveAnalytics(analytics);
    return jsonRes(res, 200, { ok: true, id });
  }

  jsonRes(res, 405, { error: 'Method not allowed' });
};
