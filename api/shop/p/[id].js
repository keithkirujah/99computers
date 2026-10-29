export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }
  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  if (typeof id !== 'string' || !/^p-[a-z0-9-]+$/i.test(id)) return res.status(400).send('Invalid product ID');
  try {
    const response = await fetch('https://raw.githubusercontent.com/keithkirujah/99computers/main/catalog.json');
    if (!response.ok) return res.status(502).send('Product catalogue temporarily unavailable');
    const catalog = await response.json();
    const product = (Array.isArray(catalog.products) ? catalog.products : []).find((item) => item && item.id === id);
    if (!product) return res.status(404).send('Product not found');
    const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
    const name = esc(product.name || 'Product');
    const desc = esc(product.desc || 'Contact 99 COMPUTERS for details.');
    const image = Array.isArray(product.images) && product.images[0] && /^\/(?!\/)/.test(product.images[0]) ? 'https://www.99computers.co.ke' + product.images[0] : 'https://www.99computers.co.ke/logo.png';
    const price = Number(product.sale ?? product.price);
    const priceText = Number.isFinite(price) ? 'KSh ' + price.toLocaleString('en-KE') : 'Contact for price';
    const canonical = 'https://www.99computers.co.ke/shop/p/' + encodeURIComponent(id);
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + name + ' | 99 COMPUTERS</title><meta name="description" content="' + desc.slice(0,300) + '"><link rel="canonical" href="' + canonical + '"><meta property="og:title" content="' + name + ' | 99 COMPUTERS"><meta property="og:image" content="' + esc(image) + '"><style>body{margin:0;background:#060a0f;color:#f5f7fb;font:16px system-ui;line-height:1.65}header,main,footer{width:min(1000px,calc(100% - 32px));margin:24px auto}a{color:inherit}main{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}img{width:100%;max-height:500px;object-fit:contain;background:#111d29;border-radius:18px}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1}.price{font-size:2rem;font-weight:800}.btn{display:inline-block;background:#24c5b7;color:#041316;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800}footer{color:#9aabba}@media(max-width:650px){main{grid-template-columns:1fr}}</style></head><body><header><a href="/">99 COMPUTERS</a> / <a href="/shop">Shop</a></header><main><img src="' + esc(image) + '" alt="' + name + '"><section><small>' + esc(product.cat || 'Products') + '</small><h1>' + name + '</h1><p>' + esc(product.brand || '') + '</p><p>' + desc + '</p><p class="price">' + esc(priceText) + '</p><a class="btn" href="https://wa.me/254794707522?text=' + encodeURIComponent('Hello 99 COMPUTERS, I am interested in ' + (product.name || id) + ' ' + canonical) + '">Enquire on WhatsApp</a></section></main><footer>99 COMPUTERS · Your Technology Partner</footer></body></html>';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send(html);
  } catch (error) {
    console.error('Product detail route failed', error);
    return res.status(500).send('Unable to load this product right now. Please try again shortly.');
  }
}
