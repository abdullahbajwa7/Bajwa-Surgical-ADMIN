const fs = require('fs');
const path = require('path');
const https = require('https');

const BUNDLED_PRODUCTS = path.join(process.cwd(), 'products.json');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'abdullahbajwa7/Bajwa-Surgical-ADMIN';
const PRODUCTS_PATH = 'products.json';

let _productsCache = null;
let _productsSha = null;
let _analyticsCache = null;

function readBundled() {
  try { return JSON.parse(fs.readFileSync(BUNDLED_PRODUCTS, 'utf8')); }
  catch { return { storeName: 'BAJWA SURGICAL', currency: '\u20a8', categories: [], products: [] }; }
}

function ghRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/' + GITHUB_REPO + apiPath,
      method,
      headers: {
        'User-Agent': 'BajwaSurgical',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + GITHUB_TOKEN,
      },
    };
    if (data) { opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(data); }
    const req = https.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, data: null }); } });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('GitHub timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function loadFromGitHub() {
  if (!GITHUB_TOKEN) return null;
  try {
    const r = await ghRequest('GET', '/contents/' + PRODUCTS_PATH);
    if (r.status === 200 && r.data && r.data.content) {
      const db = JSON.parse(Buffer.from(r.data.content, 'base64').toString('utf8'));
      _productsSha = r.data.sha;
      return db;
    }
  } catch {}
  return null;
}

async function saveToGitHub(db) {
  if (!GITHUB_TOKEN) return false;
  try {
    if (!_productsSha) {
      const check = await ghRequest('GET', '/contents/' + PRODUCTS_PATH);
      if (check.status === 200 && check.data && check.data.sha) _productsSha = check.data.sha;
    }
    const content = Buffer.from(JSON.stringify(db, null, 2)).toString('base64');
    const body = { message: 'Admin: update products (' + (db.products ? db.products.length : 0) + ' items)', content, branch: 'main' };
    if (_productsSha) body.sha = _productsSha;
    const r = await ghRequest('PUT', '/contents/' + PRODUCTS_PATH, body);
    if (r.status === 200 || r.status === 201) {
      if (r.data && r.data.content && r.data.content.sha) _productsSha = r.data.content.sha;
      _productsCache = db;
      return true;
    }
  } catch {}
  return false;
}

async function getProducts() {
  if (_productsCache && _productsCache.products) return _productsCache;
  const gh = await loadFromGitHub();
  if (gh && gh.products) { _productsCache = gh; return gh; }
  const bundled = readBundled();
  _productsCache = bundled;
  return bundled;
}

function getProductsSync() {
  if (_productsCache && _productsCache.products) return _productsCache;
  const bundled = readBundled();
  _productsCache = bundled;
  return bundled;
}

async function saveProducts(db) {
  _productsCache = db;
  return await saveToGitHub(db);
}

function getAnalytics() {
  if (_analyticsCache) return _analyticsCache;
  _analyticsCache = { visitors: { total: 0, today: 0, todayDate: '', daily: {} }, sales: [], nextSaleId: 1, productViews: {}, pageViews: { total: 0, pages: {} } };
  return _analyticsCache;
}

function saveAnalytics(data) { _analyticsCache = data; }

module.exports = { getProducts, getProductsSync, saveProducts, getAnalytics, saveAnalytics };
