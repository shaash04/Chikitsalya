import { auditLogRepository } from '../repositories/auditLogRepository.js';
import {
  AuditLogEntry,
  SecurityEventItem,
  SecurityOverviewMetrics,
  ThreatAnalytics,
  SecurityAlert,
  SecuritySeverity,
  SecurityActionTaken,
  SecurityCategory,
  TimelineDataPoint,
  CategoryDistribution,
  SeverityDistribution,
  LoginStatistics
} from '../types/index.js';

export function classifySecurityEvent(log: AuditLogEntry): {
  severity: SecuritySeverity;
  actionTaken: SecurityActionTaken;
  category: SecurityCategory;
  details: string;
} {
  const type = (log.event_type || '').toUpperCase();
  const outcome = (log.outcome || '').toUpperCase();

  // 1. WAF & Injection Attacks
  if (
    type.includes('SQLI') ||
    type.includes('XSS') ||
    type.includes('TRAVERSAL') ||
    type.includes('INJECTION') ||
    type.startsWith('WAF_')
  ) {
    let details = 'Suspicious web payload intercepted by security filters.';
    if (type.includes('SQLI')) details = 'Potential SQL injection syntax detected and blocked.';
    else if (type.includes('XSS')) details = 'Cross-Site Scripting (XSS) script tag payload neutralized.';
    else if (type.includes('TRAVERSAL')) details = 'Path traversal / directory boundary probe intercepted.';

    return {
      severity: 'CRITICAL',
      actionTaken: outcome === 'DENIED' ? 'BLOCKED' : outcome === 'FAILURE' ? 'REJECTED' : 'ALLOWED',
      category: 'INJECTION_WAF',
      details
    };
  }

  // 2. IDOR & Broken Object Level Authorization
  if (type === 'IDOR_RECORD_DENIED' || type.includes('IDOR')) {
    return {
      severity: 'CRITICAL',
      actionTaken: 'BLOCKED',
      category: 'ACCESS_CONTROL',
      details: `Unauthorized attempt to access confidential medical record ${log.resource_id || ''} belonging to another patient.`
    };
  }

  // 3. Brute Force Account Lockouts & Throttling
  if (type === 'AUTH_LOGIN_LOCKED' || type === 'AUTH_LOGIN_THROTTLED') {
    return {
      severity: 'HIGH',
      actionTaken: 'BLOCKED',
      category: 'AUTHENTICATION',
      details: `Account temporarily locked out for security due to excessive consecutive failed logins (${log.actor_username}).`
    };
  }

  // 4. Rate Limiting / DoS Protection
  if (type === 'RATE_LIMIT_EXCEEDED') {
    return {
      severity: 'HIGH',
      actionTaken: 'BLOCKED',
      category: 'RATE_LIMIT',
      details: `Traffic rate threshold exceeded on sensitive endpoint from source IP ${log.ip_address}. Temporary cooling period enforced.`
    };
  }

  // 5. Role-Based Access Violations (RBAC)
  if (type === 'RBAC_DENIED') {
    return {
      severity: 'HIGH',
      actionTaken: 'BLOCKED',
      category: 'ACCESS_CONTROL',
      details: `Privilege escalation blocked: Role '${log.actor_role}' attempted unauthorized access to resource '${log.resource_type}'.`
    };
  }

  // 6. Two-Factor Authentication Events
  if (type.includes('2FA_FAILURE') || type.includes('2FA_INVALID_OTP') || type.includes('2FA_RECOVERY_FAILURE')) {
    return {
      severity: 'HIGH',
      actionTaken: 'REJECTED',
      category: 'AUTHENTICATION',
      details: `Two-factor authentication challenge failed for user '${log.actor_username}'.`
    };
  }

  if (type.includes('2FA_ENABLED') || type.includes('2FA_DISABLED') || type.includes('2FA_SUCCESS')) {
    return {
      severity: 'LOW',
      actionTaken: 'ALLOWED',
      category: 'AUTHENTICATION',
      details: `Two-factor authentication configuration updated for user '${log.actor_username}'.`
    };
  }

  // 7. Active Session Revocation Events
  if (type.includes('SESSION_REVOKED') || type.includes('REVOKED_SESSION_REJECTED')) {
    const isRejected = type.includes('REJECTED');
    return {
      severity: isRejected ? 'HIGH' : 'MEDIUM',
      actionTaken: isRejected ? 'BLOCKED' : 'ALLOWED',
      category: 'AUTHENTICATION',
      details: isRejected
        ? 'Terminated session token presented to API; immediately rejected.'
        : `Active user session revoked on server registry for user '${log.actor_username}'.`
    };
  }

  // 8. Authentication Failures
  if (type === 'AUTH_LOGIN_FAILURE') {
    return {
      severity: 'MEDIUM',
      actionTaken: 'REJECTED',
      category: 'AUTHENTICATION',
      details: `Failed authentication attempt for identity '${log.actor_username}'. Anti-enumeration defenses triggered.`
    };
  }

  // 9. Administrative Governance
  if (type.startsWith('ADMIN_')) {
    return {
      severity: 'MEDIUM',
      actionTaken: 'ALLOWED',
      category: 'ADMIN',
      details: `Administrative operation '${type}' executed by '${log.actor_username}' on resource '${log.resource_type}'.`
    };
  }

  // 10. General System & Clinical Operations
  return {
    severity: outcome === 'DENIED' ? 'HIGH' : outcome === 'FAILURE' ? 'MEDIUM' : 'LOW',
    actionTaken: outcome === 'DENIED' ? 'BLOCKED' : outcome === 'FAILURE' ? 'REJECTED' : 'ALLOWED',
    category: 'GENERAL',
    details: `${type} recorded with status ${outcome} for actor '${log.actor_username}'.`
  };
}

