import { getSession } from './_lib/session.js';

/* GitHub write proxy. All writes are authenticated, role-checked and path-limited. */
const OWNER = 'keithkirujah';
const REPO = '99computers';
const BRANCH = 'main';
const ALLOWED_TEXT_PATHS = new Set(['catalog.json', 'data/log.json']);
const IMAGE_PATH_PATTERN = /^images\/shop\/[A-Za-z0-9._-]+\.jpg$/;

function allowedPath(path, binary) {
  if (typeof path !== 'string' || path.includes('..') || path.startsWith('/')) return false;
  if (binary) return IMAGE_PATH_PATTERN.test(path);
  return ALLOWED_TEXT_PATHS.has(path);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized. Please log in again.' });

  const { path, content, message, binary = false } = req.body || {};
  if (typeof content !== 'string' || !allowedPath(path, binary)) {
    return res.status(400).json({ error: 'File path or content is not allowed' });
  }

  if (session.role === 'staff' && path === 'data/log.json') {
    // Staff can publish catalog/images; activity logs are managed by the API.
    return res.status(403).json({ error: 'Insufficient permissions for this file' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server token not configured' });

  // Preserve path separators; encode each segment individually.
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
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
      const err = await getRes.json().catch(() => ({}));
      return res.status(502).json({ error: err.message || 'Could not read file from GitHub' });
    }

    const base64 = binary
      ? content
      : Buffer.from(content, 'utf8').toString('base64');

    if (binary && !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) {
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const body = {
      message: typeof message === 'string' && message.length <= 200 ? message : 'Update from 99 Computers staff console',
      content: base64,
      branch: BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(502).json({ error: err.message || 'GitHub rejected the commit' });
    }

    const out = await putRes.json();
    return res.status(200).json({ ok: true, sha: out.content?.sha });
  } catch (error) {
    console.error('Save operation failed:', error);
    return res.status(500).json({ error: 'Server error while saving' });
  }
}
