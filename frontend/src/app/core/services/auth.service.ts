import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';

export interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  fullName: string;
  phone?: string | null;
  profile?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = typeof window !== 'undefined' && window.location.port === '4200' ? 'http://localhost:4000/api' : '/api';

  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);
  userRole = computed(() => this.currentUser()?.role || null);
  csrfToken = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.refreshCsrfToken().subscribe();
    this.checkSession().subscribe();
  }

  refreshCsrfToken(): Observable<any> {
    return this.http.get<{ success: boolean; csrfToken: string }>(`${this.apiUrl}/csrf-token`, { withCredentials: true }).pipe(
      tap(res => {
        if (res && res.success && res.csrfToken) {
          this.csrfToken.set(res.csrfToken);
        }
      }),
      catchError(() => of(null))
    );
  }

  checkSession(): Observable<boolean> {
    return this.http.get<{ success: boolean; authenticated: boolean; user: User | null }>(
      `${this.apiUrl}/auth/session`,
      { withCredentials: true }
    ).pipe(
      map(res => {
        if (res && res.success && res.authenticated && res.user) {
          this.currentUser.set(res.user);
          return true;
        } else {
          this.currentUser.set(null);
          return false;
        }
      }),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<{ success: boolean; data: { user: User; requires2FA?: boolean; tempToken?: string } }>(
      `${this.apiUrl}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res && res.success && res.data && !res.data.requires2FA && res.data.user) {
          this.currentUser.set(res.data.user);
          this.refreshCsrfToken().subscribe();
          this.redirectBasedOnRole(res.data.user.role);
        }
      })
    );
  }

  loginVerify2FA(tempToken: string, code: string, isRecoveryCode: boolean = false): Observable<any> {
    return this.http.post<{ success: boolean; data: { user: User } }>(
      `${this.apiUrl}/auth/login/2fa`,
      { tempToken, code, isRecoveryCode },
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res && res.success && res.data?.user) {
          this.currentUser.set(res.data.user);
          this.refreshCsrfToken().subscribe();
          this.redirectBasedOnRole(res.data.user.role);
        }
      })
    );
  }

  get2FAStatus(): Observable<{ success: boolean; data: { enabled: boolean; hasRecoveryCodes: boolean } }> {
    return this.http.get<{ success: boolean; data: { enabled: boolean; hasRecoveryCodes: boolean } }>(
      `${this.apiUrl}/auth/2fa/status`,
      { withCredentials: true }
    );
  }

  setup2FA(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/2fa/setup`, {}, { withCredentials: true });
  }

  enable2FA(secret: string, code: string, recoveryCodes: any[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/auth/2fa/enable`,
      { secret, code, recoveryCodes },
      { withCredentials: true }
    );
  }

  disable2FA(password: string, code: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/auth/2fa/disable`,
      { password, code },
      { withCredentials: true }
    );
  }

  getActiveSessions(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.apiUrl}/auth/sessions`,
      { withCredentials: true }
    );
  }

  revokeSession(sessionId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/auth/sessions/${sessionId}`,
      { withCredentials: true }
    );
  }

  revokeOtherSessions(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/auth/sessions/revoke-others`,
      {},
      { withCredentials: true }
    );
  }

  registerPatient(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, data, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.router.navigate(['/login']);
        return of(null);
      })
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/change-password`, data, { withCredentials: true });
  }

  redirectBasedOnRole(role: string) {
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'doctor') {
      this.router.navigate(['/doctor/dashboard']);
    } else {
      this.router.navigate(['/patient/dashboard']);
    }
  }
}
