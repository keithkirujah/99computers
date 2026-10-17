/* ==========================================================================
   99 COMPUTERS — ADMIN CONSOLE
   ========================================================================== */

(() => {

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kes = n => 'KSh ' + Number(n).toLocaleString('en-KE');
const eff = p => p.sale && p.sale < p.price ? p.sale : p.price;
const CATICON = { Laptops: 'device-laptop', Desktops: 'device-desktop', Televisions: 'device-tv', Phones: 'device-mobile', CCTV: 'device-cctv', Printers: 'printer', Sound: 'device-speaker', Appliances: 'wash-machine', Accessories: 'usb' };
const ic = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const toast = m => {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast glass'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = m; t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 3000);
};

const mem = {};
const DB = {
  get(k, d) { try { const v = localStorage.getItem('n99.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { try { localStorage.setItem('n99.' + k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
};

const root = document.documentElement;
const themeBtn = $('#themeToggle');
if (themeBtn && !themeBtn.dataset.wired) {
  themeBtn.dataset.wired = '1';
  themeBtn.addEventListener('click', () => {
    const n = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = n;
    try { localStorage.setItem('theme', n); } catch (e) {}
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = n === 'light' ? '#eaf1ff' : '#050b1a';
  });
}

function modal(html, cls = '') {
  const el = document.createElement('div'); el.className = 'modal';
  el.innerHTML = `<div class="panel glass ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(el);
  const prev = document.activeElement; let done = false, cb = null;
  const key = e => {
    if (el !== [...document.querySelectorAll('.modal')].pop()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('button,input,select,textarea,a[href]', el).filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  };
  function close() {
    if (done) return; done = true;
    el.classList.remove('on');
    setTimeout(() => el.remove(), 400);
    document.removeEventListener('keydown', key);
    if (prev && prev.focus) prev.focus();
    if (cb) cb();
  }
  document.addEventListener('keydown', key);
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) close(); });
  requestAnimationFrame(() => {
    el.classList.add('on');
    const f = $('input,select,textarea', el) || $('button', el);
    if (f) f.focus();
  });
  return { el, close, on: fn => { cb = fn; } };
}

const urlCache = {};
async function imgSrc(ref) {
  if (!ref) return '';
  if (!ref.startsWith('idb:')) return ref;
  if (urlCache[ref]) return urlCache[ref];
  try {
    const b = await new Promise((res, rej) => {
      const r = indexedDB.open('n99img', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('i');
      r.onsuccess = () => {
        const tx = r.result.transaction('i', 'readonly');
        const req = tx.objectStore('i').get(ref.slice(4));
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      };
      r.onerror = () => rej(r.error);
    });
    return b ? (urlCache[ref] = URL.createObjectURL(b)) : '';
  } catch (e) { return ''; }
}
function hydrate(rootEl) {
  $$('img[data-ref]', rootEl).forEach(async im => {
    const wrap = im.closest('.pimg,.tn,.thumbimg,.main');
    im.addEventListener('load', () => { wrap?.classList.remove('failed'); wrap?.classList.add('loaded'); }, { once: true });
    im.addEventListener('error', () => { if (im.getAttribute('src')) wrap?.classList.add('failed'); }, { once: true });
    const s = await imgSrc(im.dataset.ref);
    if (s) im.src = s;
    else wrap?.classList.add('failed');
  });
}

const OWNER = 'keithkirujah';
const REPO  = '99computers';
const BRANCH = 'main';
const CATALOG_PATH = 'catalog.json';
const IMAGES_DIR = 'images/shop';
const TOKEN_KEY = 'n99.gh.token';
const PASS_KEY  = 'n99.console.pass';
const DEFAULT_PASS = '99computers';
const BASE_CATS = ['Laptops', 'Desktops', 'Televisions', 'Phones', 'CCTV', 'Printers', 'Sound', 'Appliances', 'Accessories'];

const gh = {
  get token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } },
  set token(v) { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} },
  headers() {
    const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  },
  async call(path, opts = {}) {
    const url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + path;
    const r = await fetch(url, { ...opts, headers: { ...this.headers(), ...(opts.headers || {}) } });
    if (r.status === 401) throw Object.assign(Error('GitHub token is invalid or expired'), { status: 401 });
    if (r.status === 403) throw Object.assign(Error('GitHub token lacks permission. Check it has Contents: Read and write'), { status: 403 });
    if (r.status === 404) throw Object.assign(Error('File or repo not found'), { status: 404 });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(Error(j.message || 'GitHub request failed'), { status: r.status });
    return j;
  },
  async readFile(path) {
    try {
      const j = await this.call('/contents/' + encodeURIComponent(path) + '?ref=' + BRANCH);
      const content = decodeURIComponent(escape(atob(j.content.replace(/\n/g, ''))));
      return { sha: j.sha, content };
    } catch (e) { if (e.status === 404) return null; throw e; }
  },
  async writeFile(path, content, message, sha = null) {
    const body = { message, content: btoa(unescape(encodeURIComponent(content))), branch: BRANCH };
    if (sha) body.sha = sha;
    return this.call('/contents/' + encodeURIComponent(path), { method: 'PUT', body: JSON.stringify(body) });
  },
  async writeBinary(path, base64, message) {
    const existing = await this.readFile(path).catch(() => null);
    const body = { message, content: base64, branch: BRANCH };
    if (existing && existing.sha) body.sha = existing.sha;
    return this.call('/contents/' + encodeURIComponent(path), { method: 'PUT', body: JSON.stringify(body) });
  }
};

async function compress(file, max = 1400, q = 0.84) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function gate() {
  return new Promise(res => {
    const el = document.getElementById('gate');
    el.hidden = false;
    document.getElementById('shell').hidden = true;
    el.innerHTML = `<form class="glass card" id="pg" novalidate style="max-width:420px;width:100%;padding:36px;text-align:center">
      <span class="ico" style="--h:var(--teal);margin:0 auto 18px">${ic('lock') || '🔒'}</span>
      <h1 style="font-size:26px;margin-bottom:8px">Staff console</h1>
      <p class="sub2" style="color:var(--mute);margin-bottom:20px">Enter your admin passphrase and GitHub token to continue.</p>
      <div class="fld" style="text-align:left"><label for="p-pass">Passphrase</label><input id="p-pass" name="pass" type="password" autocomplete="current-password" required></div>
      <div class="fld" style="text-align:left"><label for="p-token">GitHub token</label><input id="p-token" name="token" type="password" placeholder="github_pat_..." autocomplete="off" required><span class="hint">Fine-grained token with Contents: Read and write on this repo. Stored on this device only.</span></div>
      <button class="btn p" type="submit" style="width:100%">Enter console</button>
    </form>`;
    const f = $('#pg', el);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      if (d.pass !== DEFAULT_PASS) { toast('Wrong passphrase'); return; }
      if (!d.token.trim().startsWith('github_pat_') && !d.token.trim().startsWith('ghp_')) { toast('That does not look like a GitHub token'); return; }
      DB.set(PASS_KEY, d.pass);
      gh.token = d.token.trim();
      res(true);
    });
  });
}

const S = { products: [], cats: [], view: 'overview' };

async function loadCatalog() {
  try {
    const file = await gh.readFile(CATALOG_PATH);
    if (file) {
      const j = JSON.parse(file.content);
      S.products = Array.isArray(j.products) ? j.products : [];
      S.cats = Array.isArray(j.categories) ? j.categories : [];
    } else { S.products = []; S.cats = []; }
  } catch (e) { toast('Could not load catalog: ' + e.message); S.products = []; S.cats = []; }
}

// --- 5 MINUTE BATCH SAVING ---
let saveTimeout = null;
let countdownInterval = null;
let timeLeft = 0;
let pendingMsg = '';

function queueSave(msg) {
  clearTimeout(saveTimeout);
  clearInterval(countdownInterval);
  pendingMsg = msg;
  timeLeft = 300; // 5 minutes
  
  let syncEl = $('#sync');
  if (!syncEl) {
    syncEl = document.createElement('span');
    syncEl.id = 'sync';
    syncEl.className = 'pill2';
    $('.top').insertBefore(syncEl, $('.top').children[1]);
  }
  syncEl.hidden = false;
  syncEl.style.background = 'var(--sig-t)';
  syncEl.style.color = '#1a0d05';
  
  const updateCountdown = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    syncEl.textContent = `Publishing in ${m}:${s.toString().padStart(2, '0')}...`;
    if (timeLeft <= 0) clearInterval(countdownInterval);
    timeLeft--;
  };
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);

  saveTimeout = setTimeout(async () => {
    clearInterval(countdownInterval);
    syncEl.textContent = 'Publishing...';
    syncEl.style.background = 'var(--gl2)';
    syncEl.style.color = 'var(--ink)';
    
    try {
      const j = { version: 1, updated: new Date().toISOString(), categories: S.cats, products: S.products };
      const file = await gh.readFile(CATALOG_PATH);
      await gh.writeFile(CATALOG_PATH, JSON.stringify(j, null, 2), pendingMsg, file ? file.sha : null);
      
      toast('Published. Live site updates in ~30s.');
      syncEl.textContent = 'Live on your website';
      setTimeout(() => { syncEl.hidden = true; }, 3000);
    } catch (e) {
      toast('Could not publish: ' + e.message);
      syncEl.hidden = true;
    }
  }, 300000); // 5 Minutes
}
// --------------------------

const kesF = n => 'KSh ' + Number(n).toLocaleString('en-KE');
const title = { overview: 'Overview', products: 'Products', settings: 'Settings' };
const view = $('#view');

function render() {
  $('#title').textContent = title[S.view] || 'Overview';
  $$('.rail [data-v]').forEach(a => a.dataset.v === S.view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  view.classList.remove('view'); void view.offsetWidth; view.classList.add('view');
  view.innerHTML = S.view === 'products' ? viewProducts() : S.view === 'settings' ? viewSettings() : viewOverview();
  hydrate(view);
}

function viewOverview() {
  const total = S.products.length;
  const low = S.products.filter(p => p.qty <= (p.min ?? 2));
  const featured = S.products.filter(p => p.featured).length;
  return `<div class="dash">
    <article class="glass card s4"><div class="hd"><h2>Products</h2></div><b style="font:700 34px var(--fd);letter-spacing:-.03em">${total}</b><p class="hint">in the shop</p></article>
    <article class="glass card s4"><div class="hd"><h2>Featured</h2></div><b style="font:700 34px var(--fd);letter-spacing:-.03em">${featured}</b><p class="hint">shown on home</p></article>
    <article class="glass card s4"><div class="hd"><h2>Low stock</h2></div><b style="font:700 34px var(--fd);letter-spacing:-.03em">${low.length}</b><p class="hint">need restocking</p></article>
    <article class="glass card s12"><div class="hd"><h2>Quick start</h2><button class="btn p sm" type="button" data-a="pnew">${ic('plus')}Add product</button></div>
      <ol class="steps">
        <li>Tap <b>Add product</b>, pick a category, fill in the details.</li>
        <li>Drop photos — they resize and upload to your GitHub repo automatically.</li>
        <li>Press Save. The console waits 5 minutes before publishing to Vercel.</li>
        <li>Your product is live at <b>99computers.co.ke</b>.</li>
      </ol>
    </article>
    ${low.length ? `<article class="glass card s12"><div class="hd"><h2>Low stock</h2></div><ul class="list">${low.map(p => `<li><div><b>${esc(p.name)}</b><small>${p.qty} left, alert at ${p.min ?? 2}</small></div><span class="st p end">Low</span></li>`).join('')}</ul></article>` : ''}
  </div>`;
}

function viewProducts() {
  return `<div class="glass card"><div class="tools">
    <label class="srch">${ic('search')}<input id="pq" type="search" placeholder="Search products" aria-label="Search products"></label>
    <select class="sel" id="pc" aria-label="Category"><option value="All">All categories</option>${[...new Set([...BASE_CATS, ...S.cats.map(c=>c.name), ...S.products.map(p => p.cat)])].map(c => `<option>${esc(c)}</option>`).join('')}</select>
    <button class="btn p sm" data-a="pnew" type="button" style="margin-left:auto">${ic('plus')}Add product</button>
  </div>
  <div class="tw"><table><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Qty</th><th></th></tr></thead><tbody id="ptb">${rows()}</tbody></table></div>
  ${S.products.length ? '' : '<div class="empty">No products yet. Tap Add product to create your first one.</div>'}
  </div>`;
}

function rows() {
  const q = ($('#pq')?.value || '').toLowerCase();
  const c = $('#pc')?.value || 'All';
  return S.products.filter(p => (c === 'All' || p.cat === c) && (!q || (p.name + p.cat + (p.brand || '')).toLowerCase().includes(q))).map(p => `
    <tr><td>${p.images && p.images[0] ? `<img class="thumbimg" src="${esc(p.images[0])}" alt="" loading="lazy" onerror="this.style.display='none'">` : `<span class="thumbimg">${ic(CATICON[p.cat] || 'package')}</span>`}</td>
      <td><b>${esc(p.name)}</b>${p.featured ? ' <span style="color:var(--sig-t)">'+ic('star')+'</span>' : ''}<small style="display:block;color:var(--mute)">${esc(p.brand || '')}</small></td>
      <td>${esc(p.cat)}</td>
      <td>${kesF(eff(p))}${p.sale ? `<small style="display:block;color:var(--sig-t)">was ${kesF(p.price)}</small>` : ''}</td>
      <td>${p.qty}</td>
      <td style="white-space:nowrap"><button class="ab" data-a="pedit" data-id="${esc(p.id)}" aria-label="Edit">${ic('pencil')}</button> <button class="ab" data-a="pdel" data-id="${esc(p.id)}" aria-label="Delete">${ic('trash')}</button></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">No products match.</td></tr>';
}

function viewSettings() {
  return `<div class="dash">
    <article class="glass card s12"><div class="hd"><h2>Restore / Import Catalog</h2></div>
      <p class="hint">If products go missing, paste a saved <code>catalog.json</code> backup here to overwrite the live data.</p>
      <div class="fld" style="margin-top:14px">
        <textarea id="restore-data" placeholder='Paste your backup JSON here...' style="height:120px;font-family:monospace;font-size:12px"></textarea>
      </div>
      <div class="btns">
        <button class="btn p" type="button" data-a="restore">Restore Catalog</button>
      </div>
    </article>
    <article class="glass card s12"><div class="hd"><h2>GitHub token</h2><span class="st a">Connected</span></div>
      <p class="hint">Your token is stored on this device only. If you need to change or revoke it, go to GitHub → Settings → Developer settings → Fine-grained tokens.</p>
      <div class="btns" style="margin-top:14px"><button class="btn" type="button" data-a="tokreset">${ic('refresh')}Replace token</button><button class="btn" type="button" data-a="passreset">${ic('refresh')}Change passphrase</button></div>
    </article>
    <article class="glass card s12"><div class="hd"><h2>Repo</h2></div>
      <p class="hint">Products are stored in <b>${OWNER}/${REPO}</b> as <code>catalog.json</code>. Photos go into <code>images/shop/</code>. Every change is a commit you can undo.</p>
      <div class="btns" style="margin-top:14px"><a class="btn" href="https://github.com/${OWNER}/${REPO}/commits/${BRANCH}" target="_blank" rel="noopener">${ic('arrow-up-right')}View commit history</a></div>
    </article>
    <article class="glass card s12"><div class="hd"><h2>Data</h2></div>
      <div class="btns"><button class="btn" type="button" data-a="export">${ic('download')}Export products</button></div>
      <p class="hint" style="margin-top:14px">Exports products and categories as a JSON file you can keep as a backup.</p>
    </article>
  </div>`;
}

function productForm(p) {
  const isNew = !p;
  p = p || { id: 'p-' + Date.now().toString(36), name: '', cat: '', brand: '', price: '', sale: '', qty: 1, min: 2, desc: '', featured: false, images: [], specs: [], created: Date.now() };
  let imgs = [...(p.images || [])];
  const specRow = (l = '', v = '') => `<div class="sprow"><input placeholder="Name, e.g. Processor" value="${esc(l)}"><input placeholder="Value, e.g. Intel Core i5" value="${esc(v)}"><button class="ab" type="button" data-p="sprm">${ic('x')}</button></div>`;
  
  const currentCats = [...new Set([...BASE_CATS, ...S.cats.map(c=>c.name)])].sort();
  const catOpts = currentCats.map(c => `<option value="${esc(c)}"${c === p.cat ? ' selected' : ''}>${esc(c)}</option>`).join('');
  
  const m = modal(`<button class="ib x-btn" data-close aria-label="Close">${ic('x')}</button><h2>${isNew ? 'Add product' : 'Edit product'}</h2>
  <form novalidate class="pform" style="margin-top:18px">
    <div><h3>Photos</h3><div class="up" id="up"><input type="file" id="pfile" accept="image/*" multiple hidden><button class="btn sm" type="button" data-p="pick">${ic('photo')}Add photos</button><p class="hint" style="margin-top:8px">Up to 6. Resized and uploaded automatically.</p><div class="tg" id="tg"></div></div></div>
    <div>
      <div class="fld"><label for="m-name">Name</label><input id="m-name" name="name" value="${esc(p.name)}"></div>
      <div class="row2"><div class="fld"><label for="m-cat">Category</label><select id="m-cat" name="cat" required><option value="" disabled${!p.cat ? ' selected' : ''}>Select category...</option>${catOpts}<option value="__new">+ Add new category...</option></select><input type="text" id="m-newcat" name="newcat" placeholder="Type new category name" style="display:none; margin-top:8px"></div><div class="fld"><label for="m-brand">Brand (optional)</label><input id="m-brand" name="brand" value="${esc(p.brand || '')}"></div></div>
      <div class="row2"><div class="fld"><label for="m-price">Price (KSh)</label><input id="m-price" name="price" type="number" min="1" value="${p.price}"></div><div class="fld"><label for="m-sale">Sale price (optional)</label><input id="m-sale" name="sale" type="number" min="1" value="${p.sale || ''}"></div></div>
      <div class="row2"><div class="fld"><label for="m-qty">Quantity in stock</label><input id="m-qty" name="qty" type="number" min="0" value="${p.qty}"></div><div class="fld"><label for="m-min">Low-stock alert at</label><input id="m-min" name="min" type="number" min="0" value="${p.min ?? 2}"></div></div>
      <div class="fld"><label for="m-desc">Description</label><textarea id="m-desc" name="desc">${esc(p.desc || '')}</textarea></div>
      <label class="chk"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}>Show on the home page as featured</label>
      <h3>Specifications</h3><div id="specs">${(p.specs || []).map(s => specRow(s[0], s[1])).join('')}</div>
      <div class="btns" style="margin:4px 0 20px"><button class="btn sm" type="button" data-p="spadd">${ic('plus')}Add specification</button></div>
      <button class="btn p" style="width:100%" type="submit">${isNew ? 'Save product' : 'Save changes'}</button>
    </div>
  </form>`, 'xl');
  
  const f = $('form', m.el), specs = $('#specs', m.el);
  
  const catSel = f.elements.cat, newCatInput = $('#m-newcat', m.el);
  catSel.addEventListener('change', () => {
    if (catSel.value === '__new') {
      newCatInput.style.display = 'block';
      newCatInput.focus();
    } else {
      newCatInput.style.display = 'none';
      newCatInput.value = '';
    }
  });
  if (p.cat === '__new' || (!p.cat && isNew)) {
    if (isNew) { catSel.value = '__new'; newCatInput.style.display = 'block'; }
  }

  const draw = () => { $('#tg', m.el).innerHTML = imgs.map((r, i) => `<div class="tn"><img src="${esc(r)}" alt=""><span class="mk">${i === 0 ? 'Main' : 'Photo ' + (i + 1)}</span><span class="tb"><button type="button" class="mini" data-p="rm" data-i="${i}">Remove</button></span></div>`).join(''); };
  draw();
  
  f.addEventListener('click', async e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const k = b.dataset.p, i = +b.dataset.i;
    if (k === 'pick') $('#pfile', m.el).click();
    else if (k === 'spadd') { specs.insertAdjacentHTML('beforeend', specRow()); specs.lastElementChild.querySelector('input').focus(); }
    else if (k === 'sprm') b.closest('.sprow').remove();
    else if (k === 'rm') { imgs.splice(i, 1); draw(); }
  });
  
  $('#pfile', m.el).addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    for (const file of files) {
      if (imgs.length >= 6) { toast('Up to 6 photos'); break; }
      try {
        toast('Compressing ' + file.name);
        const b64 = await compress(file);
        const baseName = p.id + '-' + (imgs.length + 1) + '-' + Date.now().toString(36) + '.jpg';
        const repoPath = IMAGES_DIR + '/' + baseName;
        const publicPath = '/' + repoPath;
        toast('Uploading to GitHub...');
        await gh.writeBinary(repoPath, b64, 'Add product photo: ' + file.name);
        imgs.push(publicPath);
        draw();
      } catch (err) { toast('Upload failed: ' + err.message); }
    }
    toast('Photos ready');
  });
  
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (d.name.trim().length < 2) { toast('Enter a name'); return; }
    if (!d.cat || d.cat === '__new') {
      if (!d.newcat || d.newcat.trim().length < 2) { toast('Enter a category'); return; }
      d.cat = d.newcat.trim();
      if (!S.cats.some(c => c.name.toLowerCase() === d.cat.toLowerCase())) {
        S.cats.push({ name: d.cat, specs: [] });
      }
    }
    if (!(+d.price > 0)) { toast('Enter a price above zero'); return; }
    if (d.sale && !(+d.sale > 0 && +d.sale < +d.price)) { toast('Sale must be below the price'); return; }
    const sps = $$('.sprow', specs).map(r => { const inp = $$('input', r); return [inp[0].value.trim(), inp[1].value.trim()]; }).filter(s => s[0] && s[1]);
    const np = { ...p, name: d.name.trim(), cat: d.cat, brand: d.brand.trim(), price: +d.price, sale: d.sale ? +d.sale : null, qty: Math.max(0, +d.qty || 0), min: Math.max(0, +d.min || 0), desc: d.desc.trim(), featured: !!d.featured, images: imgs, specs: sps, created: p.created || Date.now() };
    
    if (isNew) S.products.unshift(np); else S.products = S.products.map(x => x.id === p.id ? np : x);
    queueSave((isNew ? 'Add product: ' : 'Update product: ') + np.name);
    m.close();
    render();
  });
}

