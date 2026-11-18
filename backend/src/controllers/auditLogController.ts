import { Request, Response, NextFunction } from 'express';
import { auditLogRepository } from '../repositories/auditLogRepository.js';

export class AuditLogController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const eventType = req.query.eventType as string | undefined;
      const outcome = req.query.outcome as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const logs = await auditLogRepository.findAll({
        eventType,
        outcome,
        limit
      });

      return res.json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditLogController = new AuditLogController();
