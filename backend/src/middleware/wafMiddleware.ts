import { Request, Response, NextFunction } from 'express';
import { wafService } from '../services/wafService.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { v4 as uuidv4 } from 'uuid';

export function wafMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow test demonstration endpoints to simulate attacks safely without premature middleware blockage
  if (req.path.startsWith('/security-demo') || req.path.startsWith('/api/security-demo')) {
    return next();
  }

  // Exempt static assets and health check
  if (req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/favicon')) {
    return next();
  }

  const result = wafService.inspectRequest(req);

  if (result.blocked && result.rule) {
    const correlationId = req.correlationId || uuidv4();
    const eventType = `WAF_${result.rule.category}_BLOCKED`;

    // Persist security incident into audit log
    auditLogRepository.record({
      actorUserId: req.sessionUser?.userId || null,
      actorUsername: req.sessionUser?.username || 'GUEST_ATTACKER',
      actorRole: req.sessionUser?.role || 'UNAUTHENTICATED',
      eventType,
      resourceType: 'HTTP_REQUEST',
      resourceId: req.path.slice(0, 50),
      outcome: 'DENIED',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId,
      metadata: {
        ruleId: result.rule.id,
        ruleName: result.rule.name,
        category: result.rule.category,
        location: result.matchedLocation,
        payloadSnippet: result.detectedPayload
      }
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'WAF_REQUEST_BLOCKED',
        message: 'Security Alert: Suspicious request payload intercepted and blocked by Web Application Firewall (WAF).',
        waf: {
          ruleId: result.rule.id,
          ruleName: result.rule.name,
          category: result.rule.category,
          severity: result.rule.severity,
          matchedLocation: result.matchedLocation
        }
      }
    });
  }

  if (result.detected && result.rule) {
    const correlationId = req.correlationId || uuidv4();
    auditLogRepository.record({
      actorUserId: req.sessionUser?.userId || null,
      actorUsername: req.sessionUser?.username || 'GUEST',
      actorRole: req.sessionUser?.role || 'UNAUTHENTICATED',
      eventType: `WAF_${result.rule.category}_DETECTED`,
      resourceType: 'HTTP_REQUEST',
      resourceId: req.path.slice(0, 50),
      outcome: 'FAILURE',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId,
      metadata: {
        ruleId: result.rule.id,
        ruleName: result.rule.name,
        category: result.rule.category,
        location: result.matchedLocation,
        mode: 'DETECT_ONLY'
      }
    });
  }

  next();
}
