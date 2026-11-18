import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WafRule {
  id: string;
  name: string;
  category: string;
  severity: string;
  description: string;
  enabled: boolean;
  mode: 'BLOCK' | 'DETECT_ONLY';
}

export interface WafDetectedEvent {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  category: string;
  sourceIp: string;
  path: string;
  actionTaken: 'BLOCKED' | 'DETECTED';
  location: string;
  snippet: string;
}

export interface WafOverviewData {
  totalInspectedRequests: number;
  totalBlockedRequests: number;
  activeRulesCount: number;
  rules: WafRule[];
  recentDetections: WafDetectedEvent[];
}

export interface WafSimulationResult {
  payload: string;
  category?: string;
  inspected: boolean;
  blocked: boolean;
  detected: boolean;
  ruleMatched?: {
    id: string;
    name: string;
    category: string;
    severity: string;
    mode: string;
  } | null;
  matchedPattern?: string;
  defenseExplanation: string;
}

@Injectable({
  providedIn: 'root'
})
export class WafService {
  private readonly apiUrl =
    typeof window !== 'undefined' && window.location.port === '4200' ? 'http://localhost:4000/api' : '/api';

  constructor(private http: HttpClient) {}

  getOverview(): Observable<{ success: boolean; data: WafOverviewData }> {
    return this.http.get<{ success: boolean; data: WafOverviewData }>(
      `${this.apiUrl}/admin/waf/overview`,
      { withCredentials: true }
    );
  }

  updateRule(ruleId: string, updates: { enabled?: boolean; mode?: 'BLOCK' | 'DETECT_ONLY' }): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/admin/waf/rules/${ruleId}`,
      updates,
      { withCredentials: true }
    );
  }

  simulateAttack(payload: string, category?: string): Observable<{ success: boolean; data: WafSimulationResult }> {
    return this.http.post<{ success: boolean; data: WafSimulationResult }>(
      `${this.apiUrl}/security-demo/test-waf`,
      { payload, category },
      { withCredentials: true }
    );
  }
}
