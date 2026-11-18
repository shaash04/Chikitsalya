import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { helmetMiddleware, corsMiddleware, customSecurityHeaders } from './middleware/securityHeaders.js';
import { requestCorrelationMiddleware } from './middleware/auditLogger.js';
import { sessionMiddleware } from './middleware/sessionAuth.js';
import { wafMiddleware } from './middleware/wafMiddleware.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy if behind reverse proxy (e.g. Nginx, Cloudflare)
  app.set('trust proxy', 1);

  // 2. Helmet Security Headers (CSP, nosniff, X-Frame-Options: DENY, etc.)
  app.use(helmetMiddleware);

  // 3. CORS with strict origin validation and credentials
  app.use(corsMiddleware);

  // 4. Cache-Control and custom security flags
  app.use(customSecurityHeaders);

  // 5. Body parser with strict size limits to prevent Denial of Service payload exhaustion
  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));

  // 6. Cookie Parser for secure session cookie
  app.use(cookieParser());

  // 7. Request correlation tracing
  app.use(requestCorrelationMiddleware);

  // 8. Application-Level Web Application Firewall (WAF) Simulator
  app.use(wafMiddleware);

  // 9. Server-managed Session authentication middleware
  app.use(sessionMiddleware);

  // 9. CSRF protection on state-changing operations
  // Note: /api/csrf-token, /api/auth/login, /api/auth/register, /api/security-demo/test-csrf, /api/security-demo/test-sqli, /api/security-demo/test-password-hash, /api/security-demo/test-xss are handled appropriately
  app.use('/api', (req, res, next) => {
    // Exempt demo inspection endpoints and initial auth endpoints if testing without session token
    if (
      req.path === '/csrf-token' ||
      req.path === '/auth/login' ||
      req.path === '/auth/login/2fa' ||
      req.path === '/auth/register' ||
      req.path === '/auth/logout' ||
      req.path === '/auth/dev-reset-lockouts' ||
      req.path.startsWith('/security-demo')
    ) {
      return next();
    }
    return csrfProtection(req, res, next);
  });

  // 10. Mount API Router
  app.use('/api', apiRouter);

  // 11. Serve Frontend Production Build if built
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const possibleDistPaths = [
    path.resolve(process.cwd(), 'frontend/dist/browser'),
    path.resolve(process.cwd(), '../frontend/dist/browser'),
    path.resolve(currentDir, '../../frontend/dist/browser'),
    path.resolve(currentDir, '../../../frontend/dist/browser'),
    path.resolve(currentDir, '../frontend/dist/browser')
  ];
  const distDir = possibleDistPaths.find(p => fs.existsSync(p));

  if (distDir) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // 12. Centralized Error Handler (prevents stack trace disclosure)
  app.use(errorHandler);

  return app;
}
