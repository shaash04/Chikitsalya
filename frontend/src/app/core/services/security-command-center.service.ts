import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SecurityOverviewMetrics {
  totalRequestsAnalyzed: number;
  suspiciousRequestsDetected: number;
  blockedAttacks: number;
  failedLoginAttempts: number;
  activeUserSessions: number;
  criticalSecurityAlerts: number;
  systemStatus: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
}

export interface TimelineDataPoint {
  timeLabel: string;
  timestamp: string;
  totalEvents: number;
  blockedAttacks: number;
  suspiciousEvents: number;
}

export interface CategoryDistribution {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SeverityDistribution {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  count: number;
  percentage: number;
}

export interface LoginStatistics {
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  lockoutsTriggered: number;
  failureRatePercentage: number;
}

export interface ThreatAnalytics {
  timeline: TimelineDataPoint[];
  categories: CategoryDistribution[];
  severities: SeverityDistribution[];
  loginStats: LoginStatistics;
}

export interface SecurityEventItem {
  id: number;
  timestamp: string;
  eventType: string;
  category: string;
  actorUsername: string;
  actorRole: string;
  ipAddress: string;
  userAgent?: string | null;
  resourceType: string;
  resourceId?: string | null;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionTaken: 'ALLOWED' | 'BLOCKED' | 'REJECTED';
  correlationId: string;
  details: string;
  metadata?: Record<string, any> | null;
}

export interface SecurityAlert {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  timestamp: string;
  sourceIp: string;
  targetAccount?: string | null;
  description: string;
  recommendation: string;
  eventCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityCommandCenterService {
  private readonly apiUrl =
    typeof window !== 'undefined' && window.location.port === '4200' ? 'http://localhost:4000/api' : '/api';

  constructor(private http: HttpClient) {}

  getOverview(): Observable<{ success: boolean; data: SecurityOverviewMetrics }> {
    return this.http.get<{ success: boolean; data: SecurityOverviewMetrics }>(
      `${this.apiUrl}/admin/security/overview`,
      { withCredentials: true }
    );
  }

  getAnalytics(): Observable<{ success: boolean; data: ThreatAnalytics }> {
    return this.http.get<{ success: boolean; data: ThreatAnalytics }>(
      `${this.apiUrl}/admin/security/analytics`,
      { withCredentials: true }
    );
  }

  getEvents(filter?: {
    severity?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Observable<{ success: boolean; data: SecurityEventItem[]; meta: any }> {
    let params = new HttpParams();
    if (filter?.severity && filter.severity !== 'ALL') {
      params = params.set('severity', filter.severity);
    }
    if (filter?.category && filter.category !== 'ALL') {
      params = params.set('category', filter.category);
    }
    if (filter?.search) {
      params = params.set('search', filter.search);
    }
    if (filter?.limit) {
      params = params.set('limit', filter.limit.toString());
    }

    return this.http.get<{ success: boolean; data: SecurityEventItem[]; meta: any }>(
      `${this.apiUrl}/admin/security/events`,
      { params, withCredentials: true }
    );
  }

  getAlerts(): Observable<{ success: boolean; data: SecurityAlert[] }> {
    return this.http.get<{ success: boolean; data: SecurityAlert[] }>(
      `${this.apiUrl}/admin/security/alerts`,
      { withCredentials: true }
    );
  }
}
