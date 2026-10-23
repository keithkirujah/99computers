import { createSession, setSessionCookie } from './_lib/session.js';
import { verifyPassword } from './_lib/passwords.js';

const OWNER  = 'keithkirujah';
const REPO   = '99computers';
const USERS_PATH = 'data/users.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user, pass } = req.body || {};
  if (!user || !pass) return res.status(400).json({ error: 'Missing username or password' });

  let role = null;

  // 1. Check Admin (Environment Variables)
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    role = 'admin';
  } 
  
  // 2. Check Staff & Site (GitHub users.json)
  if (!role) {
    try {
      const token = process.env.GITHUB_TOKEN;
      const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${USERS_PATH}`;
      const r = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' } 
      });
      
      if (r.ok) {
        const data = await r.json();
        const users = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        
        // Note: We use verifyPassword to check the hash
        if (users.site && user === users.site.user && await verifyPassword(pass, users.site.pass)) {
          role = 'site';
        } else if (users.staff && user === users.staff.user && await verifyPassword(pass, users.staff.pass)) {
          role = 'staff';
        }
      }
    } catch (e) {
      console.error('Login read error', e);
    }
  }

  if (!role) return res.status(401).json({ error: 'Invalid username or password' });

  // Issue secure signed cookie
  const token = createSession(role);
  setSessionCookie(res, token);
  
  return res.status(200).json({ ok: true, role });
}