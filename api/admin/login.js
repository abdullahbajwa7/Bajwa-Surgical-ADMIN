const { makeToken, setCookie, jsonRes } = require('../../lib/auth');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method !== 'POST') return jsonRes(res, 405, { error: 'Method not allowed' });

  const { username, password } = await readBody(req);
  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASS || 'bajwa123';

  if (username === validUser && password === validPass) {
    const token = makeToken(username);
    setCookie(res, 'bs_admin', token, 30 * 24 * 60 * 60);
    return jsonRes(res, 200, { ok: true, user: username });
  }
  return jsonRes(res, 401, { error: 'Wrong username or password' });
};
