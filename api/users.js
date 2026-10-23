import { requireAuth } from './_lib/auth.js';
import { hashPassword } from './_lib/passwords.js';

const OWNER  = 'keithkirujah';
const REPO   = '99computers';
const BRANCH = 'main';
const USERS_PATH = 'data/users.json';

export default async function handler(req, res) {
  // 1. Strictly require Admin role
  const auth = requireAuth(req, ['admin']);
  if (!auth.authorized) return res.status(auth.status).json({ error: auth.error });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server config error' });

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${USERS_PATH}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // GET: Return users WITHOUT passwords
  if (req.method === 'GET') {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) return res.status(404).json({ error: 'users.json not found' });
      const data = await r.json();
      const users = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      
      // Strip passwords from response!
      const safeUsers = {
        site:  { user: users.site?.user || '' },
        staff: { user: users.staff?.user || '' }
      };
      return res.status(200).json({ users: safeUsers });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read users' });
    }
  }

  // POST: Update a user
  if (req.method === 'POST') {
    const { role, user, pass } = req.body || {};
    
    // Strict allowlist for roles (Admin cannot be changed here)
    if (!['site', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!user || !pass || pass.length < 6) {
      return res.status(400).json({ error: 'Username required and password must be at least 6 chars' });
    }

    try {
      const getRes = await fetch(url, { headers });
      if (!getRes.ok) return res.status(404).json({ error: 'users.json not found' });
      const data = await getRes.json();
      const currentUsers = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

      // Hash the new password!
      const hashedPass = await hashPassword(pass);
      currentUsers[role] = { user, pass: hashedPass };
      
      const newContent = Buffer.from(JSON.stringify(currentUsers, null, 2), 'utf8').toString('base64');

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Security: Update credentials for ${role}`,
          content: newContent,
          sha: data.sha,
          branch: BRANCH
        })
      });

      if (!putRes.ok) throw new Error('GitHub rejected the save');
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save users' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}