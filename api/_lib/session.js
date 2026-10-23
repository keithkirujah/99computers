import crypto from 'crypto';

const COOKIE_NAME = 'n99_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

function getSecret() {
  const secret = process.env.N99_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('N99_SESSION_SECRET is missing or too short. Must be at least 32 characters.');
  }
  return secret;
}

/**
 * Creates a signed session token.
 */
export function createSession(role) {
  const payload = JSON.stringify({ role, exp: Date.now() + MAX_AGE * 1000 });
  const base64Payload = Buffer.from(payload).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(base64Payload)
    .digest('base64url');

  return `${base64Payload}.${signature}`;
}

/**
 * Verifies a session token. Returns the payload if valid, or null if invalid.
 */
export function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  
  const [base64Payload, signature] = token.split('.');
  if (!base64Payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(base64Payload)
    .digest('base64url');

  // Timing-safe comparison to prevent signature timing attacks
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    
    // Check expiry
    if (!payload.exp || payload.exp < Date.now()) return null;
    
    return payload; // { role, exp }
  } catch (e) {
    return null;
  }
}

/**
 * Sets the secure session cookie on the response.
 */
export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`);
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

/**
 * Extracts the session from the request cookie header.
 */
export function getSessionFromReq(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifySession(match[1]);
}