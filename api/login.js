export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user, pass } = req.body || {};
  let role = null;

  // 1. Check Admin (Always in Vercel for safety)
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    role = 'admin';
  } 
  // 2. Check Site and Staff (Stored in GitHub)
  else {
    try {
      const token = process.env.GITHUB_TOKEN;
      const url = `https://api.github.com/repos/keithkirujah/99computers/contents/data/users.json`;
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (r.ok) {
        const data = await r.json();
        const users = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        
        if (users.site && user === users.site.user && pass === users.site.pass) role = 'site';
        else if (users.staff && user === users.staff.user && pass === users.staff.pass) role = 'staff';
      }
    } catch (e) {
      console.error('Failed to read users.json', e);
    }
  }

  if (!role) return res.status(401).json({ error: 'Invalid username or password' });

  // Set secure cookie
  res.setHeader('Set-Cookie', `n99_auth=${role}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);
  return res.status(200).json({ ok: true, role });
}