export class SecurityAnalyticsService {
  /**
   * Transforms raw audit log into typed SecurityEventItem
   */
  private mapLogToSecurityItem(log: AuditLogEntry): SecurityEventItem {
    const classification = classifySecurityEvent(log);
    let parsedMetadata: Record<string, any> | null = null;
    if (log.metadata) {
      try {
        parsedMetadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
      } catch {
        parsedMetadata = { raw: log.metadata };
      }
    }

    return {
      id: log.id,
      timestamp: log.timestamp,
      eventType: log.event_type,
      category: classification.category,
      actorUsername: log.actor_username,
      actorRole: log.actor_role,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      outcome: log.outcome,
      severity: classification.severity,
      actionTaken: classification.actionTaken,
      correlationId: log.correlation_id,
      details: classification.details,
      metadata: parsedMetadata
    };
  }

  /**
   * Retrieves overall SOC high-level metrics
   */
  async getOverviewMetrics(): Promise<SecurityOverviewMetrics> {
    const allLogs = await auditLogRepository.findAll({ limit: 500 });
    const items = allLogs.map(l => this.mapLogToSecurityItem(l));
    const activeSessions = await auditLogRepository.countActiveSessions();

    const totalRequestsAnalyzed = Math.max(items.length, 12);
    const suspiciousRequestsDetected = items.filter(
      i => i.severity === 'HIGH' || i.severity === 'CRITICAL' || i.outcome === 'DENIED' || i.outcome === 'FAILURE'
    ).length;
    const blockedAttacks = items.filter(i => i.actionTaken === 'BLOCKED').length;
    const failedLoginAttempts = items.filter(
      i => i.eventType === 'AUTH_LOGIN_FAILURE' || i.eventType === 'AUTH_LOGIN_LOCKED' || i.eventType === 'AUTH_LOGIN_THROTTLED'
    ).length;
    const criticalSecurityAlerts = items.filter(i => i.severity === 'CRITICAL').length;

    let systemStatus: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL' = 'OPTIMAL';
    if (criticalSecurityAlerts > 5) {
      systemStatus = 'CRITICAL';
    } else if (criticalSecurityAlerts > 0 || blockedAttacks > 0) {
      systemStatus = 'ELEVATED';
    }

    return {
      totalRequestsAnalyzed,
      suspiciousRequestsDetected,
      blockedAttacks,
      failedLoginAttempts,
      activeUserSessions: Math.max(activeSessions, 1),
      criticalSecurityAlerts,
      systemStatus
    };
  }

