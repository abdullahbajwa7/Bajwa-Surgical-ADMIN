const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BUNDLED_PRODUCTS = path.join(ROOT, 'products.json');

let _productsCache = null;
let _analyticsCache = null;

function readJSON(filepath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return fallback;
  }
}

function getProducts() {
  if (_productsCache && _productsCache.products && _productsCache.products.length) return _productsCache;
  const db = readJSON(BUNDLED_PRODUCTS, { storeName: 'BAJWA SURGICAL', currency: 'Rs', categories: [], products: [] });
  if (!db.products) db.products = [];
  if (!db.categories) db.categories = [];
  _productsCache = db;
  return db;
}

function saveProducts(db) {
  _productsCache = db;
  try { fs.writeFileSync(BUNDLED_PRODUCTS, JSON.stringify(db, null, 2), 'utf8'); } catch {}
}

function getAnalytics() {
  if (_analyticsCache) return _analyticsCache;
  const fallback = { visitors: { total: 0, today: 0, todayDate: '', daily: {} }, sales: [], nextSaleId: 1, productViews: {}, pageViews: { total: 0, pages: {} } };
  _analyticsCache = fallback;
  return _analyticsCache;
}

function saveAnalytics(data) {
  _analyticsCache = data;
}

module.exports = { getProducts, saveProducts, getAnalytics, saveAnalytics };
