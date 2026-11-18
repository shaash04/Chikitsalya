import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="login-wrapper">
      <div class="auth-card">
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
      margin: 0 auto;
    }
    .auth-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      padding: 36px 32px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .shield-icon {
      font-size: 2.6rem;
      margin-bottom: 8px;
    }
    .auth-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 0.88rem;
      color: #64748b;
      margin-top: 4px;
    }
    .submit-btn {
      width: 100%;
      margin-top: 10px;
      padding: 12px;
      font-size: 0.95rem;
      border-radius: 8px;
    }
    .demo-accounts-box {
      margin-top: 26px;
      padding: 16px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
    }
    .demo-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .demo-buttons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .demo-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      display: flex;
      flex-direction: column;
      transition: all 0.15s ease;
    }
    .demo-chip:hover {
      border-color: #0284c7;
      background: #f0f9ff;
      transform: translateY(-1px);
    }
    .chip-role {
      font-size: 0.75rem;
      font-weight: 700;
      color: #0f172a;
    }
    .chip-email {
      font-size: 0.68rem;
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

  fillDemo(email: string, pass: string) {
    this.form.patchValue({ email, password: pass });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Login failed. Please verify credentials.';
      }
    });
  }
}
