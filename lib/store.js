const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp';
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const BUNDLED_PRODUCTS = path.join(process.cwd(), 'products.json');

function readJSON(filepath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

function getProducts() {
  let db = readJSON(PRODUCTS_FILE, null);
  if (!db || !db.products) {
    db = readJSON(BUNDLED_PRODUCTS, { storeName: 'BAJWA SURGICAL', currency: '\u20a8', categories: [], products: [] });
    if (!db.products) db.products = [];
    if (!db.categories) db.categories = [];
    writeJSON(PRODUCTS_FILE, db);
  }
  return db;
}

function saveProducts(db) {
  writeJSON(PRODUCTS_FILE, db);
}

function getAnalytics() {
  const fallback = { visitors: { total: 0, today: 0, todayDate: '', daily: {} }, sales: [], nextSaleId: 1, productViews: {}, pageViews: { total: 0, pages: {} } };
  return readJSON(ANALYTICS_FILE, fallback);
}

function saveAnalytics(data) {
  writeJSON(ANALYTICS_FILE, data);
}

module.exports = { getProducts, saveProducts, getAnalytics, saveAnalytics };
