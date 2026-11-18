import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : (env.NODE_ENV === 'development' ? Math.max(env.LOGIN_RATE_LIMIT_MAX, 30) : env.LOGIN_RATE_LIMIT_MAX),
  skipSuccessfulRequests: true, // Legitimate successful logins do not penalize rate limit quota
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || '127.0.0.1';
    auditLogRepository.record({
      actorUserId: null,
      actorUsername: 'ANONYMOUS',
      actorRole: 'GUEST',
      eventType: 'RATE_LIMIT_EXCEEDED',
      resourceType: 'AUTH',
      resourceId: null,
      outcome: 'DENIED',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || 'rate-limit',
      metadata: { path: req.originalUrl, limit: env.LOGIN_RATE_LIMIT_MAX, window: '15m' }
    }).catch(() => {});

    return res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts from this IP address. Account access is temporarily throttled. Please try again after 15 minutes.'
      }
    });
  }
});

export const sensitiveActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_SENSITIVE_REQUESTS',
        message: 'Rate limit exceeded for sensitive operation. Please wait before retrying.'
      }
    });
  }
});

export const generalApiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      error: {
        code: 'API_RATE_LIMIT_EXCEEDED',
        message: 'Too many API requests. Please slow down.'
      }
    });
  }
});
