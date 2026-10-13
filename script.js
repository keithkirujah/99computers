/* ==========================================================================
   99 COMPUTERS — Scripts
   ========================================================================== */

/* --------------------------------------------------------------------------
   Theme + mobile menu
   -------------------------------------------------------------------------- */
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const updateLabel = () => themeToggle.setAttribute('aria-label', htmlEl.dataset.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
updateLabel();

themeToggle.addEventListener('click', (e) => {
  e.preventDefault();
  const n = htmlEl.dataset.theme === 'light' ? 'dark' : 'light';
  htmlEl.dataset.theme = n;
  try { localStorage.setItem('theme', n); } catch (err) {}
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = n === 'light' ? '#f4ead5' : '#060a0f';
  updateLabel();
});

const menuBtn = document.getElementById('menuBtn');
const drawer = document.getElementById('drawer');

function setMenu(open) {
  drawer.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

menuBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  setMenu(!drawer.classList.contains('open'));
});

drawer.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

document.addEventListener('click', (e) => {
  if (!drawer.classList.contains('open')) return;
  if (drawer.contains(e.target) || menuBtn.contains(e.target)) return;
  setMenu(false);
});

/* --------------------------------------------------------------------------
   Contact + clock
   -------------------------------------------------------------------------- */
const CONTACT = { phone: "", email: "" };
document.getElementById('yr').textContent = new Date().getFullYear();
const ct = document.getElementById('ct');
if (CONTACT.phone) ct.insertAdjacentHTML('afterbegin', `<a class="btn p" href="tel:${CONTACT.phone}">Call us</a>`);
if (CONTACT.email) ct.insertAdjacentHTML('beforeend', `<a class="btn" href="mailto:${CONTACT.email}">Email us</a>`);

const t0 = Date.now();
setInterval(() => {
  const s = Math.floor((Date.now() - t0) / 1e3), p = n => String(n).padStart(2, '0');
  const tcEl = document.getElementById('tc');
  if (tcEl) tcEl.textContent = `${p(s / 3600 | 0)}:${p(s / 60 % 60 | 0)}:${p(s % 60)}`;
}, 1000);

/* --------------------------------------------------------------------------
   Services data
   -------------------------------------------------------------------------- */
const S = [
  ["IT Consultancy", "Professional technology advice and solutions for individuals and businesses.", "#2ec4b6", "#7be0d6", "M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3zM9.5 20h5M10 22h4"],
  ["Computer Sales", "Quality laptops, desktops, and computer accessories.", "#f5a54a", "#ffd08a", "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4"],
  ["Electronics and Home Appliances", "Televisions, smartphones, washing machines, radios, and other electronic products.", "#e8613c", "#f5a54a", "M3 5h18v11H3zM8 20h8M12 16v4M17 9h.01"],
  ["CCTV Installation", "Installation and setup of surveillance cameras for homes, offices, shops, and businesses.", "#ff5a4d", "#f5a54a", "M3 8l12-3 2 5-12 3zM15 13l5 3M8 14l-1 5h6M19 7l2 1"],
  ["IT Support", "Assistance with computer setup, configuration, troubleshooting, maintenance, repair, and other technology needs.", "#2ec4b6", "#f5a54a", "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.7-.7-2.2z"],
  ["Electronics Accessories", "A variety of accessories and supporting equipment for everyday technology use.", "#f5a54a", "#2ec4b6", "M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0zM12 17v5"]
];
document.getElementById('svc').innerHTML = S.map((s, i) =>
  `<article class="glass card rv" data-tilt style="--d:${i * .08}s"><div class="ic" style="--a:${s[2]};--b:${s[3]}"><svg viewBox="0 0 24 24"><path d="${s[4]}"/></svg></div><h3>${s[0]}</h3><p>${s[1]}</p></article>`
).join('');

/* --------------------------------------------------------------------------
   Reveal + tilt
   -------------------------------------------------------------------------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) {
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}), { threshold: 0, rootMargin: '0px 0px -4% 0px' });

function tilt(el) {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', ((x - .5) * 8) + 'deg');
    el.style.setProperty('--rx', ((.5 - y) * 8) + 'deg');
    el.style.setProperty('--mx', (x * 100) + '%');
    el.style.setProperty('--my', (y * 100) + '%');
  });
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  });
}

function wire(root = document) {
  root.querySelectorAll('.rv:not([data-w])').forEach(el => { el.dataset.w = 1; io.observe(el); });
  root.querySelectorAll('[data-tilt]:not([data-t])').forEach(el => { el.dataset.t = 1; tilt(el); });
}
wire();
setTimeout(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')), 2500);

/* --------------------------------------------------------------------------
   Products — 6 cards using images 3.jpeg through 8.jpeg
   Image mapping:
     1.jpeg → storefront left   (in HTML)
     2.jpeg → storefront right  (in HTML)
     3.jpeg → laptop
     4.jpeg → desktop
     5.jpeg → television
     6.jpeg → CCTV
     7.jpeg → sound system
     8.jpeg → accessories
   -------------------------------------------------------------------------- */
