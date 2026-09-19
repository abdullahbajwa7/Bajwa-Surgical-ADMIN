const crypto = require('crypto');

const SECRET = process.env.ADMIN_SECRET || 'bajwa-surgical-default-secret-change-me';
const COOKIE_NAME = 'bs_admin';
const SESSION_TTL = 60 * 60 * 24 * 30;

function makeToken(username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL * 1000 })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64');
  return payload + '.' + sig;
}

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (h) h.split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > -1) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

function verifyToken(req) {
  try {
    const tok = parseCookies(req)[COOKIE_NAME];
    if (!tok) return null;
    const dot = tok.indexOf('.');
    if (dot === -1) return null;
    const payload = tok.slice(0, dot);
    const sig = tok.slice(dot + 1);
    const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('base64');
    if (sig !== expect) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (!data.u || data.exp < Date.now()) return null;
    return data.u;
  } catch { return null; }
}

function isAdmin(req) { return verifyToken(req) !== null; }

function setCookie(res, name, value, maxAge) {
  res.setHeader('Set-Cookie', name + '=' + encodeURIComponent(value) + '; HttpOnly; Path=/; Max-Age=' + maxAge + '; SameSite=Lax; Secure');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  };
}

function jsonRes(res, code, data) {
  const h = corsHeaders();
  h['Content-Type'] = 'application/json; charset=utf-8';
  res.writeHead(code, h);
  res.end(JSON.stringify(data));
}

module.exports = { makeToken, verifyToken, isAdmin, setCookie, jsonRes, corsHeaders, COOKIE_NAME, SESSION_TTL };
