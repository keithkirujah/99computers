import { getSessionFromReq } from './session.js';

/**
 * Reusable authorization check.
 * @param {object} req - The request object
 * @param {string[]} allowedRoles - Array of roles allowed to access this endpoint (e.g. ['admin'])
 * @returns {object} - { authorized: boolean, error: string, role: string }
 */
export function requireAuth(req, allowedRoles = []) {
  const session = getSessionFromReq(req);
  
  if (!session) {
    return { authorized: false, error: 'Unauthorized. Please log in.', status: 401 };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return { authorized: false, error: 'Forbidden. You do not have permission.', status: 403 };
  }

  return { authorized: true, role: session.role };
}