const PRODUCTS = [
  { tag: "Laptops",      title: "Laptops",              caption: "Business, student, and everyday laptops from trusted brands.",       img: "images/3.jpeg", alt: "Laptop" },
  { tag: "Desktops",     title: "Desktop Computers",    caption: "Complete desktop systems, towers, and all-in-ones.",                img: "images/4.jpeg", alt: "Desktop computer" },
  { tag: "Televisions",  title: "Televisions",          caption: "Smart TVs, LED screens, and home entertainment displays.",          img: "images/5.jpeg", alt: "Television" },
  { tag: "CCTV",         title: "CCTV & Security",      caption: "Cameras, DVRs, and complete surveillance kits for any property.",   img: "images/6.jpeg", alt: "CCTV camera" },
  { tag: "Sound",        title: "Sound Systems",        caption: "Speakers, subwoofers, amplifiers, and home audio setups.",          img: "images/7.jpeg", alt: "Sound system" },
  { tag: "Accessories",  title: "Accessories",          caption: "Keyboards, mice, chargers, cables, and everyday essentials.",       img: "images/8.jpeg", alt: "Accessories" }
];

const prodEl = document.getElementById('prod');
prodEl.innerHTML = PRODUCTS.map((p, i) => `
  <figure class="prod rv" data-tilt style="--d:${i * .08}s">
    <div class="slot">
      <span class="chip">${p.tag}</span>
      <img src="${p.img}" alt="${p.alt}" loading="lazy">
    </div>
    <figcaption class="meta">
      <strong>${p.title}</strong>
      <small>${p.caption}</small>
    </figcaption>
  </figure>
`).join('');

wire(prodEl);
setTimeout(() => prodEl.querySelectorAll('.rv').forEach(e => e.classList.add('in')), 1200);

/* --------------------------------------------------------------------------
   Cinematic 3D background (Three.js)
   -------------------------------------------------------------------------- */
(function () {
  const cv = document.getElementById('bg');
  if (!window.THREE || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, .1, 100);
  cam.position.z = 10;

  sc.add(new THREE.AmbientLight(0x334455, .7));
  const l1 = new THREE.PointLight(0x2ec4b6, 2.4, 40); l1.position.set(-6, 4, 6);
  const l2 = new THREE.PointLight(0xf5a54a, 2.8, 40); l2.position.set(7, -3, 5);
  sc.add(l1, l2);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.7, .52, 220, 28, 2, 3),
    new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: .92, roughness: .28 })
  );
  const g = new THREE.Group();
  g.add(knot);
  sc.add(g);

  // Soft particle sprite
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(.4, 'rgba(255,255,255,.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);

  const N = innerWidth < 700 ? 260 : 620;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const cs = [0xf5a54a, 0x2ec4b6, 0xffe3bd].map(h => new THREE.Color(h));
  for (let i = 0; i < N; i++) {
    pos.set([(Math.random() - .5) * 34, (Math.random() - .5) * 20, -4 - Math.random() * 14], i * 3);
    const k = cs[i % 3];
    col.set([k.r, k.g, k.b], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({
    size: .55,
    map: new THREE.CanvasTexture(c),
    vertexColors: true,
    transparent: true,
    opacity: .7,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sc.add(pts);

  const pm = pts.material;
  const skin = () => {
    const L = document.documentElement.dataset.theme === 'light';
    pm.blending = L ? THREE.NormalBlending : THREE.AdditiveBlending;
    pm.opacity = L ? .35 : .7;
    pm.needsUpdate = true;
  };
  skin();
  new MutationObserver(skin).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let mx = 0, my = 0, sy = 0, wide = true;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  addEventListener('scroll', () => { sy = Math.min(1, scrollY / (innerHeight * 1.1)); }, { passive: true });

  function size() {
    r.setSize(innerWidth, innerHeight, false);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    wide = innerWidth > 860;
    g.scale.setScalar(wide ? 1 : .8);
  }
  addEventListener('resize', size);
  size();

  const clk = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const t = clk.getElapsedTime();
    knot.rotation.x = t * .16;
    knot.rotation.y = t * .22;
    g.position.x = wide ? 4.2 - sy * 5 : 0;
    g.position.y = .3 - sy * 2;
    g.rotation.y += (mx * .6 - g.rotation.y) * .04;
    g.rotation.x += (my * .4 - g.rotation.x) * .04;
    pts.position.x = Math.sin(t * .08) * .8;
    pts.position.y = sy * 3 + Math.cos(t * .1) * .4;
    cam.position.x += (mx * .9 - cam.position.x) * .03;
    cam.position.y += (-my * .7 - cam.position.y) * .03;
    cam.lookAt(0, 0, 0);
    cv.style.opacity = wide ? Math.max(.22, 1 - sy * .8) : Math.max(.18, .5 - sy * .4);
    r.render(sc, cam);
  })();
})();