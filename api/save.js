import { requireAuth } from './_lib/auth.js';

const OWNER  = 'keithkirujah';
const REPO   = '99computers';
const BRANCH = 'main';

// Strict allowlist of paths that can be written to
const ALLOWED_PATHS = [
  'catalog.json',
  'data/log.json'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Require any valid session (admin, site, or staff can save products)
  const auth = requireAuth(req, ['admin', 'site', 'staff']);
  if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server token missing' });

  const { path, content, message, binary } = req.body || {};
  if (!path || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing "path" or "content"' });
  }

  // 2. STRICT PATH VALIDATION
  // Block traversal attacks
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    return res.status(403).json({ error: 'Path traversal forbidden' });
  }
  
  // Check if the path is either explicitly allowed OR is a valid image in images/shop/
  const isAllowedFile = ALLOWED_PATHS.includes(path);
  const isAllowedImage = path.startsWith('images/shop/') && /\.(jpg|jpeg|png|webp)$/i.test(path);

  if (!isAllowedFile && !isAllowedImage) {
    return res.status(403).json({ error: 'Write access denied for this path' });
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  try {
    let sha = null;
    const getRes = await fetch(`${url}?ref=${BRANCH}`, { headers });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    } else if (getRes.status !== 404) {
      return res.status(getRes.status).json({ error: 'Could not read file from GitHub' });
    }

    let base64;
    if (binary) {
      base64 = content;
    } else {
      base64 = Buffer.from(content, 'utf8').toString('base64');
    }

    const body = {
      message: message || 'Update from console',
      content: base64,
      branch: BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(putRes.status).json({ error: err.message || 'GitHub rejected commit' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}