const A = {
  pnew() { productForm(null); },
  pedit(el) { productForm(S.products.find(x => x.id === el.dataset.id)); },
  async pdel(el) {
    const p = S.products.find(x => x.id === el.dataset.id);
    if (!p || !confirm('Delete "' + p.name + '"?')) return;
    S.products = S.products.filter(x => x.id !== p.id);
    queueSave('Delete product: ' + p.name);
    render(); 
    toast('Deleted');
  },
  async restore() {
    const raw = $('#restore-data').value.trim();
    if (!raw) { toast('Paste the backup JSON first'); return; }
    try {
      const j = JSON.parse(raw);
      if (!j.products || !Array.isArray(j.products)) throw Error('Invalid format');
      S.products = j.products;
      S.cats = j.categories || [];
      await gh.writeFile(CATALOG_PATH, JSON.stringify(j, null, 2), 'Restore catalog from backup');
      toast('Restored successfully!');
      render();
    } catch (e) {
      toast('Restore failed: ' + e.message);
    }
  },
  async tokreset() { if (confirm('Replace GitHub token? You will need to paste a new one.')) { gh.token = ''; DB.set(PASS_KEY, ''); location.reload(); } },
  async passreset() { const np = prompt('New passphrase (min 6 chars):'); if (!np || np.length < 6) return; localStorage.setItem('n99.console.pass', JSON.stringify(np)); location.reload(); },
  export() { const b = new Blob([JSON.stringify({ products: S.products, categories: S.cats }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'catalog-backup.json'; a.click(); }
};
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) A[el.dataset.a](el); });
document.addEventListener('input', e => { if (e.target.id === 'pq') $('#ptb').innerHTML = rows(); });
document.addEventListener('change', e => { if (e.target.id === 'pc') $('#ptb').innerHTML = rows(); });
addEventListener('hashchange', () => { S.view = (location.hash.slice(1) || 'overview'); render(); });

(async () => {
  const ok = await gate();
  if (!ok) return;
  document.getElementById('gate').hidden = true;
  document.getElementById('shell').hidden = false;
  S.view = location.hash.slice(1) || 'overview';
  try { await loadCatalog(); } catch (e) { toast(e.message); }
  render();
})();
})();