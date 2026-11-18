import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SecurityDemoService {
  private readonly baseUrl = typeof window !== 'undefined' && window.location.port === '4200' ? 'http://localhost:4000/api/security-demo' : '/api/security-demo';

  constructor(private http: HttpClient) {}

  getFeatures(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/features`);
  }

  testPasswordHash(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-password-hash`, {});
  }

  testSqlInjection(payload?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-sqli`, { payload });
  }

  testXss(payload?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-xss`, { payload });
  }

  testCsrf(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-csrf`, {});
  }

  testIdor(recordId: number, role: string, userId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-idor`, { recordId, role, userId });
  }

  getSecurityHeaders(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/test-headers`);
  }

  getAuditLogsSample(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/test-audit`);
  }

  getSecureConfig(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/test-config`);
  }

  testWaf(payload: string, category?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-waf`, { payload, category });
  }
}
