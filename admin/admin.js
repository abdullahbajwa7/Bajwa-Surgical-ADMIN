(function () {
  'use strict';

  const API = '';
  let data = { storeName: '', currency: '\u20a8', categories: [], products: [] };
  let images = [];
  let analytics = { visitors: { total: 0, today: 0, todayDate: '', daily: {} }, sales: [] };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ============================================================
     THEME
     ============================================================ */
  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const label = $('#themeLabel');
    if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
  }

  function initTheme() {
    const saved = localStorage.getItem('bs_admin_theme');
    const dark = saved === 'dark';
    applyTheme(dark);
  }

  initTheme();

  const themeBtn = $('#themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next === 'dark');
      localStorage.setItem('bs_admin_theme', next);
    });
  }

  /* ============================================================
     API HELPERS
     ============================================================ */
  async function apiFetch(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    const res = await fetch(url, opts);
    if (res.status === 401) {
      location.href = '/admin/login.html';
      throw new Error('Admin login required');
    }
    return res;
  }

  const tbody = $('#tbody');
  const emptyEl = $('#empty');
  const searchEl = $('#search');
  const filterCat = $('#filterCat');
  const filterTag = $('#filterTag');
  const resultCount = $('#resultCount');

  const fmt = (n) => {
    if (n == null || n === '' || Number.isNaN(+n)) return '\u20a8 \u2014';
    var v = Math.round(+n);
    if (!isFinite(v)) return '\u20a8 \u2014';
    return '\u20a8 ' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const fmtNum = (n) => {
    if (n == null || n === '' || Number.isNaN(+n)) return '\u2014';
    var v = Math.round(+n);
    if (!isFinite(v)) return '\u2014';
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const fmtDate = (d) => {
    const x = new Date(d);
    if (isNaN(x.getTime())) return '\u2014';
    const padd = (n) => (n < 10 ? '0' + n : '' + n);
    return padd(x.getDate()) + '/' + padd(x.getMonth() + 1) + '/' + x.getFullYear();
  };

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, 2800);
  }

  function setApiStatus(ok) {
    const el = $('#apiPulse');
    el.classList.toggle('on', ok);
    el.classList.toggle('err', !ok);
    $('#apiStatus').textContent = ok
      ? 'Connected \u00b7 ' + data.products.length + ' products'
      : 'Offline \u2014 products.json not found';
  }

  async function fetchData() {
    const res = await apiFetch(API + '/api/products');
    if (!res.ok) throw new Error('bad status');
    return res.json();
  }

  async function loadImages() {
    try {
      const res = await apiFetch(API + '/api/images');
      if (res.ok) { var d = await res.json(); images = Array.isArray(d) ? d : (d.images || []); }
    } catch (e) { images = []; }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch(API + '/api/analytics', { credentials: 'same-origin' });
      if (res.ok) analytics = await res.json();
    } catch (e) { /* keep last */ }
  }

  let retryTimer = null;

  async function load() {
    try {
      data = await fetchData();
      setApiStatus(true);
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    } catch (e) {
      setApiStatus(false);
      data = { storeName: 'BAJWA SURGICAL', currency: '\u20a8', categories: [], products: [] };
      if (e && e.message !== 'Admin login required' && !retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          loadImages().then(load).then(fetchAnalytics);
        }, 8000);
      }
    }
    renderStats();
    renderFilters();
    render();
  }

  /* ============================================================
     STATS
     ============================================================ */
  function animateCount(el, to) {
    const dur = 600, t0 = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtNum(Math.round(eased * to));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderStats() {
    const p = data.products;
    const onSale = p.filter((x) => x.regularPrice && x.regularPrice > x.price);
    const minP = p.length ? Math.min.apply(null, p.map((x) => x.price)) : 0;
    const maxP = p.length ? Math.max.apply(null, p.map((x) => x.price)) : 0;
    const stats = [
      { num: '<b data-count="' + p.length + '">0</b>', lbl: 'Total products', sub: data.categories.length + ' categories' },
      { num: '<b data-count="' + onSale.length + '">0</b><small> / ' + p.length + '</small>', lbl: 'On sale', sub: 'with discount' },
      { num: '<span data-plain>' + fmt(minP) + '</span>', lbl: 'Cheapest item', sub: 'from' },
      { num: '<span data-plain>' + fmt(maxP) + '</span>', lbl: 'Most expensive', sub: 'top price' },
    ];
    $('#stats').innerHTML = stats.map((s, i) =>
      '<div class="stat" style="animation-delay:' + (i * 70) + 'ms">' +
      '<span class="num">' + s.num + '</span><span class="lbl">' + s.lbl + '</span><span class="sub">' + s.sub + '</span></div>'
    ).join('');
    $('#stats').querySelectorAll('[data-count]').forEach((el) => animateCount(el, +el.dataset.count));
    $('#subtitle').textContent = p.length + ' products \u00b7 saved to products.json';
  }

  /* ============================================================
     FILTERS
     ============================================================ */
  function renderFilters() {
    filterCat.innerHTML = '<option value="">All categories</option>' +
      data.categories.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('')
      + data.products.map((x) => x.category).filter((c, i, a) => a.indexOf(c) === i)
        .filter((c) => data.categories.indexOf(c) === -1)
        .map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
    $('#catList').innerHTML = data.categories.map((c) => '<option value="' + esc(c) + '"></option>').join('');
  }

  /* ============================================================
     TABLE
     ============================================================ */
  function visible() {
    const q = searchEl.value.trim().toLowerCase();
    const cat = filterCat.value;
    const tag = filterTag.value;
    return data.products.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))) return false;
      if (cat && p.category !== cat) return false;
      if (tag && !(p.tags || []).includes(tag)) return false;
      return true;
    });
  }

  function render() {
    const list = visible();
    emptyEl.hidden = list.length > 0;
    resultCount.textContent = list.length + ' shown';
    tbody.innerHTML = list.map((p, i) => {
      const off = p.regularPrice && p.regularPrice > p.price
        ? Math.round((1 - p.price / p.regularPrice) * 100) + '%'
        : null;
      const tagsRow = ['best', 'bestseller', 'latest', 'recent', 'surgical'].map((t) =>
        '<span class="tag-chip ' + t + ((p.tags || []).includes(t) ? ' on' : '') + '">' + t + '</span>').join('');
      const stars = p.rating
        ? '<span class="stars">' + '\u2605'.repeat(Math.round(p.rating)).padEnd(5, '\u2606') + '</span>'
        : '<span class="stars" style="opacity:.35">\u2606\u2606\u2606\u2606\u2606</span>';
      return '<tr style="animation-delay:' + (Math.min(i, 12) * 35) + 'ms">' +
        '<td><div class="cell-prod"><img src="' + p.image + '" alt="" onerror="this.src=\'images/prod-cgm.png\'"><div><p class="p-name">' + esc(p.name) + '</p><span class="p-id">#' + p.id + (p.badge ? ' \u00b7 ' + esc(p.badge) : '') + '</span></div></div></td>' +
        '<td><span class="cat-tag">' + esc(p.category) + '</span></td>' +
        '<td><span class="price-now">' + fmt(p.price) + (p.priceMax ? ' \u2013 ' + fmt(p.priceMax) : '') + '</span></td>' +
        '<td>' + (p.regularPrice ? '<span class="price-old">' + fmt(p.regularPrice) + '</span>' : '\u2014') + '</td>' +
        '<td>' + (off ? '<span class="off-pill">-' + off + '</span>' : '<span class="off-pill zero">\u2014</span>') + '</td>' +
        '<td>' + stars + '</td>' +
        '<td><div class="tag-chips">' + tagsRow + '</div></td>' +
        '<td class="ta-r"><div class="actions">' +
        '<button class="icon-btn" data-act="edit" data-id="' + p.id + '" title="Edit">\u270E</button>' +
        '<button class="icon-btn del" data-act="del" data-id="' + p.id + '" title="Delete">\uD83D\uDDD1</button>' +
        '</div></td></tr>';
    }).join('');
  }

  searchEl.addEventListener('input', render);
  filterCat.addEventListener('change', render);
  filterTag.addEventListener('change', render);
  $('#refreshBtn').addEventListener('click', () => { load(); toast('Refreshed from server', 'ok'); });

  /* ============================================================
     TABLE ACTIONS
     ============================================================ */
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = +btn.dataset.id;
    const product = data.products.find((x) => x.id === id);
    if (!product) return;
    if (btn.dataset.act === 'edit') openModal(product);
    if (btn.dataset.act === 'del') askDelete(product);
  });

  /* ============================================================
     MODAL
     ============================================================ */
  const overlay = $('#modalOverlay');
  const form = $('#productForm');

  function openModal(product) {
    $('#modalTitle').textContent = product ? 'Edit Product #' + product.id : 'Add Product';
    $('#fId').value = product ? product.id : '';
    $('#fName').value = product ? product.name : '';
    $('#fCategory').value = product ? product.category : '';
    $('#fPrice').value = product ? product.price : '';
    $('#fPriceMax').value = product && product.priceMax ? product.priceMax : '';
    $('#fRegular').value = product && product.regularPrice ? product.regularPrice : '';
    $('#fRating').value = product && product.rating ? String(product.rating) : '';
    $('#fBadge').value = product && product.badge ? product.badge : '';
    $('#fDesc').value = product ? product.desc : '';
    fillImageSelect();
    $('#fImage').value = product ? product.image : 'images/prod-cgm.png';
    $$('.chip input').forEach((cb) => { cb.checked = product && (product.tags || []).includes(cb.value); });
    overlay.hidden = false;
    requestAnimationFrame(() => $('#fName').focus());
  }

  function fillImageSelect() {
    const sel = $('#fImageSel');
    sel.innerHTML = '<option value="__custom">Custom URL\u2026</option>' +
      images.map((im) => '<option value="' + im + '">' + im + '</option>').join('') +
      '<option value="__paste">Paste full URL</option>';
    sel.addEventListener('change', () => {
      if (sel.value === '__custom') $('#fImage').value = 'images/';
      else if (sel.value === '__paste') $('#fImage').value = 'https://';
      else $('#fImage').value = sel.value;
    });
  }

  function closeModal() { overlay.hidden = true; }

  $('#addBtn').addEventListener('click', () => openModal(null));
  $('#modalClose').addEventListener('click', closeModal);
  $('#cancelBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeDel(); closeSaleModal(); closeOfferModal(); }
  });

  /* ============================================================
     IMAGE UPLOAD
     ============================================================ */
  $('#fImageUploadBtn').addEventListener('click', () => $('#fImageUpload').click());
  $('#fImageUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8e6) { toast('File too large (max 8 MB)', 'err'); e.target.value = ''; return; }
    toast('Uploading\u2026', 'ok');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const res = await apiFetch(API + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: dataUrl }),
      });
      if (!res.ok) { const r = await res.json().catch(() => ({})); throw new Error(r.error || 'Upload failed'); }
      const result = await res.json();
      $('#fImage').value = result.path;
      if ($('#fImageSel')) $('#fImageSel').value = '__custom';
      toast('Uploaded: ' + result.filename, 'ok');
    } catch (err) {
      toast('Upload failed: ' + err.message, 'err');
    }
    e.target.value = '';
  });

  /* ============================================================
     SAVE PRODUCT
     ============================================================ */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#fId').value;
    const rating = $('#fRating').value;
    const payload = {
      name: $('#fName').value.trim(),
      category: $('#fCategory').value.trim() || 'General',
      price: +$('#fPrice').value,
      priceMax: $('#fPriceMax').value ? +$('#fPriceMax').value : null,
      regularPrice: $('#fRegular').value ? +$('#fRegular').value : null,
      rating: rating ? +rating : null,
      badge: $('#fBadge').value.trim() || null,
      image: $('#fImage').value.trim(),
      desc: $('#fDesc').value.trim(),
      tags: $$('.chip input:checked').map((c) => c.value),
    };
    if (!payload.name) { toast('Product name is required', 'err'); return; }
    if (!(payload.regularPrice && payload.regularPrice > payload.price)) payload.regularPrice = null;
    const url = API + '/api/products' + (id ? '/' + id : '');
    const method = id ? 'PUT' : 'POST';
    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const r = await res.json().catch(() => ({})); throw new Error(r.error || 'Save failed'); }
      toast(id ? 'Product #' + id + ' updated' : 'Product added', 'ok');
      closeModal();
      await load();
    } catch (err) {
      toast(err.message, 'err');
    }
  });

  /* ============================================================
     DELETE
     ============================================================ */
  let pendingDelete = null;
  const delOverlay = $('#delOverlay');
  function askDelete(p) {
    pendingDelete = p;
    $('#delText').textContent = '"' + p.name + '" will be permanently removed.';
    delOverlay.hidden = false;
  }
  function closeDel() { delOverlay.hidden = true; pendingDelete = null; }
  $('#delCancel').addEventListener('click', closeDel);
  delOverlay.addEventListener('click', (e) => { if (e.target === delOverlay) closeDel(); });
  $('#delConfirm').addEventListener('click', async () => {
    if (!pendingDelete) return;
    try {
      const res = await apiFetch(API + '/api/products/' + pendingDelete.id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast('Deleted ' + pendingDelete.name, 'ok');
      closeDel();
      await load();
    } catch (err) { toast(err.message, 'err'); }
  });

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ============================================================
     GEMINI AI DESCRIPTION
     ============================================================ */
  $('#aiDescBtn').addEventListener('click', async () => {
    const name = $('#fName').value.trim();
    const cat = $('#fCategory').value.trim();
    const currentDesc = $('#fDesc').value.trim();
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (!name) { toast('Enter product name first', 'err'); return; }
    $('#aiDescBtn').textContent = 'Generating\u2026';
    $('#aiDescBtn').disabled = true;
    try {
      const res = await apiFetch(API + '/api/gemini/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: name, category: cat, currentDesc, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      $('#fDesc').value = data.description;
      toast('AI description generated!', 'ok');
    } catch (err) {
      toast('AI Error: ' + err.message, 'err');
    }
    $('#aiDescBtn').textContent = 'Generate with AI (Gemini)';
    $('#aiDescBtn').disabled = false;
  });

  /* Gemini key is read from localStorage (set via .env on server) */

  /* ============================================================
     LOGOUT
     ============================================================ */
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try { await fetch(API + '/api/admin/logout', { method: 'POST' }); } catch(e) {}
    location.href = '/admin/login.html';
  });

  /* ============================================================
     VIEWS
     ============================================================ */
  const productsApp = $('#productsView');
  const analyticsApp = $('#analyticsView');
  const offersApp = $('#offersView');
  const ordersApp = $('#ordersView');

  function switchView(name) {
    const views = { products: productsApp, analytics: analyticsApp, offers: offersApp, orders: ordersApp };
    Object.keys(views).forEach(k => {
      if (views[k]) { views[k].style.display = k === name ? '' : 'none'; views[k].hidden = k !== name; }
    });
    if (name === 'analytics') loadAnalytics();
    if (name === 'offers') loadOffers();
    if (name === 'orders') loadOrders();
    document.body.classList.remove('view-swap');
    void document.body.offsetWidth;
    document.body.classList.add('view-swap');
  }

  $$('.nav-item[data-view]').forEach((b) => b.addEventListener('click', () => {
    $$('.nav-item').forEach((n) => n.classList.remove('active'));
    b.classList.add('active');
    switchView(b.dataset.view);
  }));

  /* ============================================================
     ANALYTICS
     ============================================================ */
  async function loadAnalytics() {
    try {
      await fetchAnalytics();
    } catch (e) { console.error('analytics load', e); }
    try { renderAnalyticsStats(); } catch (e) { console.error('renderAnalyticsStats', e); }
    try { renderSales(); } catch (e) { console.error('renderSales', e); }
  }

  function renderAnalyticsStats() {
    const v = analytics.visitors || { total: 0, today: 0 };
    const sales = analytics.sales || [];
    const revenue = sales.reduce((s, x) => s + (x.quantity || 1) * (x.price || 0), 0);
    const avg = sales.length ? Math.round(revenue / sales.length) : 0;
    const pv = analytics.pageViews || { total: 0, pages: {} };
    const prodViews = analytics.productViews || {};
    const topProducts = Object.entries(prodViews)
      .sort((a, b) => (b[1].total || 0) - (a[1].total || 0))
      .slice(0, 5);
    $('#analyticsSubtitle').textContent =
      (sales.length + ' sales \u00b7 ' + v.total + ' visitors \u00b7 ' + pv.total + ' page views').toString();
    $('#analyticsStats').innerHTML =
      '<div class="stat"><span class="num">' + v.total + '</span><span class="lbl">Total visitors</span><span class="sub">' + v.today + ' today</span></div>' +
      '<div class="stat"><span class="num">' + pv.total + '</span><span class="lbl">Page views</span><span class="sub">all pages</span></div>' +
      '<div class="stat"><span class="num">' + sales.length + '</span><span class="lbl">Total sales</span><span class="sub">recorded</span></div>' +
      '<div class="stat"><span class="num">' + fmt(revenue) + '</span><span class="lbl">Revenue</span><span class="sub">all time</span></div>' +
      '<div class="stat"><span class="num">' + fmt(avg) + '</span><span class="lbl">Avg sale</span><span class="sub">per order</span></div>' +
      '<div class="stat"><span class="num">' + Object.keys(prodViews).length + '</span><span class="lbl">Products viewed</span><span class="sub">unique items</span></div>';

    /* Product views table */
    const pvContainer = $('#productViewsBody');
    if (pvContainer) {
      if (topProducts.length) {
        pvContainer.innerHTML = topProducts.map(function (entry) {
          var id = entry[0], d = entry[1];
          return '<tr><td><span class="p-id">#' + id + '</span></td>' +
            '<td><p class="p-name">' + esc(d.name || 'Unknown') + '</p></td>' +
            '<td><b>' + (d.total || 0) + '</b> views</td>' +
            '<td>' + (Object.entries(d.daily || {}).slice(-3).map(function (e) { return e[0] + ': ' + e[1]; }).join(', ') || '\u2014') + '</td></tr>';
        }).join('');
      } else {
        pvContainer.innerHTML = '<tr><td colspan="4" class="empty">No product views yet</td></tr>';
      }
    }

    /* Page views table */
    const pageContainer = $('#pageViewsBody');
    if (pageContainer) {
      const pages = Object.entries(pv.pages || {}).sort((a, b) => b[1] - a[1]);
      if (pages.length) {
        pageContainer.innerHTML = pages.map(([page, count]) =>
          '<tr><td>' + esc(page) + '</td><td><b>' + count + '</b></td></tr>'
        ).join('');
      } else {
        pageContainer.innerHTML = '<tr><td colspan="2" class="empty">No page views yet</td></tr>';
      }
    }
  }

  function saleInRange(s, r) {
    if (!r) return true;
    const d = new Date(s.date);
    const now = new Date();
    if (r === 'today') return d.toDateString() === now.toDateString();
    if (r === 'week') { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return d >= start; }
    if (r === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  }

  function renderSales() {
    const q = $('#saleSearch').value.trim().toLowerCase();
    const f = $('#saleFilter').value;
    const list = (analytics.sales || []).filter((s) => {
      if (!saleInRange(s, f)) return false;
      if (q && !(s.productName + ' ' + (s.customer || '') + ' ' + (s.phone || '')).toLowerCase().includes(q)) return false;
      return true;
    }).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    $('#saleCount').textContent = list.length + ' sales';
    $('#saleEmpty').hidden = list.length > 0;
    $('#saleTbody').innerHTML = list.map((s) =>
      '<tr><td><span class="p-id">#' + s.id + '</span></td>' +
      '<td><p class="p-name">' + esc(s.productName) + '</p></td>' +
      '<td>' + (s.quantity || 1) + '</td>' +
      '<td><span class="price-now">' + fmt((s.quantity || 1) * (s.price || 0)) + '</span></td>' +
      '<td>' + esc(s.customer || '\u2014') + '</td>' +
      '<td>' + esc(s.phone || '\u2014') + '</td>' +
      '<td>' + fmtDate(s.date) + '</td>' +
      '<td class="ta-r"><div class="actions">' +
      '<button class="icon-btn del" data-sale-id="' + s.id + '" title="Delete">\uD83D\uDDD1</button>' +
      '</div></td></tr>'
    ).join('');
  }

  $('#saleSearch').addEventListener('input', renderSales);
  $('#saleFilter').addEventListener('change', renderSales);
  $('#refreshAnalytics').addEventListener('click', () => { loadAnalytics(); toast('Analytics refreshed', 'ok'); });

  $('#saleTbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-sale-id]');
    if (!btn) return;
    const id = +btn.dataset.saleId;
    if (!confirm('Delete sale #' + id + '?')) return;
    try {
      const res = await apiFetch(API + '/api/sales/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast('Deleted sale #' + id, 'ok');
      loadAnalytics();
    } catch (err) { toast(err.message, 'err'); }
  });

  /* ============================================================
     RECORD SALE MODAL
     ============================================================ */
  const saleOverlay = $('#saleModalOverlay');
  function openSaleModal() {
    $('#saleDate').value = new Date().toISOString().slice(0, 10);
    $('#saleForm').reset();
    $('#saleDate').value = new Date().toISOString().slice(0, 10);
    $('#saleQty').value = 1;
    $('#productList').innerHTML = data.products.map((p) => '<option value="' + esc(p.name) + '"></option>').join('');
    saleOverlay.hidden = false;
    $('#saleProductName').focus();
  }
  function closeSaleModal() { saleOverlay.hidden = true; }
  $('#addSaleBtn').addEventListener('click', openSaleModal);
  $('#saleModalClose').addEventListener('click', closeSaleModal);
  $('#saleCancelBtn').addEventListener('click', closeSaleModal);
  saleOverlay.addEventListener('click', (e) => { if (e.target === saleOverlay) closeSaleModal(); });

  $('#saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#saleProductName').value.trim();
    if (!name) { toast('Product name is required', 'err'); return; }
    const qty = +$('#saleQty').value || 1;
    const price = +$('#salePrice').value || 0;
    const payload = {
      type: 'sale',
      productName: name,
      productId: (data.products.find((p) => p.name === name) || {}).id || 0,
      quantity: qty,
      price: price,
      customer: $('#saleCustomer').value.trim(),
      phone: $('#salePhone').value.trim(),
      notes: $('#saleNotes').value.trim(),
      date: $('#saleDate').value || undefined,
    };
    try {
      const res = await apiFetch(API + '/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const r = await res.json().catch(() => ({})); throw new Error(r.error || 'Save failed'); }
      toast('Sale recorded', 'ok');
      closeSaleModal();
      loadAnalytics();
    } catch (err) {
      console.error('save sale error', err);
      toast(err && err.message ? err.message : 'Save failed', 'err');
    }
  });

  /* ============================================================
     PRINT RECEIPT
     ============================================================ */
  function printReceipt(sale) {
    var total = (sale.quantity || 1) * (sale.price || 0);
    var html = '<html><head><title>Receipt</title><style>' +
      'body{font-family:monospace;font-size:12px;padding:20px;max-width:300px;margin:0 auto}' +
      'h2{text-align:center;font-size:14px;margin:0 0 4px}' +
      '.center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}' +
      '.row{display:flex;justify-content:space-between;margin:3px 0}' +
      '.total{font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:6px;margin-top:6px}' +
      '</style></head><body>' +
      '<div class="center"><h2>BAJWA SURGICAL</h2><p style="margin:0">Sahiwal, Pakistan</p><p style="margin:0">Ph: 0300-9697327</p></div>' +
      '<div class="line"></div>' +
      '<div class="row"><span>Date:</span><span>' + fmtDate(sale.date) + '</span></div>' +
      '<div class="row"><span>Invoice #:</span><span>S-' + sale.id + '</span></div>' +
      (sale.customer ? '<div class="row"><span>Customer:</span><span>' + esc(sale.customer) + '</span></div>' : '') +
      (sale.phone ? '<div class="row"><span>Phone:</span><span>' + esc(sale.phone) + '</span></div>' : '') +
      '<div class="line"></div>' +
      '<div class="row"><b>Product</b><b>Qty x Price</b></div>' +
      '<div class="row"><span>' + esc(sale.productName) + '</span><span>' + (sale.quantity || 1) + ' x ' + fmt(sale.price || 0) + '</span></div>' +
      '<div class="line"></div>' +
      '<div class="row total"><span>TOTAL</span><span>' + fmt(total) + '</span></div>' +
      '<div class="line"></div>' +
      '<p class="center" style="margin-top:12px;font-size:10px">Thank you for shopping with us!</p>' +
      '</body></html>';
    var win = window.open('', '_blank', 'width=340,height=500');
    if (win) { win.document.write(html); win.document.close(); setTimeout(function() { win.print(); }, 500); }
    else { toast('Allow popups to print receipt', 'err'); }
  }

  /* ============================================================
     OFFERS & BANNERS
     ============================================================ */
  let offers = [];
  const OFFERS_KEY = 'bs_offers';

  function loadOffers() {
    try { offers = JSON.parse(localStorage.getItem(OFFERS_KEY) || '[]'); } catch(e) { offers = []; }
    renderOffers();
  }

  function saveOffers() {
    localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
  }

  function renderOffers() {
    var tbody2 = $('#offersTbody');
    var empty2 = $('#offersEmpty');
    if (!tbody2) return;
    empty2.hidden = offers.length > 0;
    tbody2.innerHTML = offers.sort((a,b) => (a.order||0) - (b.order||0)).map((o, i) =>
      '<tr>' +
      '<td><div style="width:120px;height:50px;border-radius:6px;background:' + esc(o.bg || '#145c3d') + ';color:' + esc(o.color || '#fff') + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;text-align:center;padding:4px">' + esc(o.title || 'Offer') + '</div></td>' +
      '<td><p class="p-name">' + esc(o.title) + '</p></td>' +
      '<td>' + esc(o.subtitle || '\u2014') + '</td>' +
      '<td>' + esc(o.cta || '\u2014') + '</td>' +
      '<td><span class="off-pill' + (o.active ? '' : ' zero') + '">' + (o.active ? 'Active' : 'Hidden') + '</span></td>' +
      '<td>' + (o.order || 0) + '</td>' +
      '<td class="ta-r"><div class="actions">' +
      '<button class="icon-btn" data-offer-edit="' + i + '" title="Edit">\u270E</button>' +
      '<button class="icon-btn del" data-offer-del="' + i + '" title="Delete">\uD83D\uDDD1</button>' +
      '</div></td></tr>'
    ).join('');
    if ($('#offersSubtitle')) $('#offersSubtitle').textContent = offers.length + ' offers \u2014 stored in localStorage';
  }

  function openOfferModal(offer, idx) {
    $('#offerModalTitle').textContent = offer ? 'Edit Offer' : 'Add Offer';
    $('#offerId').value = idx !== undefined ? idx : '';
    $('#offerTitle').value = offer ? offer.title : '';
    $('#offerSubtitle').value = offer ? offer.subtitle : '';
    $('#offerCta').value = offer ? offer.cta : 'Shop Now';
    $('#offerLink').value = offer ? offer.link : '#';
    $('#offerBg').value = offer ? offer.bg : '#145c3d';
    $('#offerColor').value = offer ? offer.color : '#ffffff';
    $('#offerOrder').value = offer ? (offer.order || 0) : 0;
    $('#offerActive').value = offer ? (offer.active ? '1' : '0') : '1';
    $('#offerCss').value = offer ? (offer.customCss || '') : '';
    $('#offerModalOverlay').hidden = false;
    $('#offerTitle').focus();
  }

  function closeOfferModal() { $('#offerModalOverlay').hidden = true; }

  if ($('#addOfferBtn')) $('#addOfferBtn').addEventListener('click', () => openOfferModal(null));
  if ($('#offerModalClose')) $('#offerModalClose').addEventListener('click', closeOfferModal);
  if ($('#offerCancelBtn')) $('#offerCancelBtn').addEventListener('click', closeOfferModal);
  if ($('#offerModalOverlay')) $('#offerModalOverlay').addEventListener('click', (e) => { if (e.target === $('#offerModalOverlay')) closeOfferModal(); });

  if ($('#offerForm')) $('#offerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    var idx = $('#offerId').value;
    var payload = {
      title: $('#offerTitle').value.trim(),
      subtitle: $('#offerSubtitle').value.trim(),
      cta: $('#offerCta').value.trim(),
      link: $('#offerLink').value.trim(),
      bg: $('#offerBg').value,
      color: $('#offerColor').value,
      order: +$('#offerOrder').value || 0,
      active: $('#offerActive').value === '1',
      customCss: $('#offerCss').value.trim(),
    };
    if (!payload.title) { toast('Title is required', 'err'); return; }
    if (idx !== '') offers[+idx] = payload; else offers.push(payload);
    saveOffers();
    toast(idx !== '' ? 'Offer updated' : 'Offer added', 'ok');
    closeOfferModal();
    renderOffers();
  });

  if ($('#offersTbody')) $('#offersTbody').addEventListener('click', (e) => {
    var editBtn = e.target.closest('[data-offer-edit]');
    var delBtn = e.target.closest('[data-offer-del]');
    if (editBtn) { openOfferModal(offers[+editBtn.dataset.offerEdit], +editBtn.dataset.offerEdit); }
    if (delBtn) {
      var i = +delBtn.dataset.offerDel;
      if (confirm('Delete "' + offers[i].title + '"?')) { offers.splice(i, 1); saveOffers(); renderOffers(); toast('Offer deleted', 'ok'); }
    }
  });

  if ($('#refreshOffers')) $('#refreshOffers').addEventListener('click', () => { loadOffers(); toast('Offers refreshed', 'ok'); });

  /* ============================================================
     SALE ROW — add print button
     ============================================================ */
  var origRenderSales = renderSales;
  renderSales = function() {
    origRenderSales();
    var saleTbody = $('#saleTbody');
    if (!saleTbody) return;
    saleTbody.querySelectorAll('tr').forEach((tr, idx) => {
      var q = $('#saleSearch').value.trim().toLowerCase();
      var f = $('#saleFilter').value;
      var filtered = (analytics.sales || []).filter((s) => {
        if (!saleInRange(s, f)) return false;
        if (q && !(s.productName + ' ' + (s.customer || '') + ' ' + (s.phone || '')).toLowerCase().includes(q)) return false;
        return true;
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
      var sale = filtered[idx];
      if (sale && tr.querySelector('.actions')) {
        var printBtn = document.createElement('button');
        printBtn.className = 'icon-btn';
        printBtn.title = 'Print receipt';
        printBtn.innerHTML = '\uD83D\uDDA8';
        printBtn.addEventListener('click', () => printReceipt(sale));
        tr.querySelector('.actions').prepend(printBtn);
      }
    });
  };

  /* ============================================================
     ORDERS
     ============================================================ */
  let ordersData = [];

  async function loadOrders() {
    try {
      const res = await apiFetch(API + '/api/orders');
      if (!res.ok) throw new Error('Failed');
      ordersData = await res.json();
      renderOrders();
    } catch (e) {
      console.error('orders load', e);
      $('#ordersEmpty').hidden = false;
      $('#ordersEmpty').textContent = 'Failed to load orders. Check Supabase connection.';
    }
  }

  function renderOrders() {
    const tbody = $('#ordersTbody');
    const empty = $('#ordersEmpty');
    const countEl = $('#orderCount');
    const search = ($('#orderSearch') || {}).value || '';
    const statusFilter = ($('#orderStatusFilter') || {}).value || '';
    const q = search.trim().toLowerCase();

    let filtered = ordersData.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (q && !(o.name + ' ' + o.phone + ' ' + o.address).toLowerCase().includes(q)) return false;
      return true;
    });

    countEl.textContent = filtered.length + ' order' + (filtered.length !== 1 ? 's' : '');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    filtered.forEach(o => {
      const tr = document.createElement('tr');
      const items = Array.isArray(o.items) ? o.items : [];
      const itemsText = items.map(i => i.name + ' x' + i.qty).join(', ');
      const date = o.created_at ? new Date(o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
      const statusClass = o.status === 'accepted' ? 'status-accepted' : o.status === 'rejected' ? 'status-rejected' : o.status === 'shipped' ? 'status-shipped' : o.status === 'delivered' ? 'status-delivered' : 'status-pending';
      tr.innerHTML = '<td><strong>' + esc(o.name) + '</strong></td>' +
        '<td>' + esc(o.phone) + '</td>' +
        '<td style="max-width:180px;font-size:12px">' + esc(o.address) + '</td>' +
        '<td style="max-width:200px;font-size:12px">' + esc(itemsText) + '</td>' +
        '<td><strong>\u20a8 ' + Number(o.total).toLocaleString('en-PK') + '</strong></td>' +
        '<td><span class="order-status ' + statusClass + '">' + esc(o.status) + '</span></td>' +
        '<td style="font-size:12px">' + date + '</td>' +
        '<td class="ta-r actions"></td>';

      const actions = tr.querySelector('.actions');
      if (o.status === 'pending') {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'icon-btn';
        acceptBtn.title = 'Accept';
        acceptBtn.style.color = '#16a34a';
        acceptBtn.textContent = '\u2714';
        acceptBtn.addEventListener('click', () => updateOrder(o.id, 'accepted'));
        actions.appendChild(acceptBtn);

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'icon-btn';
        rejectBtn.title = 'Reject';
        rejectBtn.style.color = '#dc2626';
        rejectBtn.textContent = '\u2716';
        rejectBtn.addEventListener('click', () => updateOrder(o.id, 'rejected'));
        actions.appendChild(rejectBtn);
      }
      if (o.status !== 'delivered' && o.status !== 'rejected') {
        const shipBtn = document.createElement('button');
        shipBtn.className = 'icon-btn';
        shipBtn.title = 'Mark shipped';
        shipBtn.style.color = '#2563eb';
        shipBtn.textContent = '\uD83D\uDCE6';
        shipBtn.addEventListener('click', () => updateOrder(o.id, 'shipped'));
        actions.appendChild(shipBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.title = 'Mark delivered';
        delBtn.style.color = '#16a34a';
        delBtn.textContent = '\u2714\uFE0F';
        delBtn.addEventListener('click', () => updateOrder(o.id, 'delivered'));
        actions.appendChild(delBtn);
      }
      tbody.appendChild(tr);
    });

    renderOrdersStats();
  }

  function renderOrdersStats() {
    const el = $('#ordersStats');
    if (!el) return;
    const total = ordersData.length;
    const pending = ordersData.filter(o => o.status === 'pending').length;
    const accepted = ordersData.filter(o => o.status === 'accepted').length;
    const shipped = ordersData.filter(o => o.status === 'shipped').length;
    const delivered = ordersData.filter(o => o.status === 'delivered').length;
    const revenue = ordersData.filter(o => o.status !== 'rejected').reduce((s, o) => s + Number(o.total || 0), 0);
    el.innerHTML = '<div class="stat-card"><span class="stat-val">' + total + '</span><span class="stat-lbl">Total</span></div>' +
      '<div class="stat-card"><span class="stat-val">' + pending + '</span><span class="stat-lbl">Pending</span></div>' +
      '<div class="stat-card"><span class="stat-val">' + accepted + '</span><span class="stat-lbl">Accepted</span></div>' +
      '<div class="stat-card"><span class="stat-val">' + shipped + '</span><span class="stat-lbl">Shipped</span></div>' +
      '<div class="stat-card"><span class="stat-val">' + delivered + '</span><span class="stat-lbl">Delivered</span></div>' +
      '<div class="stat-card"><span class="stat-val">\u20a8 ' + revenue.toLocaleString('en-PK') + '</span><span class="stat-lbl">Revenue</span></div>';
  }

  async function updateOrder(id, status) {
    try {
      const res = await apiFetch(API + '/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error('Failed');
      toast('Order ' + status, 'ok');
      loadOrders();
    } catch (e) {
      toast('Failed to update order', 'err');
    }
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  if ($('#refreshOrders')) $('#refreshOrders').addEventListener('click', loadOrders);
  if ($('#orderSearch')) $('#orderSearch').addEventListener('input', renderOrders);
  if ($('#orderStatusFilter')) $('#orderStatusFilter').addEventListener('change', renderOrders);

  /* ============================================================
     INIT
     ============================================================ */
  loadImages().then(load).then(fetchAnalytics);
  loadOffers();
})();
