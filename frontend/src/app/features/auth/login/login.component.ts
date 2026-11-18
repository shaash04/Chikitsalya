import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="login-wrapper">
      <!-- 1. Normal Password Sign In Form -->
      <div class="auth-card" *ngIf="!requires2FA">
        <div class="auth-header">
          <div class="shield-icon">🛡️</div>
          <h2>Sign In to SHMS</h2>
          <p class="subtitle">Secure Hospital Management & Healthcare Records Portal</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          <span>⚠️</span> {{ errorMessage }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="email">Hospital Email Address</label>
            <input 
              id="email" 
              type="email" 
              class="form-control" 
              [ngClass]="{ 'is-invalid': form.get('email')?.touched && form.get('email')?.invalid }"
              placeholder="e.g. admin@hospital.local" 
              formControlName="email">
            <div *ngIf="form.get('email')?.touched && form.get('email')?.invalid" class="invalid-feedback">
              Please enter a valid email address.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Account Password</label>
            <input 
              id="password" 
              type="password" 
              class="form-control" 
              [ngClass]="{ 'is-invalid': form.get('password')?.touched && form.get('password')?.invalid }"
              placeholder="••••••••••••" 
              formControlName="password">
            <div *ngIf="form.get('password')?.touched && form.get('password')?.invalid" class="invalid-feedback">
              Password is required.
            </div>
          </div>

          <button type="submit" class="btn btn-primary submit-btn" [disabled]="form.invalid || loading">
            <span *ngIf="loading">Verifying Credentials...</span>
            <span *ngIf="!loading">🔐 Sign In (HttpOnly Session)</span>
          </button>
        </form>

        <div class="demo-accounts-box">
          <div class="demo-title">⚡ Quick-Fill Demo Credentials (Academic Viva):</div>
          <div class="demo-buttons-grid">
            <button type="button" class="demo-chip admin" (click)="fillDemo('admin@hospital.local', 'Admin@Secure2026!')">
              <span class="chip-role">Admin</span>
              <span class="chip-email">admin&#64;hospital.local</span>
            </button>
            <button type="button" class="demo-chip doctor" (click)="fillDemo('dr.sharma@hospital.local', 'Doctor@Secure2026!')">
              <span class="chip-role">Cardiologist</span>
              <span class="chip-email">dr.sharma&#64;hospital.local</span>
            </button>
            <button type="button" class="demo-chip patient" (click)="fillDemo('john.doe@patient.local', 'Patient@Secure2026!')">
              <span class="chip-role">Patient A</span>
              <span class="chip-email">john.doe&#64;patient.local</span>
            </button>
            <button type="button" class="demo-chip patient" (click)="fillDemo('jane.smith@patient.local', 'Patient@Secure2026!')">
              <span class="chip-role">Patient B</span>
              <span class="chip-email">jane.smith&#64;patient.local</span>
            </button>
          </div>
        </div>

        <div class="auth-footer">
          <span>New patient?</span>
          <a routerLink="/register">Register Patient Account</a>
          <span>•</span>
          <a routerLink="/security-demo">Security Demo Center</a>
        </div>
      </div>

      <!-- 2. Two-Factor Authentication Challenge Form -->
      <div class="auth-card challenge-card" *ngIf="requires2FA">
        <div class="auth-header">
          <div class="shield-icon twofa-icon">📱</div>
          <h2>Two-Factor Challenge</h2>
          <p class="subtitle">Enter the verification code from your Authenticator app</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          <span>⚠️</span> {{ errorMessage }}
        </div>

        <div class="account-hint-box">
          <span>Verifying identity for:</span>
          <strong>{{ pendingEmail }}</strong>
        </div>

        <form (ngSubmit)="onVerify2FA()">
          <div class="form-group" *ngIf="!useRecoveryMode">
            <label class="form-label" for="otpCode">6-Digit Authenticator Code</label>
            <input 
              id="otpCode" 
              type="text" 
              class="form-control otp-input" 
              placeholder="000000" 
              maxlength="6"
              autocomplete="one-time-code"
              [(ngModel)]="twoFactorCode"
              name="otpCode">
            <small class="form-hint">Open Google Authenticator, Microsoft Authenticator, or compatible app</small>
          </div>

          <div class="form-group" *ngIf="useRecoveryMode">
            <label class="form-label" for="recCode">Single-Use Backup Recovery Code</label>
            <input 
              id="recCode" 
              type="text" 
              class="form-control otp-input recovery-input" 
              placeholder="XXXX-XXXX" 
              maxlength="16"
              [(ngModel)]="twoFactorCode"
              name="recCode">
            <small class="form-hint">Enter one of the 8 single-use codes provided during 2FA setup</small>
          </div>

          <button type="submit" class="btn btn-primary submit-btn" [disabled]="!twoFactorCode || loading">
            <span *ngIf="loading">Validating Token...</span>
            <span *ngIf="!loading">✓ Verify & Establish Secure Session</span>
          </button>

          <div class="twofa-switch-options">
            <button type="button" class="btn-text" (click)="toggleRecoveryMode()">
              {{ useRecoveryMode ? '← Use standard 6-digit TOTP code' : '🔑 Lost authenticator app? Use a backup recovery code' }}
            </button>
            <button type="button" class="btn-text text-muted" (click)="cancel2FA()">
              ✕ Cancel and return to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-height: calc(100vh - 180px);
    }
    .login-wrapper {
      width: 100%;
      max-width: 520px;
      padding: 24px;
    }
    .auth-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 36px 32px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .shield-icon {
      font-size: 2.5rem;
      background: #e0f2fe;
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px auto;
    }
    .twofa-icon {
      background: #ecfdf5;
    }
    .auth-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .subtitle {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }
    .account-hint-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      color: #475569;
    }
    .otp-input {
      font-family: monospace;
      font-size: 1.4rem;
      text-align: center;
      letter-spacing: 0.25em;
      font-weight: 700;
    }
    .recovery-input {
      font-size: 1.1rem;
      letter-spacing: 0.15em;
    }
    .form-hint {
      display: block;
      margin-top: 6px;
      font-size: 0.74rem;
      color: #64748b;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      outline: none;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 8px;
      background: #0284c7;
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      background: #0369a1;
    }
    .submit-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    .twofa-switch-options {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: center;
    }
    .btn-text {
      background: transparent;
      border: none;
      color: #0284c7;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-text:hover {
      text-decoration: underline;
    }
    .btn-text.text-muted {
      color: #64748b;
      font-weight: normal;
    }
    .demo-accounts-box {
      margin-top: 24px;
      padding: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .demo-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 10px;
    }
    .demo-buttons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .demo-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }
    .demo-chip:hover {
      border-color: #0284c7;
      background: #f0f9ff;
    }
    .chip-role {
      font-size: 0.75rem;
      font-weight: 700;
    }
    .chip-email {
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .demo-chip.admin .chip-role { color: #dc2626; }
    .demo-chip.doctor .chip-role { color: #0284c7; }
    .demo-chip.patient .chip-role { color: #16a34a; }
    .auth-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 0.85rem;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .auth-footer a {
      color: #0284c7;
      font-weight: 600;
      text-decoration: none;
    }
    .auth-footer a:hover {
      text-decoration: underline;
    }
    .alert {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }
    .alert-danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = false;
  errorMessage = '';

  // 2FA state
  requires2FA = false;
  pendingTempToken = '';
  pendingEmail = '';
  twoFactorCode = '';
  useRecoveryMode = false;

  fillDemo(email: string, pass: string) {
    this.form.patchValue({ email, password: pass });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.data?.requires2FA) {
          this.requires2FA = true;
          this.pendingTempToken = res.data.tempToken;
          this.pendingEmail = email!;
          this.twoFactorCode = '';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Login failed. Please verify credentials.';
      }
    });
  }

  onVerify2FA() {
    if (!this.twoFactorCode) return;
    this.loading = true;
    this.errorMessage = '';

    this.auth
      .loginVerify2FA(this.pendingTempToken, this.twoFactorCode, this.useRecoveryMode)
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            err.error?.error?.message || 'Verification failed. Please check your code.';
        }
      });
  }

  toggleRecoveryMode() {
    this.useRecoveryMode = !this.useRecoveryMode;
    this.twoFactorCode = '';
    this.errorMessage = '';
  }

  cancel2FA() {
    this.requires2FA = false;
    this.pendingTempToken = '';
    this.twoFactorCode = '';
    this.errorMessage = '';
  }
}
