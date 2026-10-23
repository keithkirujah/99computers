import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'n99_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.N99_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('N99_SESSION_SECRET must be configured with at least 32 bytes.');
  }
  return secret;
}

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSessionCookie(role) {
  if (!['admin', 'site', 'staff'].includes(role)) {
    throw new Error('Invalid session role.');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  })).toString('base64url');

  const value = `${payload}.${signature(payload, getSecret())}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function getSession(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';');
  const entry = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;

  const value = entry.slice(COOKIE_NAME.length + 1);
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  if (!payload || !suppliedSignature) return null;

  let expectedSignature;
  try {
    expectedSignature = signature(payload, getSecret());
  } catch {
    return null;
  }

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!['admin', 'site', 'staff'].includes(session.role)) return null;
    if (!Number.isInteger(session.exp) || session.exp <= now) return null;
    if (!Number.isInteger(session.iat) || session.iat > now + 60) return null;
    return { role: session.role, expiresAt: session.exp };
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
