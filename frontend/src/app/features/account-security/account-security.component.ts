import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface ActiveSessionItem {
  sessionId: string;
  ipAddress: string;
  userAgent: string | null;
  deviceInfo: { browser: string; os: string; device: string };
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="security-page-container">
      <div class="page-header">
        <div class="header-icon">🛡️</div>
        <div>
          <h1>Account Security & Session Management</h1>
          <p class="subtitle">Two-Factor Authentication (TOTP), Active Devices & Session Governance</p>
        </div>
      </div>

      <!-- Feedback Alerts -->
      <div *ngIf="successMessage" class="alert alert-success">
        <span>✓</span> {{ successMessage }}
      </div>
      <div *ngIf="errorMessage" class="alert alert-danger">
        <span>⚠️</span> {{ errorMessage }}
      </div>

      <div class="security-grid">
        <!-- ================================================================= -->
        <!-- FEATURE 2: TWO-FACTOR AUTHENTICATION (TOTP) CARD -->
        <!-- ================================================================= -->
        <div class="sec-card">
          <div class="sec-card-header">
            <div class="card-title-box">
              <span class="card-icon">🔐</span>
              <div>
                <h2>Two-Factor Authentication (2FA)</h2>
                <p class="card-sub">Hardware/App-based TOTP verification (Google Authenticator, Microsoft Authenticator)</p>
              </div>
            </div>

            <div class="status-pill" [ngClass]="is2FAEnabled() ? 'status-enabled' : 'status-disabled'">
              <span class="dot"></span>
              <span>{{ is2FAEnabled() ? '2FA ENABLED' : '2FA DISABLED' }}</span>
            </div>
          </div>

          <div class="sec-card-body">
            <div *ngIf="!is2FAEnabled()" class="twofa-disabled-info">
              <div class="info-callout">
                <p>
                  Two-factor authentication adds an essential layer of defense to your healthcare account. Even if your password is compromised, attackers cannot access patient health information or administrative controls without your physical authenticator device.
                </p>
              </div>

              <div class="features-list">
                <div class="feature-bullet">✓ RFC 6238 Time-Based One-Time Passwords (30s rotation)</div>
                <div class="feature-bullet">✓ AES-256 encrypted cryptographic secret storage at rest</div>
                <div class="feature-bullet">✓ 8 single-use cryptographically hashed backup recovery codes</div>
                <div class="feature-bullet">✓ Compatible with Google Authenticator, Microsoft Authenticator, 1Password</div>
              </div>

              <button class="btn btn-primary btn-lg mt-3" (click)="openSetupModal()" [disabled]="loading()">
                <span>📲</span> Enable Two-Factor Authentication
              </button>
            </div>

            <div *ngIf="is2FAEnabled()" class="twofa-enabled-info">
              <div class="protection-box">
                <div class="shield-green">🛡️</div>
                <div class="shield-text">
                  <h4>Your Account is Protected</h4>
                  <p>A 6-digit TOTP verification code is required each time you authenticate from an unrecognized browser or after session timeout.</p>
                </div>
              </div>

              <div class="twofa-actions">
                <button class="btn btn-outline-danger" (click)="openDisableModal()">
                  Disable Two-Factor Authentication
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- FEATURE 3: ACTIVE SESSIONS & DEVICE MANAGEMENT CARD -->
        <!-- ================================================================= -->
        <div class="sec-card">
          <div class="sec-card-header">
            <div class="card-title-box">
              <span class="card-icon">💻</span>
              <div>
                <h2>Active Sessions & Device Registry</h2>
                <p class="card-sub">Inspect and revoke authenticated sessions across all devices</p>
              </div>
            </div>

            <button class="btn btn-sm btn-outline-danger" (click)="openRevokeAllModal()" [disabled]="sessions().length <= 1">
              Revoke All Other Devices
            </button>
          </div>

          <div class="sec-card-body">
            <div class="session-list">
              <div *ngFor="let s of sessions()" class="session-item" [class.current-session]="s.isCurrent">
                <div class="device-icon">
                  <span *ngIf="s.deviceInfo.device === 'Mobile'">📱</span>
                  <span *ngIf="s.deviceInfo.device === 'Tablet'">📟</span>
                  <span *ngIf="s.deviceInfo.device !== 'Mobile' && s.deviceInfo.device !== 'Tablet'">💻</span>
                </div>

                <div class="session-details">
                  <div class="device-title-row">
                    <strong class="device-name">{{ s.deviceInfo.browser }} on {{ s.deviceInfo.os }}</strong>
                    <span *ngIf="s.isCurrent" class="current-badge">THIS DEVICE</span>
                  </div>

                  <div class="session-meta-row">
                    <span class="meta-item"><strong>IP:</strong> <code>{{ s.ipAddress }}</code></span>
                    <span class="meta-item"><strong>Logged In:</strong> {{ formatDateTime(s.createdAt) }}</span>
                    <span class="meta-item"><strong>Last Active:</strong> {{ getRelativeTime(s.lastActiveAt) }}</span>
                  </div>
                </div>

                <div class="session-actions">
                  <button *ngIf="!s.isCurrent" class="btn btn-sm btn-outline-danger" (click)="revokeIndividualSession(s.sessionId)">
                    Revoke
                  </button>
                  <span *ngIf="s.isCurrent" class="active-indicator">Active Now</span>
                </div>
              </div>

              <div *ngIf="sessions().length === 0" class="no-sessions">
                Loading session registry...
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 1: 2FA ENROLLMENT WIZARD -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showSetupModal" (click)="closeSetupModal()">
        <div class="modal-dialog setup-wizard-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Two-Factor Authentication Enrollment</h3>
            <button class="close-btn" (click)="closeSetupModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="wizard-steps-indicator">
              <span class="step-pill active">1. Scan QR</span>
              <span class="step-arrow">→</span>
              <span class="step-pill active">2. Save Recovery Codes</span>
              <span class="step-arrow">→</span>
              <span class="step-pill active">3. Confirm Code</span>
            </div>

            <!-- Step 1: Scan QR Code -->
            <div class="wizard-step">
              <h4 class="step-title">Step 1: Scan with Authenticator App</h4>
              <p class="step-desc">Open Google Authenticator, Microsoft Authenticator, or another TOTP app and scan this barcode:</p>

              <div class="qr-container" *ngIf="setupData">
                <img [src]="setupData.qrCodeDataUrl" alt="TOTP Enrollment QR Code" class="qr-image" />
                <div class="secret-text-box">
                  <span class="secret-label">Can't scan? Enter secret manually:</span>
                  <code class="secret-code">{{ setupData.secret }}</code>
                </div>
              </div>
            </div>

            <!-- Step 2: Recovery Codes -->
            <div class="wizard-step mt-4">
              <h4 class="step-title">Step 2: Emergency Single-Use Recovery Codes</h4>
              <p class="step-desc">
                Save these 8 recovery codes in a secure location (e.g. password vault). If you lose access to your authenticator device, each code can be used <strong>once</strong> to regain access.
              </p>

              <div class="recovery-codes-grid" *ngIf="setupData">
                <div *ngFor="let code of setupData.recoveryCodes" class="recovery-code-chip">
                  <code>{{ code }}</code>
                </div>
              </div>
            </div>

            <!-- Step 3: Verification Code -->
            <div class="wizard-step mt-4">
              <h4 class="step-title">Step 3: Confirm 6-Digit Code</h4>
              <p class="step-desc">Enter the 6-digit code currently displayed in your authenticator app to verify setup:</p>

              <div class="form-group">
                <input 
                  type="text" 
                  [(ngModel)]="verificationCode" 
                  placeholder="000000" 
                  maxlength="6" 
                  class="form-control otp-verify-input" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeSetupModal()">Cancel</button>
            <button class="btn btn-primary" (click)="confirmEnable2FA()" [disabled]="!verificationCode || verificationCode.length !== 6 || loading()">
              <span *ngIf="loading()">Enabling...</span>
              <span *ngIf="!loading()">Activate Two-Factor Authentication</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 2: DISABLE 2FA CONFIRMATION -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showDisableModal" (click)="closeDisableModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Disable Two-Factor Authentication</h3>
            <button class="close-btn" (click)="closeDisableModal()">✕</button>
          </div>

          <div class="modal-body">
            <p class="warning-text">
              ⚠️ Warning: Disabling 2FA reduces account security. You will only require a password to sign in.
            </p>

            <div class="form-group mt-3">
              <label class="form-label">Current Account Password</label>
              <input type="password" [(ngModel)]="disablePassword" placeholder="••••••••••••" class="form-control" />
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Current 6-Digit Code or Backup Recovery Code</label>
              <input type="text" [(ngModel)]="disableCode" placeholder="000000 or XXXX-XXXX" class="form-control" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeDisableModal()">Cancel</button>
            <button class="btn btn-danger" (click)="confirmDisable2FA()" [disabled]="!disablePassword || !disableCode || loading()">
              Confirm & Disable 2FA
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 3: REVOKE ALL SESSIONS CONFIRMATION -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showRevokeAllModal" (click)="closeRevokeAllModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Revoke All Other Sessions?</h3>
            <button class="close-btn" (click)="closeRevokeAllModal()">✕</button>
          </div>

          <div class="modal-body">
            <p>
              This will immediately terminate all active sessions across other devices and browsers. Those sessions will no longer be valid for making API requests. Your current session will remain active.
            </p>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeRevokeAllModal()">Cancel</button>
            <button class="btn btn-danger" (click)="confirmRevokeAllSessions()" [disabled]="loading()">
              Revoke All Other Devices
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 24px 32px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-icon {
      font-size: 2.2rem;
      background: #e0f2fe;
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-header h1 {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 0.88rem;
      color: #64748b;
      margin: 0;
    }
    .security-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .sec-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }
    .sec-card-header {
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafafa;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-icon {
      font-size: 1.6rem;
    }
    .card-title-box h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .card-sub {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0;
    }
    .sec-card-body {
      padding: 24px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .status-enabled {
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #15803d;
    }
    .status-enabled .dot {
      width: 8px;
      height: 8px;
      background: #16a34a;
      border-radius: 50%;
    }
    .status-disabled {
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #b45309;
    }
    .status-disabled .dot {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
    }
    .info-callout {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 0.88rem;
      color: #166534;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .features-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      font-size: 0.82rem;
      color: #334155;
      margin-bottom: 20px;
    }
    .protection-box {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .shield-green {
      font-size: 2.2rem;
    }
    .shield-text h4 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .shield-text p {
      font-size: 0.82rem;
      color: #64748b;
      margin: 0;
    }
    /* Sessions */
    .session-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .session-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .session-item.current-session {
      border-color: #0284c7;
      background: #f0f9ff;
    }
    .device-icon {
      font-size: 1.8rem;
      width: 44px;
      height: 44px;
      background: #f1f5f9;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .session-details {
      flex: 1;
    }
    .device-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .device-name {
      font-size: 0.95rem;
      color: #0f172a;
    }
    .current-badge {
      background: #0284c7;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .session-meta-row {
      display: flex;
      gap: 16px;
      font-size: 0.78rem;
      color: #64748b;
      flex-wrap: wrap;
    }
    .meta-item code {
      color: #0284c7;
      font-size: 0.82rem;
    }
    .active-indicator {
      font-size: 0.78rem;
      font-weight: 700;
      color: #16a34a;
    }
    /* Modal styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .setup-wizard-dialog {
      max-width: 620px;
    }
    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #64748b;
    }
    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }
    .wizard-steps-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .step-pill.active {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 10px;
      border-radius: 9999px;
    }
    .step-arrow {
      color: #94a3b8;
    }
    .step-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .step-desc {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0 0 12px 0;
    }
    .qr-container {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .qr-image {
      width: 130px;
      height: 130px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .secret-text-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .secret-label {
      font-size: 0.75rem;
      color: #64748b;
    }
    .secret-code {
      font-size: 0.9rem;
      color: #0284c7;
      word-break: break-all;
      background: #ffffff;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      user-select: all;
    }
    .recovery-codes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: #f8fafc;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .recovery-code-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      text-align: center;
    }
    .recovery-code-chip code {
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.05em;
    }
    .otp-verify-input {
      font-family: monospace;
      font-size: 1.3rem;
      text-align: center;
      letter-spacing: 0.25em;
      font-weight: 700;
      width: 180px;
      margin: 0 auto;
      display: block;
    }
    .warning-text {
      font-size: 0.85rem;
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 12px;
      border-radius: 8px;
      margin: 0;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: 0.75rem;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid #cbd5e1;
      color: #475569;
    }
    .btn-outline:hover {
      background: #f8fafc;
    }
    .btn-outline-danger {
      background: transparent;
      border: 1px solid #fca5a5;
      color: #dc2626;
    }
    .btn-outline-danger:hover:not(:disabled) {
      background: #fef2f2;
    }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 4px;
    }
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.9rem;
      box-sizing: border-box;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }
    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .alert-danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
  `]
})
export class AccountSecurityComponent implements OnInit {
  is2FAEnabled = signal<boolean>(false);
  sessions = signal<ActiveSessionItem[]>([]);
  loading = signal<boolean>(false);

  successMessage = '';
  errorMessage = '';

  // Setup Modal State
  showSetupModal = false;
  setupData: any = null;
  verificationCode = '';

  // Disable Modal State
  showDisableModal = false;
  disablePassword = '';
  disableCode = '';

  // Revoke All Modal State
  showRevokeAllModal = false;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.loadSecurityStatus();
    this.loadActiveSessions();
  }

  loadSecurityStatus(): void {
    this.auth.get2FAStatus().subscribe({
      next: res => {
        if (res.success) {
          this.is2FAEnabled.set(res.data.enabled);
        }
      }
    });
  }

  loadActiveSessions(): void {
    this.auth.getActiveSessions().subscribe({
      next: res => {
        if (res.success) {
          this.sessions.set(res.data);
        }
      }
    });
  }

  openSetupModal(): void {
    this.loading.set(true);
    this.errorMessage = '';
    this.successMessage = '';
    this.verificationCode = '';

    this.auth.setup2FA().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) {
          this.setupData = res.data;
          this.showSetupModal = true;
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage = err.error?.error?.message || 'Failed to initiate 2FA setup.';
      }
    });
  }

  closeSetupModal(): void {
    this.showSetupModal = false;
    this.setupData = null;
    this.verificationCode = '';
  }

  confirmEnable2FA(): void {
    if (!this.setupData || !this.verificationCode) return;
    this.loading.set(true);
    this.errorMessage = '';

    this.auth
      .enable2FA(this.setupData.secret, this.verificationCode, this.setupData.hashedRecoveryCodes)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.is2FAEnabled.set(true);
          this.showSetupModal = false;
          this.successMessage = 'Two-Factor Authentication has been successfully enabled on your account!';
        },
        error: err => {
          this.loading.set(false);
          this.errorMessage = err.error?.error?.message || 'Invalid 6-digit code. Check your authenticator app.';
        }
      });
  }

  openDisableModal(): void {
    this.disablePassword = '';
    this.disableCode = '';
    this.errorMessage = '';
    this.showDisableModal = true;
  }

  closeDisableModal(): void {
    this.showDisableModal = false;
  }

  confirmDisable2FA(): void {
    this.loading.set(true);
    this.errorMessage = '';

    this.auth.disable2FA(this.disablePassword, this.disableCode).subscribe({
      next: () => {
        this.loading.set(false);
        this.is2FAEnabled.set(false);
        this.showDisableModal = false;
        this.successMessage = 'Two-Factor Authentication has been disabled.';
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage = err.error?.error?.message || 'Failed to disable 2FA. Verify password and code.';
      }
    });
  }

  revokeIndividualSession(sessionId: string): void {
    if (!confirm('Are you sure you want to revoke this session?')) return;

    this.auth.revokeSession(sessionId).subscribe({
      next: () => {
        this.successMessage = 'Session revoked successfully.';
        this.loadActiveSessions();
      },
      error: err => {
        this.errorMessage = err.error?.error?.message || 'Failed to revoke session.';
      }
    });
  }

  openRevokeAllModal(): void {
    this.showRevokeAllModal = true;
  }

  closeRevokeAllModal(): void {
    this.showRevokeAllModal = false;
  }

  confirmRevokeAllSessions(): void {
    this.loading.set(true);
    this.auth.revokeOtherSessions().subscribe({
      next: res => {
        this.loading.set(false);
        this.showRevokeAllModal = false;
        this.successMessage = res.message || 'All other sessions have been revoked.';
        this.loadActiveSessions();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage = err.error?.error?.message || 'Failed to revoke other sessions.';
      }
    });
  }

  formatDateTime(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }

  getRelativeTime(isoString: string): string {
    if (!isoString) return '';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
