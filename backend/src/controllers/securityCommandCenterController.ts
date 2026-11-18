import { Request, Response, NextFunction } from 'express';
import { securityAnalyticsService } from '../services/securityAnalyticsService.js';
import { z } from 'zod';

const eventsFilterSchema = z.object({
  severity: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional().default(100)
});

export class SecurityCommandCenterController {
  /**
   * GET /api/admin/security/overview
   * Returns SOC KPI card counts & operational status
   */
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await securityAnalyticsService.getOverviewMetrics();
      return res.json({
        success: true,
        data: overview
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/security/analytics
   * Returns timeline data, category distribution, severity breakdown, and login stats
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await securityAnalyticsService.getThreatAnalytics();
      return res.json({
        success: true,
        data: analytics
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/security/events
   * Returns filtered live security events
   */
  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = eventsFilterSchema.parse(req.query);
      const result = await securityAnalyticsService.getSecurityEvents(filter);
      return res.json({
        success: true,
        data: result.events,
        meta: {
          totalCount: result.totalCount,
          returnedCount: result.events.length,
          severity: filter.severity || 'ALL',
          category: filter.category || 'ALL',
          search: filter.search || ''
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/security/alerts
   * Returns high-priority security notifications with remediation guidance
   */
  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await securityAnalyticsService.getSecurityAlerts();
      return res.json({
        success: true,
        data: alerts
      });
    } catch (err) {
      next(err);
    }
  }
}

export const securityCommandCenterController = new SecurityCommandCenterController();
