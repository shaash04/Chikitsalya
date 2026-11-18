import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/**
 * Helmet Security Headers Middleware
 * Implements Defense-in-Depth for HTTP response headers
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", env.CLIENT_URL, "http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:4000", "http://127.0.0.1:4000", `http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Explicit Origin CORS Allowlist Middleware
 * Strict origin checking prevents arbitrary origins from reading authenticated responses
 */
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  `http://localhost:${env.PORT}`,
  `http://127.0.0.1:${env.PORT}`
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, automated tests)
    if (!origin || origin === 'null') return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: This origin is not allowed access by SHMS security policy.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Correlation-ID',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-Correlation-ID', 'X-CSRF-Token']
});

/**
 * Custom Anti-Caching and Diagnostic Security Headers Middleware
 */
export function customSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent sensitive medical/auth data from caching on intermediate proxies or browsers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}
