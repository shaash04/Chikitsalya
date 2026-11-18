import { Request, Response, NextFunction } from 'express';
import { generateCsrfToken, verifyCsrfToken } from '../utils/security.js';
import { env } from '../config/env.js';

export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Controller endpoint to issue a new CSRF token
 */
export function getCsrfTokenHandler(req: Request, res: Response) {
  const token = generateCsrfToken();
  // Set non-httpOnly cookie so frontend Angular HttpClient or custom interceptor can read it
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  return res.json({
    success: true,
    csrfToken: token,
    headerName: CSRF_HEADER_NAME
  });
}

/**
 * CSRF Protection Middleware
 * Validates X-CSRF-Token header on state-changing requests (POST, PUT, PATCH, DELETE)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe HTTP methods do not change server state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt specific public auth endpoints if needed, but in SHMS we enforce CSRF across state-changing actions
  // However, allow registration / login to establish CSRF token or provide explicit test header
  const tokenFromHeader = req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token'];
  const tokenStr = Array.isArray(tokenFromHeader) ? tokenFromHeader[0] : tokenFromHeader;

  if (!tokenStr) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'Security validation failed: Missing X-CSRF-Token header on state-changing request.'
      }
    });
  }

  if (!verifyCsrfToken(tokenStr)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Security validation failed: Invalid or tampered CSRF token.'
      }
    });
  }

  next();
}