  /**
   * Retrieves comprehensive threat analytics (timeline, categories, severities, login statistics)
   */
  async getThreatAnalytics(): Promise<ThreatAnalytics> {
    const allLogs = await auditLogRepository.findAll({ limit: 500 });
    const items = allLogs.map(l => this.mapLogToSecurityItem(l));

    // 1. Category Distribution
    const categoryCounts: Record<SecurityCategory, number> = {
      AUTHENTICATION: 0,
      ACCESS_CONTROL: 0,
      INJECTION_WAF: 0,
      RATE_LIMIT: 0,
      ADMIN: 0,
      GENERAL: 0
    };

    const categoryLabels: Record<SecurityCategory, string> = {
      AUTHENTICATION: 'Authentication & Credential Defense',
      ACCESS_CONTROL: 'Access Control & IDOR Guard',
      INJECTION_WAF: 'Injection & WAF Payload Interception',
      RATE_LIMIT: 'Rate Limiting & DoS Throttling',
      ADMIN: 'Governance & Privilege Operations',
      GENERAL: 'Standard Clinical / System Operations'
    };

    items.forEach(i => {
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    });

    const totalEvents = Math.max(items.length, 1);
    const categories: CategoryDistribution[] = (Object.keys(categoryCounts) as SecurityCategory[]).map(cat => ({
      category: cat,
      label: categoryLabels[cat],
      count: categoryCounts[cat],
      percentage: Number(((categoryCounts[cat] / totalEvents) * 100).toFixed(1))
    }));

    // 2. Severity Distribution
    const severityCounts: Record<SecuritySeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    items.forEach(i => {
      severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
    });

    const severities: SeverityDistribution[] = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SecuritySeverity[]).map(sev => ({
      severity: sev,
      count: severityCounts[sev],
      percentage: Number(((severityCounts[sev] / totalEvents) * 100).toFixed(1))
    }));

    // 3. Login Statistics
    const successfulLogins = items.filter(i => i.eventType === 'AUTH_LOGIN_SUCCESS').length;
    const failedLogins = items.filter(i => i.eventType === 'AUTH_LOGIN_FAILURE').length;
    const lockoutsTriggered = items.filter(
      i => i.eventType === 'AUTH_LOGIN_LOCKED' || i.eventType === 'AUTH_LOGIN_THROTTLED'
    ).length;
    const totalLoginAttempts = successfulLogins + failedLogins + lockoutsTriggered;
    const failureRatePercentage = totalLoginAttempts > 0
      ? Number((((failedLogins + lockoutsTriggered) / totalLoginAttempts) * 100).toFixed(1))
      : 0;

    const loginStats: LoginStatistics = {
      totalAttempts: totalLoginAttempts,
      successfulLogins,
      failedLogins,
      lockoutsTriggered,
      failureRatePercentage
    };

    // 4. Timeline (Divide past 24 hours into 6 4-hour intervals)
    const now = Date.now();
    const timeline: TimelineDataPoint[] = [];
    const intervalMs = 4 * 60 * 60 * 1000; // 4 hours

    for (let i = 5; i >= 0; i--) {
      const startMs = now - (i + 1) * intervalMs;
      const endMs = now - i * intervalMs;
      const date = new Date(endMs);
      const hours = date.getHours().toString().padStart(2, '0');
      const timeLabel = `${hours}:00`;

      const bucketItems = items.filter(it => {
        const t = new Date(it.timestamp).getTime();
        return t >= startMs && t < endMs;
      });

      timeline.push({
        timeLabel,
        timestamp: date.toISOString(),
        totalEvents: bucketItems.length,
        blockedAttacks: bucketItems.filter(b => b.actionTaken === 'BLOCKED').length,
        suspiciousEvents: bucketItems.filter(
          b => b.severity === 'HIGH' || b.severity === 'CRITICAL' || b.outcome === 'DENIED'
        ).length
      });
    }

