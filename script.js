(function () {
  'use strict';

  var ADMIN_PANEL_URL = '/admin';
  if (window.location.hash === '#adminpanal') {
    var admHmr = document.createElement('div');
    admHmr.id = 'adminPanelHost';
    admHmr.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#fff;';
    var admFrm = document.createElement('iframe');
    admFrm.src = ADMIN_PANEL_URL;
    admFrm.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
    admHmr.appendChild(admFrm);
    document.body.appendChild(admHmr);
    document.documentElement.style.overflow = 'hidden';
    try { document.title = 'BAJWA SERJICAL \u2014 Admin Panel'; } catch (e) {}
    window.addEventListener('hashchange', function () { window.location.reload(); });
    return;
  }

  var ADMIN_API = '/api/products';
  var STORE_PHONE = '0300-9697327';
  var STORE_PHONE_RAW = '923009697327';
  var FALLBACK = {
    currency: '\u20a8',
    products: [
      { id: 1, name: 'Bliss Reuseable Urine Bag', category: 'Urine Bags', price: 2799, regularPrice: 3500, rating: 4.5, badge: '-20%', image: 'images/prod-urine-bag.jpg', desc: 'Reusable, leak-proof urine bag.', tags: ['best', 'bestseller'] },
      { id: 2, name: 'Blueidea BLD-326 Massager Gun', category: 'Massager', price: 4499, regularPrice: 5000, rating: 4.5, badge: '-10%', image: 'images/prod-massager-gun.jpg', desc: 'Deep tissue massage gun.', tags: ['best', 'bestseller'] },
      { id: 3, name: 'Sinocare iCan i3 CGM', category: 'CGM', price: 12900, priceMax: 45600, rating: 5, image: 'images/prod-cgm.png', desc: 'Continuous Glucose Monitoring.', tags: ['best', 'bestseller'] },
      { id: 4, name: 'Sinocare UG Uric Acid Monitor', category: 'Uric Acid Test Meter', price: 4999, priceMax: 5699, rating: 5, image: 'images/prod-uric-acid.webp', desc: '2-in-1 dual meter.', tags: ['best', 'bestseller'] }
    ]
  };

  var state = { currency: '\u20a8', products: [], loaded: false, hash: '', storeNameLabel: 'Bajwa Surgical' };

  try {
    fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'visitor' }), mode: 'cors' });
    fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'pageView', page: window.location.pathname + window.location.hash }), mode: 'cors' });
  } catch (e) {}

  function fmt(n) { return state.currency + ' ' + Number(n).toLocaleString('en-PK'); }
  function rangeText(p) { return p.priceMax && p.priceMax > p.price ? fmt(p.price) + ' - ' + fmt(p.priceMax) : fmt(p.price); }
  function discount(p) { return (p.regularPrice && p.regularPrice > p.price) ? Math.round((1 - p.price / p.regularPrice) * 100) + '%' : null; }
  function stars(r) { var n = Math.round(r || 0); return '\u2605'.repeat(n) + '\u2606'.repeat(Math.max(0, 5 - n)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function fetchJSON(url, ms) {
    ms = ms || 4000;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl && setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      return res.json();
    }).finally(function () { if (t) clearTimeout(t); });
  }

  function loadData() {
    return fetchJSON(ADMIN_API).catch(function () {
      return fetchJSON('products.json').catch(function () { return FALLBACK; });
    }).then(function (data) {
      var products = (data && Array.isArray(data.products) && data.products.length) ? data.products : FALLBACK.products;
      state.currency = (data && data.currency) || '\u20a8';
      state.products = products;
      state.hash = JSON.stringify(products);
      state.loaded = true;
    });
  }

  function skeleton(n, mode) {
    var out = '';
    for (var i = 0; i < n; i++) {
      if (mode === 'mini') out += '<div class="sk-mini"></div>';
      else out += '<div class="sk-card"><div class="sk-img"></div><div class="sk-line"></div><div class="sk-line short"></div></div>';
    }
    return out;
  }

  function cardHTML(p, i) {
    var off = discount(p);
    var badge = off && p.badge ? p.badge : (p.badge || (off ? '-' + off : null));
    var priceHTML = p.priceMax && p.priceMax > p.price
      ? '<span>' + rangeText(p) + '</span>'
      : '<del>' + fmt(p.regularPrice) + '</del> <span class="sale">' + fmt(p.price) + '</span>';
    var starsHTML = p.rating ? '<p class="stars">' + stars(p.rating) + '</p>' : '';
    return '<article class="product-card" data-act="quick" data-id="' + p.id + '" style="animation-delay:' + (i * 45) + 'ms">' +
      '<div class="prod-img">' +
        (badge ? '<span class="badge-sale">' + esc(badge) + '</span>' : '') +
        '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      '</div>' +
      '<button class="card-quick" data-act="quick" data-id="' + p.id + '">Quick View</button>' +
      '<div class="prod-info">' +
        '<h3>' + esc(p.name) + '</h3>' + starsHTML +
        '<p class="prices">' + priceHTML + '</p>' +
        '<div class="card-btns">' +
        '<button class="add-cart-btn" data-act="add" data-id="' + p.id + '">+ Cart</button>' +
        '<button class="buy-now-btn" data-act="buy" data-id="' + p.id + '">Buy Now</button>' +
        '</div>' +
      '</div></article>';
  }

  function miniHTML(p, i) {
    var ph = p.priceMax && p.priceMax > p.price
      ? '<span class="sale">' + rangeText(p) + '</span>'
      : (p.regularPrice ? '<del>' + fmt(p.regularPrice) + '</del> <span class="sale">' + fmt(p.price) + '</span>' : '<span class="sale">' + fmt(p.price) + '</span>');
    return '<a href="#" class="mini-prod" data-act="quick" data-id="' + p.id + '" style="animation-delay:' + (i * 40) + 'ms">' +
      '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      '<div><span>' + esc(p.name) + '</span>' + ph + '</div></a>';
  }

  function renderSections() {
    document.querySelectorAll('[data-render]').forEach(function (container) {
      var tag = container.dataset.tag;
      var items = state.products.filter(function (p) { return (p.tags || []).indexOf(tag) !== -1; });
      if (container.dataset.render === 'mini') {
        container.innerHTML = items.slice(0, 12).map(miniHTML).join('');
      } else {
        var max = container.classList.contains('cols-4') ? 8 : 10;
        container.innerHTML = items.slice(0, max).map(cardHTML).join('');
      }
      container.style.opacity = 0;
      container.style.transform = 'translateY(14px)';
      requestAnimationFrame(function () {
        container.style.transition = 'opacity .5s cubic-bezier(.22,.9,.24,1), transform .5s cubic-bezier(.22,.9,.24,1)';
        container.style.opacity = 1;
        container.style.transform = 'none';
      });
    });
  }

  /* Hero Slider */
  var slides = document.querySelectorAll('#heroSlider .slide');
  var dots = document.querySelectorAll('#heroDots .dot');
  var current = 0, timer = null;
  function goTo(i) { slides[current].classList.remove('active'); dots[current].classList.remove('active'); current = (i + slides.length) % slides.length; void slides[current].offsetWidth; slides[current].classList.add('active'); dots[current].classList.add('active'); }
  function next() { goTo(current + 1); }
  function startAuto() { stopAuto(); timer = setInterval(next, 4200); }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
  document.getElementById('heroNext').addEventListener('click', function () { next(); startAuto(); });
  document.getElementById('heroPrev').addEventListener('click', function () { goTo(current - 1); startAuto(); });
  dots.forEach(function (d) { d.addEventListener('click', function () { goTo(+d.dataset.i); startAuto(); }); });
  var hero = document.querySelector('.hero-slider');
  hero.addEventListener('mouseenter', stopAuto);
  hero.addEventListener('mouseleave', startAuto);
  startAuto();

  /* Header scroll + back to top */
  var header = document.getElementById('siteHeader');
  var toTop = document.getElementById('toTop');
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 10);
    toTop.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* Mobile nav */
  var menuToggle = document.getElementById('menuToggle');
  var mainNav = document.getElementById('mainNav');
  menuToggle.addEventListener('click', function () { mainNav.classList.toggle('open'); });
  mainNav.querySelectorAll('li > a').forEach(function (a) {
    var li = a.parentElement;
    var sub = li.querySelector('.sub');
    if (sub) a.addEventListener('click', function (e) { if (window.innerWidth <= 900) { e.preventDefault(); li.classList.toggle('open'); } });
  });

  /* ============ CART with localStorage ============ */
  var cart = {};
  var badgeEl = document.getElementById('cartBadge');
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  var cartItems = document.getElementById('cartItems');
  var cartEmpty = document.getElementById('cartEmpty');
  var cartFooter = document.getElementById('cartFooter');
  var cartSubtotal = document.getElementById('cartSubtotal');

  function saveCart() {
    try { localStorage.setItem('bajwa_cart', JSON.stringify(cart)); } catch (e) {}
  }
  function loadCart() {
    try {
      var saved = localStorage.getItem('bajwa_cart');
      if (saved) cart = JSON.parse(saved);
    } catch (e) { cart = {}; }
  }

  function cartCount() { return Object.values(cart).reduce(function (s, x) { return s + x.qty; }, 0); }
  function cartTotal() { return Object.values(cart).reduce(function (s, x) { return s + x.qty * x.price; }, 0); }

  function renderCart() {
    var count = cartCount();
    var total = cartTotal();
    badgeEl.textContent = count;
    badgeEl.hidden = count === 0;
    cartEmpty.hidden = count > 0;
    cartFooter.hidden = count === 0;
    cartItems.innerHTML = '';
    Object.keys(cart).forEach(function (id) {
      var line = cart[id];
      var li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = '<img src="' + esc(line.image) + '" alt="">' +
        '<div class="cart-item-info"><p class="p-name">' + esc(line.name) + '</p><p class="p-price">' + fmt(line.price) + '</p>' +
        '<div class="qty"><button data-id="' + id + '" data-act="minus" aria-label="Decrease">-</button><span>' + line.qty + '</span>' +
        '<button data-id="' + id + '" data-act="plus" aria-label="Increase">+</button></div></div>' +
        '<button class="cart-item-remove" data-id="' + id + '" data-act="remove" aria-label="Remove">x</button>';
      cartItems.appendChild(li);
    });
    cartSubtotal.textContent = fmt(total);
    saveCart();
  }

  function addToCart(id, buyNow) {
    var p = state.products.find(function (x) { return x.id === +id; });
    if (!p) return;
    if (cart[id]) cart[id].qty++;
    else cart[id] = { qty: 1, name: p.name, price: p.price, image: p.image };
    renderCart();
    if (!badgeEl.hidden) { badgeEl.style.transform = 'scale(1.4)'; setTimeout(function () { badgeEl.style.transform = 'scale(1)'; }, 180); }
    if (buyNow) openCart();
  }

  cartItems.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-id]');
    if (!btn) return;
    var id = btn.dataset.id;
    if (btn.dataset.act === 'plus') { cart[id].qty++; }
    else if (btn.dataset.act === 'minus') { cart[id].qty--; if (cart[id].qty <= 0) delete cart[id]; }
    else delete cart[id];
    renderCart();
  });

  function openCart() { drawer.classList.add('open'); overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add('open'); }); document.body.classList.add('no-scroll'); }
  function closeCart() { drawer.classList.remove('open'); overlay.classList.remove('open'); setTimeout(function () { if (!overlay.classList.contains('open')) overlay.hidden = true; }, 380); document.body.classList.remove('no-scroll'); }
  document.getElementById('cartToggle').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);

  /* ============ ORDER MODAL ============ */
  var orderOverlay = document.getElementById('orderModalOverlay');
  var step1 = document.getElementById('orderStep1');
  var step2 = document.getElementById('orderStep2');
  var step3 = document.getElementById('orderStep3');
  var orderDetailsForm = document.getElementById('orderDetailsForm');
  var orderReview = document.getElementById('orderReview');

  function openOrderModal() {
    if (cartCount() === 0) { toast('Your cart is empty!'); return; }
    closeCart();
    step1.hidden = false;
    step2.hidden = true;
    step3.hidden = true;
    orderOverlay.hidden = false;
    document.body.classList.add('no-scroll');
    /* Pre-fill from localStorage */
    try {
      var saved = JSON.parse(localStorage.getItem('bajwa_customer') || '{}');
      if (saved.name) document.getElementById('custName').value = saved.name;
      if (saved.phone) document.getElementById('custPhone').value = saved.phone;
      if (saved.city) document.getElementById('custCity').value = saved.city;
      if (saved.address) document.getElementById('custAddress').value = saved.address;
    } catch (e) {}
  }

  function closeOrderModal() {
    orderOverlay.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  document.getElementById('orderNowBtn').addEventListener('click', openOrderModal);
  document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
  document.getElementById('editOrderBtn').addEventListener('click', function () {
    step2.hidden = true;
    step1.hidden = false;
  });
  document.getElementById('orderDoneBtn').addEventListener('click', function () {
    closeOrderModal();
    cart = {};
    saveCart();
    renderCart();
  });
  orderOverlay.addEventListener('click', function (e) { if (e.target === orderOverlay) closeOrderModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeOrderModal(); closeCart(); closeQV(); } });

  /* Step 1: validate + go to review */
  orderDetailsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('custName').value.trim();
    var phone = document.getElementById('custPhone').value.trim();
    var city = document.getElementById('custCity').value.trim();
    var address = document.getElementById('custAddress').value.trim();
    if (!name || !phone || !city || !address) { toast('Please fill all required fields'); return; }

    /* Save to localStorage for next time */
    try {
      localStorage.setItem('bajwa_customer', JSON.stringify({ name: name, phone: phone, city: city, address: address }));
    } catch (e) {}

    /* Build review */
    var items = Object.keys(cart).map(function (id) {
      var line = cart[id];
      return { id: +id, name: line.name, price: line.price, qty: line.qty };
    });
    var total = cartTotal();
    var lines = items.map(function (it) {
      return '<div class="review-item"><span>' + esc(it.name) + ' &times; ' + it.qty + '</span><span>' + fmt(it.price * it.qty) + '</span></div>';
    }).join('');

    orderReview.innerHTML =
      '<div class="review-section"><h4>Customer Details</h4>' +
      '<p><strong>Name:</strong> ' + esc(name) + '</p>' +
      '<p><strong>Phone:</strong> ' + esc(phone) + '</p>' +
      '<p><strong>City:</strong> ' + esc(city) + '</p>' +
      '<p><strong>Address:</strong> ' + esc(address) + '</p>' +
      (document.getElementById('custNote').value.trim() ? '<p><strong>Note:</strong> ' + esc(document.getElementById('custNote').value.trim()) + '</p>' : '') +
      '</div>' +
      '<div class="review-section"><h4>Order Items</h4>' + lines +
      '<div class="review-total"><span>Total</span><span>' + fmt(total) + '</span></div></div>' +
      '<p class="review-contact">Contact: <a href="tel:' + STORE_PHONE_RAW + '">' + STORE_PHONE + '</a></p>';

    step1.hidden = true;
    step2.hidden = false;
  });

  /* Step 2: submit order */
  document.getElementById('submitOrderBtn').addEventListener('click', async function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Placing Order...';

    var items = Object.keys(cart).map(function (id) {
      return { id: +id, name: cart[id].name, price: cart[id].price, qty: cart[id].qty };
    });

    var payload = {
      name: document.getElementById('custName').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      address: document.getElementById('custCity').value.trim() + ', ' + document.getElementById('custAddress').value.trim(),
      items: items,
      total: cartTotal(),
      note: document.getElementById('custNote').value.trim()
    };

    try {
      var res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      document.getElementById('orderConfirmId').textContent = 'Order ID: ' + (data.id || '').substring(0, 8) + ' | We will call you at ' + payload.phone + ' to confirm.';
      step2.hidden = true;
      step3.hidden = false;

      /* Send WhatsApp to store owner with order details */
      var waMsg = '\uD83D\uDCF1 New Order!\n\n';
      waMsg += '\uD83D\uDC64 Customer: ' + payload.name + '\n';
      waMsg += '\uD83D\uDCDE Phone: ' + payload.phone + '\n';
      waMsg += '\uD83D\uDCCD Address: ' + payload.address + '\n\n';
      waMsg += '\uD83D\uDED2 Items:\n';
      items.forEach(function (it) { waMsg += '- ' + it.name + ' x' + it.qty + ' = ' + fmt(it.price * it.qty) + '\n'; });
      waMsg += '\n\uD83D\uDCB0 Total: ' + fmt(payload.total) + '\n';
      if (payload.note) waMsg += '\n\uD83D\uDCDD Note: ' + payload.note + '\n';

      /* Open WhatsApp in background */
      window.open('https://wa.me/' + STORE_PHONE_RAW + '?text=' + encodeURIComponent(waMsg), '_blank');

    } catch (err) {
      toast('Error: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = 'Place Order';
  });

  /* Quick View */
  var qvOverlay = document.getElementById('qvOverlay');
  var qvBody = document.getElementById('qvBody');

  function openQuickView(id) {
    var p = state.products.find(function (x) { return x.id === +id; });
    if (!p) return;
    var off = discount(p);
    var priceHTML = p.priceMax && p.priceMax > p.price
      ? '<span class="now">' + rangeText(p) + '</span>'
      : '<span class="now">' + fmt(p.price) + '</span>' + (p.regularPrice ? '<span class="old">' + fmt(p.regularPrice) + '</span>' : '') + (off ? '<span class="save">Save ' + off + '</span>' : '');
    qvBody.innerHTML = '<div class="qv-img"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '"></div>' +
      '<div class="qv-info"><span class="cat">' + esc(p.category) + '</span><h2>' + esc(p.name) + '</h2>' +
      (p.rating ? '<p class="stars">' + stars(p.rating) + ' <small style="color:var(--ink-soft)">(' + p.rating + ')</small></p>' : '') +
      '<p class="desc">' + esc(p.desc || 'Premium quality product from Bajwa Surgical.') + '</p>' +
      '<div class="qv-prices">' + priceHTML + '</div>' +
      '<div class="qv-btns"><button class="btn-green" data-act="add" data-id="' + p.id + '">+ Add to Cart</button>' +
      '<button class="buy-now-btn qv-buy" data-act="buy" data-id="' + p.id + '">Buy Now</button>' +
      '</div>' +
      '<div class="qv-tags"><span>100% Original</span><span>Money Back Guarantee</span><span>Fast Delivery</span></div></div>';
    qvOverlay.hidden = false;
    document.body.classList.add('no-scroll');
    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'productView', productId: p.id, productName: p.name }),
        mode: 'cors'
      });
    } catch (e) {}
  }
  function closeQV() { qvOverlay.hidden = true; document.body.classList.remove('no-scroll'); }
  document.getElementById('qvClose').addEventListener('click', closeQV);
  qvOverlay.addEventListener('click', function (e) { if (e.target === qvOverlay) closeQV(); });

  /* Delegated product actions */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'add') { e.preventDefault(); addToCart(t.dataset.id, false); toast('Added to cart'); }
    else if (t.dataset.act === 'buy') { e.preventDefault(); addToCart(t.dataset.id, true); toast('Added to cart'); }
    else if (t.dataset.act === 'quick') { e.preventDefault(); openQuickView(t.dataset.id); }
  });

  /* Search */
  var searchInput = document.getElementById('siteSearch');
  var searchDrop = document.getElementById('searchDrop');
  function doSearch(q) {
    q = (q || '').trim().toLowerCase();
    var list = q ? state.products.filter(function (p) { return p.name.toLowerCase().indexOf(q) !== -1; }).slice(0, 6) : [];
    if (!q || !list.length) { searchDrop.hidden = true; return; }
    searchDrop.innerHTML = list.map(function (p) {
      return '<a href="#" data-act="quick" data-id="' + p.id + '">' +
        '<img src="' + esc(p.image) + '" alt="">' +
        '<div style="flex:1;min-width:0"><p class="d-name">' + esc(p.name) + '</p></div>' +
        '<span class="d-price">' + rangeText(p) + '</span></a>';
    }).join('');
    searchDrop.hidden = false;
  }
  searchInput.addEventListener('input', function () { doSearch(searchInput.value); });
  searchInput.addEventListener('blur', function () { setTimeout(function () { searchDrop.hidden = true; }, 150); });
  searchInput.addEventListener('focus', function () { doSearch(searchInput.value); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search-wrap')) searchDrop.hidden = true; });

  /* Scroll reveal */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObs.observe(el); });

  /* Counter */
  var counterEl = document.querySelector('.counter');
  if (counterEl) {
    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        counterObs.unobserve(en.target);
        var target = +counterEl.dataset.count || 50;
        var start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / 1400);
          counterEl.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counterObs.observe(counterEl);
  }

  /* Toasts */
  var toastBox = document.getElementById('toasts');
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastBox.appendChild(el);
    setTimeout(function () { el.style.transition = 'all .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(function () { el.remove(); }, 320); }, 1800);
  }

  /* Force-clear overlays */
  function forceClearOverlays() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    overlay.hidden = true;
    qvOverlay.hidden = true;
    if (orderOverlay) orderOverlay.hidden = true;
    document.body.classList.remove('no-scroll');
  }
  forceClearOverlays();
  window.addEventListener('load', forceClearOverlays);

  /* Init + live sync */
  document.querySelectorAll('[data-render]').forEach(function (el) {
    el.innerHTML = skeleton(el.classList.contains('cols-4') ? 8 : (el.classList.contains('cols-5') ? 10 : 6), el.dataset.render);
  });

  loadCart();
  loadData().then(function () { renderSections(); renderCart(); });

  setInterval(function () {
    fetchJSON(ADMIN_API, 3000).then(function (data) {
      var h = JSON.stringify(data.products);
      if (h !== state.hash) { state.products = data.products; state.currency = data.currency || '\u20a8'; state.hash = h; renderSections(); toast('Catalog updated'); }
    }).catch(function () {});
  }, 30000);
})();
