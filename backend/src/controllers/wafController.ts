import { Request, Response, NextFunction } from 'express';
import { wafService, WafRuleMode } from '../services/wafService.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const updateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['BLOCK', 'DETECT_ONLY']).optional()
});

const simulateSchema = z.object({
  payload: z.string().min(1, 'Payload string is required'),
  category: z.string().optional()
});

export class WafController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = wafService.getOverview();
      return res.json({
        success: true,
        data: overview
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { ruleId } = req.params;
      const validated = updateRuleSchema.parse(req.body);

      const updated = wafService.updateRule(ruleId, validated);

      // Audit rule state modification
      await auditLogRepository.record({
        actorUserId: req.sessionUser?.userId || null,
        actorUsername: req.sessionUser?.username || 'admin',
        actorRole: req.sessionUser?.role || 'admin',
        eventType: 'WAF_RULE_CONFIG_CHANGED',
        resourceType: 'WAF_RULE',
        resourceId: ruleId,
        outcome: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId || uuidv4(),
        metadata: { ruleId, updates: validated }
      });

      return res.json({
        success: true,
        message: `WAF rule ${ruleId} updated successfully.`,
        data: updated
      });
    } catch (err: any) {
      if (err.message === 'RULE_NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'WAF rule not found' } });
      }
      next(err);
    }
  }

  async simulate(req: Request, res: Response, next: NextFunction) {
    try {
      const { payload, category } = simulateSchema.parse(req.body);
      const result = wafService.simulate(payload, category);

      return res.json({
        success: true,
        data: {
          payload,
          category,
          inspected: true,
          blocked: result.blocked,
          detected: result.detected,
          ruleMatched: result.rule
            ? {
                id: result.rule.id,
                name: result.rule.name,
                category: result.rule.category,
                severity: result.rule.severity,
                mode: result.rule.mode
              }
            : null,
          matchedPattern: result.matchedPattern,
          defenseExplanation: result.blocked
            ? `WAF intercepted the payload before reaching the application layer. Prepared SQL statements and output encoding provide defense-in-depth.`
            : 'Payload did not match any active blocking rules.'
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const wafController = new WafController();
