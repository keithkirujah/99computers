const OWNER  = 'keithkirujah';
const REPO   = '99computers';
const BRANCH = 'main';
const USERS_PATH = 'data/users.json';

export default async function handler(req, res) {
  // 1. Must be logged in
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/n99_auth=(admin|site|staff)/);
  if (!match) return res.status(401).json({ error: 'Unauthorized' });

  const currentRole = match[1];

  // 2. ONLY Admin can view or edit user credentials
  if (currentRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only the Main Admin can manage users.' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Missing token' });

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${USERS_PATH}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // GET: Read the current users
  if (req.method === 'GET') {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) return res.status(404).json({ error: 'users.json not found' });
      const data = await r.json();
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      return res.status(200).json({ users: content });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: Update a user
  if (req.method === 'POST') {
    const { role, user, pass } = req.body || {};
    if (!role || !user || !pass) return res.status(400).json({ error: 'Missing fields' });

    try {
      const getRes = await fetch(url, { headers });
      if (!getRes.ok) return res.status(404).json({ error: 'users.json not found' });
      const data = await getRes.json();
      const currentUsers = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

      currentUsers[role] = { user, pass };
      const newContent = Buffer.from(JSON.stringify(currentUsers, null, 2), 'utf8').toString('base64');

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Update credentials for ${role}`,
          content: newContent,
          sha: data.sha,
          branch: BRANCH
        })
      });

      if (!putRes.ok) throw new Error('GitHub rejected the save');
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}