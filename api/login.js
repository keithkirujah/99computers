import { createSessionCookie } from './_lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, pass } = req.body || {};
  if (typeof user !== 'string' || typeof pass !== 'string' || !user || !pass) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  let role = null;

  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    role = 'admin';
  } else {
    try {
      const token = process.env.GITHUB_TOKEN;
      if (!token) return res.status(500).json({ error: 'Login service is not configured' });

      const url = 'https://api.github.com/repos/keithkirujah/99computers/contents/data/users.json';
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const users = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        if (users.site && user === users.site.user && pass === users.site.pass) role = 'site';
        else if (users.staff && user === users.staff.user && pass === users.staff.pass) role = 'staff';
      } else {
        console.error('Failed to read users.json; GitHub status:', response.status);
      }
    } catch (error) {
      console.error('Failed to verify staff login:', error);
    }
  }

  if (!role) return res.status(401).json({ error: 'Invalid username or password' });

  try {
    res.setHeader('Set-Cookie', createSessionCookie(role));
  } catch (error) {
    console.error('Session configuration error:', error.message);
    return res.status(500).json({ error: 'Login service is not configured securely' });
  }

  return res.status(200).json({ ok: true, role });
}