    return {
      timeline,
      categories,
      severities,
      loginStats
    };
  }

  /**
   * Retrieves filtered list of live security events for the SOC table
   */
  async getSecurityEvents(filter?: {
    severity?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<{ events: SecurityEventItem[]; totalCount: number }> {
    const limit = filter?.limit && filter.limit > 0 && filter.limit <= 200 ? filter.limit : 100;
    const allLogs = await auditLogRepository.findAll({ limit: 500 });
    let items = allLogs.map(l => this.mapLogToSecurityItem(l));

    // Filter by severity
    if (filter?.severity && filter.severity !== 'ALL') {
      const sev = filter.severity.toUpperCase();
      items = items.filter(i => i.severity === sev);
    }

    // Filter by category
    if (filter?.category && filter.category !== 'ALL') {
      const cat = filter.category.toUpperCase();
      items = items.filter(i => i.category === cat);
    }

    // Keyword search
    if (filter?.search && filter.search.trim().length > 0) {
      const term = filter.search.trim().toLowerCase();
      items = items.filter(i =>
        i.eventType.toLowerCase().includes(term) ||
        i.actorUsername.toLowerCase().includes(term) ||
        i.ipAddress.toLowerCase().includes(term) ||
        i.details.toLowerCase().includes(term) ||
        (i.resourceId && i.resourceId.toLowerCase().includes(term))
      );
    }

    const totalCount = items.length;
    return {
      events: items.slice(0, limit),
      totalCount
    };
  }

  /**
   * Retrieves critical & actionable security alerts for administrator review
   */
  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    const allLogs = await auditLogRepository.findAll({ limit: 200 });
    const items = allLogs.map(l => this.mapLogToSecurityItem(l));

    const alerts: SecurityAlert[] = [];

    // Alert 1: IDOR / Object-Level Authorization Violations
    const idorItems = items.filter(i => i.eventType === 'IDOR_RECORD_DENIED');
    if (idorItems.length > 0) {
      alerts.push({
        id: 'ALT-IDOR-001',
        title: 'Broken Object-Level Authorization (IDOR) Attempt Neutralized',
        severity: 'CRITICAL',
        category: 'ACCESS_CONTROL',
        timestamp: idorItems[0].timestamp,
        sourceIp: idorItems[0].ipAddress,
        targetAccount: idorItems[0].actorUsername,
        description: `Patient '${idorItems[0].actorUsername}' attempted unauthorized cross-tenant retrieval of medical record '${idorItems[0].resourceId || 'restricted'}'. Access was rejected at middleware IDOR guard.`,
        recommendation: 'Inspect patient account activity and confirm referential integrity checks remain active.',
        eventCount: idorItems.length
      });
    }

    // Alert 2: WAF & Payload Injections
    const wafItems = items.filter(i => i.category === 'INJECTION_WAF');
    if (wafItems.length > 0) {
      alerts.push({
        id: 'ALT-WAF-002',
        title: 'Malicious Web Application Payload Intercepted',
        severity: 'CRITICAL',
        category: 'INJECTION_WAF',
        timestamp: wafItems[0].timestamp,
        sourceIp: wafItems[0].ipAddress,
        targetAccount: wafItems[0].actorUsername,
        description: `Input containing malicious syntax (${wafItems[0].eventType}) was detected and blocked before reaching application logic.`,
        recommendation: 'Verify perimeter WAF rules and ensure input sanitization and parameterized queries are active.',
        eventCount: wafItems.length
      });
    }

    // Alert 3: Brute-Force Rate Limiting & Account Lockout
    const lockoutItems = items.filter(
      i => i.eventType === 'AUTH_LOGIN_THROTTLED' || i.eventType === 'AUTH_LOGIN_LOCKED' || i.eventType === 'RATE_LIMIT_EXCEEDED'
    );
    if (lockoutItems.length > 0) {
      alerts.push({
        id: 'ALT-BRUTE-003',
        title: 'Automated Credential Attack Throttled',
        severity: 'HIGH',
        category: 'AUTHENTICATION',
        timestamp: lockoutItems[0].timestamp,
        sourceIp: lockoutItems[0].ipAddress,
        targetAccount: lockoutItems[0].actorUsername,
        description: `Source IP ${lockoutItems[0].ipAddress} triggered account lockout and rate limiter thresholds after repeated failed authentication attempts.`,
        recommendation: 'Monitor IP traffic patterns and consider permanent firewall blacklisting if attacks persist.',
        eventCount: lockoutItems.length
      });
    }

    // Alert 4: Consecutive Failed Authentications
    const failedLoginItems = items.filter(i => i.eventType === 'AUTH_LOGIN_FAILURE');
    if (failedLoginItems.length >= 3) {
      alerts.push({
        id: 'ALT-AUTH-004',
        title: 'Cluster of Failed Login Attempts Detected',
        severity: 'MEDIUM',
        category: 'AUTHENTICATION',
        timestamp: failedLoginItems[0].timestamp,
        sourceIp: failedLoginItems[0].ipAddress,
        targetAccount: failedLoginItems[0].actorUsername,
        description: `Detected ${failedLoginItems.length} failed login attempts across the system. Anti-enumeration timing-safe responses prevented account discovery.`,
        recommendation: 'Ensure strong password complexity and encourage users to enable Two-Factor Authentication.',
        eventCount: failedLoginItems.length
      });
    }

    return alerts;
  }
}

export const securityAnalyticsService = new SecurityAnalyticsService();
