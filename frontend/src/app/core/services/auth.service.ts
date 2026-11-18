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
    return this.http.post<{ success: boolean; data: { user: User } }>(
      `${this.apiUrl}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res && res.success && res.data.user) {
          this.currentUser.set(res.data.user);
          this.refreshCsrfToken().subscribe();
          this.redirectBasedOnRole(res.data.user.role);
        }
      })
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
