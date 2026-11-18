import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card register-card">
        <div class="auth-header">
          <div class="shield-icon">🏥</div>
          <h2>Patient Portal Registration</h2>
          <p class="subtitle">Create your encrypted patient health profile</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          <span>⚠️</span> {{ errorMessage }}
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          <span>✅</span> {{ successMessage }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="fullName">Full Legal Name *</label>
              <input id="fullName" class="form-control" placeholder="e.g. Eleanor Vance" formControlName="fullName">
            </div>
            <div class="form-group">
              <label class="form-label" for="username">Username *</label>
              <input id="username" class="form-control" placeholder="e.g. eleanor_v" formControlName="username">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="email">Email Address *</label>
              <input id="email" type="email" class="form-control" placeholder="eleanor@example.com" formControlName="email">
            </div>
            <div class="form-group">
              <label class="form-label" for="phone">Phone Number</label>
              <input id="phone" class="form-control" placeholder="+1-555-0199" formControlName="phone">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password (Minimum 8 chars with Upper, Lower, Number & Symbol) *</label>
            <input id="password" type="password" class="form-control" placeholder="••••••••••••" formControlName="password">
            <div class="password-meter" *ngIf="form.get('password')?.value">
              <div class="req" [class.met]="hasLength">✓ Min 8 chars</div>
              <div class="req" [class.met]="hasUpper">✓ Uppercase</div>
              <div class="req" [class.met]="hasLower">✓ Lowercase</div>
              <div class="req" [class.met]="hasNumber">✓ Number</div>
              <div class="req" [class.met]="hasSymbol">✓ Symbol</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="dateOfBirth">Date of Birth *</label>
              <input id="dateOfBirth" type="date" class="form-control" formControlName="dateOfBirth">
            </div>
            <div class="form-group">
              <label class="form-label" for="gender">Gender *</label>
              <select id="gender" class="form-control" formControlName="gender">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="bloodGroup">Blood Group *</label>
              <select id="bloodGroup" class="form-control" formControlName="bloodGroup">
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="emergencyContact">Emergency Contact (Name & Phone) *</label>
              <input id="emergencyContact" class="form-control" placeholder="e.g. Thomas Vance (+1-555-0198)" formControlName="emergencyContact">
            </div>
            <div class="form-group">
              <label class="form-label" for="address">Residential Address *</label>
              <input id="address" class="form-control" placeholder="Street, City, State" formControlName="address">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="allergies">Known Drug Allergies</label>
              <input id="allergies" class="form-control" placeholder="e.g. Penicillin, Aspirin (optional)" formControlName="allergies">
            </div>
            <div class="form-group">
              <label class="form-label" for="medicalHistory">Prior Medical Conditions</label>
              <input id="medicalHistory" class="form-control" placeholder="e.g. Asthma, Diabetes (optional)" formControlName="medicalHistory">
            </div>
          </div>

          <div class="security-notice">
            🔒 <strong>Least Privilege Notice:</strong> Public registration is strictly restricted to Patients. Doctor and Administrator credentials must be provisioned through controlled administrative approval.
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="form.invalid || loading">
            <span *ngIf="loading">Creating Account...</span>
            <span *ngIf="!loading">Create Patient Account</span>
          </button>
        </form>

        <div class="auth-footer">
          <span>Already registered?</span>
          <a routerLink="/login">Sign In here</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 85vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .register-card {
      max-width: 680px !important;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 36px 32px;
      box-shadow: var(--shadow-lg);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .shield-icon {
      font-size: 2.2rem;
      margin-bottom: 8px;
    }
    .w-full {
      width: 100%;
      margin-top: 14px;
      padding: 12px;
    }
    .security-notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid var(--primary);
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #475569;
      margin-top: 10px;
    }
    .password-meter {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 6px;
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .password-meter .req.met {
      color: var(--success);
      font-weight: 700;
    }
    .auth-footer {
      margin-top: 20px;
      text-align: center;
      font-size: 0.85rem;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .auth-footer a {
      color: var(--primary);
      font-weight: 600;
      text-decoration: none;
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    dateOfBirth: ['1995-05-15', [Validators.required]],
    gender: ['female', [Validators.required]],
    bloodGroup: ['O+', [Validators.required]],
    emergencyContact: ['', [Validators.required]],
    address: ['', [Validators.required]],
    allergies: [''],
    medicalHistory: ['']
  });

  get passwordVal() {
    return this.form.get('password')?.value || '';
  }
  get hasLength() { return this.passwordVal.length >= 8; }
  get hasUpper() { return /[A-Z]/.test(this.passwordVal); }
  get hasLower() { return /[a-z]/.test(this.passwordVal); }
  get hasNumber() { return /[0-9]/.test(this.passwordVal); }
  get hasSymbol() { return /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(this.passwordVal); }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.registerPatient(this.form.value).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage = `Registration successful! Patient Code: ${res.data.patientCode}. Redirecting to sign in...`;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Registration failed. Check inputs.';
      }
    });
  }
}
