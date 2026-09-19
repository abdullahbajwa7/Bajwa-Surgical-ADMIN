const { verifyToken, jsonRes } = require('../../lib/auth');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  const user = verifyToken(req);
  return jsonRes(res, 200, { ok: true, user: user || null });
};
