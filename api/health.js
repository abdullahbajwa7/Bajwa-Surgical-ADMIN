const { getProducts } = require('../lib/store');
const { jsonRes } = require('../lib/auth');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method === 'GET') {
    return jsonRes(res, 200, getProducts());
  }
  jsonRes(res, 405, { error: 'Method not allowed' });
};
