const { setCookie, jsonRes } = require('../../lib/auth');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method !== 'POST' && req.method !== 'GET') return jsonRes(res, 405, { error: 'Method not allowed' });
  setCookie(res, 'bs_admin', '', 0);
  return jsonRes(res, 200, { ok: true });
};
