/* 99 COMPUTERS — Secure GitHub commit proxy
   The GitHub token lives ONLY here (Vercel env var). The browser never sees it. */

const OWNER  = 'keithkirujah';
const REPO   = '99computers';
const BRANCH = 'main';

export default async function handler(req, res) {
  // CORS preflight (not strictly needed since same-origin, but harmless)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server token not configured. Add GITHUB_TOKEN in Vercel and redeploy.' });
  }

  const { path, content, message, binary } = req.body || {};
  if (!path || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing "path" or "content"' });
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Get current SHA (needed to overwrite an existing file)
    let sha = null;
    const getRes = await fetch(`${url}?ref=${BRANCH}`, { headers });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      return res.status(getRes.status).json({ error: err.message || 'Could not read file from GitHub' });
    }

    // 2. Decide how to encode content
    // - binary:true → content is already base64 (images)
    // - binary:false/undefined → content is plain text, must be base64-encoded
    let base64;
    if (binary) {
      base64 = content;
    } else {
      base64 = Buffer.from(content, 'utf8').toString('base64');
    }

    // 3. Commit
    const body = {
      message: message || 'Update from 99 Computers staff console',
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
      return res.status(putRes.status).json({ error: err.message || 'GitHub rejected the commit' });
    }

    const out = await putRes.json();
    return res.status(200).json({ ok: true, sha: out.content?.sha });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}