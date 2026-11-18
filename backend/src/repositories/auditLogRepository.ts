import { db } from '../config/database.js';
import { AuditLogEntry } from '../types/index.js';
import { sanitizeLogInput } from '../utils/security.js';

export class AuditLogRepository {
  async record(entry: {
    actorUserId: number | null;
    actorUsername: string;
    actorRole: string;
    eventType: string;
    resourceType: string;
    resourceId?: string | number | null;
    outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
    ipAddress: string;
    userAgent?: string | null;
    correlationId: string;
    metadata?: Record<string, any> | string | null;
  }): Promise<number> {
    const metaStr = entry.metadata
      ? typeof entry.metadata === 'string'
        ? sanitizeLogInput(entry.metadata)
        : sanitizeLogInput(JSON.stringify(entry.metadata))
      : null;

    try {
      const [result] = await db.execute(
        `INSERT INTO audit_logs 
         (actor_user_id, actor_username, actor_role, event_type, resource_type, resource_id, outcome, ip_address, user_agent, correlation_id, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.actorUserId,
          sanitizeLogInput(entry.actorUsername).slice(0, 50),
          entry.actorRole,
          entry.eventType,
          entry.resourceType,
          entry.resourceId ? String(entry.resourceId) : null,
          entry.outcome,
          entry.ipAddress,
          entry.userAgent ? sanitizeLogInput(entry.userAgent).slice(0, 255) : null,
          entry.correlationId,
          metaStr
        ]
      );
      return result.insertId;
    } catch (e: any) {
      console.error('CRITICAL: Audit logging failure:', e.message);
      return -1;
    }
  }

  async findAll(filter?: {
    eventType?: string;
    outcome?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    const limit = filter?.limit && filter.limit > 0 && filter.limit <= 200 ? filter.limit : 100;
    
    if (filter?.eventType && filter.eventType.trim().length > 0) {
      const [rows] = await db.execute<AuditLogEntry[]>(
        'SELECT * FROM audit_logs WHERE event_type = ? ORDER BY id DESC LIMIT 100',
        [filter.eventType.trim()]
      );
      return rows;
    }

    if (filter?.outcome && ['SUCCESS', 'FAILURE', 'DENIED'].includes(filter.outcome)) {
      const [rows] = await db.execute<AuditLogEntry[]>(
        'SELECT * FROM audit_logs WHERE outcome = ? ORDER BY id DESC LIMIT 100',
        [filter.outcome]
      );
      return rows;
    }

    const [rows] = await db.execute<AuditLogEntry[]>(
      'SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?',
      [limit]
    );
    return rows;
  }
}

export const auditLogRepository = new AuditLogRepository();
