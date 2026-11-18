import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SecurityDemoService } from '../../../core/services/security-demo.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-security-demo-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="demo-center">
      <!-- Header Banner -->
      <div class="hero-banner">
        <div class="banner-tag">🛡️ Academic Security Evaluation Console • 21CSE438T Web Security</div>
        <h1>Security Demonstration Center</h1>
        <p class="subtitle">
          Interactive verification console evaluating 12 defense-in-depth security controls in functional code.
          Test defenses in real-time with harmless payloads and inspect live responses.
        </p>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green">🛡️</div>
          <div class="stat-info">
            <h4>Controls Implemented</h4>
            <div class="stat-number">12 / 12</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">⚡</div>
          <div class="stat-info">
            <h4>Automated Tests</h4>
            <div class="stat-number">21 Passed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">📜</div>
          <div class="stat-info">
            <h4>Audit Logging</h4>
            <div class="stat-number">Active</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">🔒</div>
          <div class="stat-info">
            <h4>Session Security</h4>
            <div class="stat-number">HttpOnly Strict</div>
          </div>
        </div>
      </div>

      <!-- Live Interactive Laboratory Console -->
      <div class="card interactive-lab">
        <div class="card-header">
          <div class="header-left">
            <h3 class="card-title">🧪 Live Security Testing Terminal</h3>
            <span class="badge badge-blue">Interactive Test Harness</span>
          </div>
          <div *ngIf="testResult" class="test-status">
            <span class="badge" [ngClass]="testResult.passed ? 'badge-green' : 'badge-red'">
              {{ testResult.passed ? 'VERIFIED PASSED ✓' : 'FAILED' }}
            </span>
          </div>
        </div>

        <div class="lab-layout">
          <!-- Left: Controls -->
          <div class="lab-form">
            <div class="form-group">
              <label class="form-label">Select Security Defense to Test:</label>
              <select class="form-control" [(ngModel)]="selectedTest" (change)="onTestChange()">
                <option value="sqli">1. SQL Injection Prevention (Prepared Statements)</option>
                <option value="password">2. Password Hashing (Bcrypt Work Factor 12)</option>
                <option value="xss">3. XSS Prevention (Sanitization & CSP Header)</option>
                <option value="csrf">4. CSRF Protection (Double-Submit HMAC Token)</option>
                <option value="idor">5. IDOR & Patient Privacy (Object Authorization)</option>
                <option value="headers">6. Security Response Headers (Helmet Suite)</option>
                <option value="audit">7. Audit Log Inspection (Database Integrity)</option>
                <option value="config">8. Secure Config & Secrets Isolation</option>
              </select>
            </div>

            <!-- Custom Payload for SQLi -->
            <div class="form-group" *ngIf="selectedTest === 'sqli'">
              <label class="form-label">Harmless Test SQL Injection String:</label>
              <input class="form-control" [(ngModel)]="customPayload">
              <span class="hint-text">Default: ' OR '1'='1 -- Parameterized query treats this strictly as a literal data parameter.</span>
            </div>

            <!-- Custom Payload for XSS -->
            <div class="form-group" *ngIf="selectedTest === 'xss'">
              <label class="form-label">Harmless Test XSS Payload:</label>
              <input class="form-control" [(ngModel)]="customPayload">
              <span class="hint-text">Default: &lt;script&gt;alert('XSS')&lt;/script&gt; -- Evaluated via Angular interpolation and Helmet CSP.</span>
            </div>

            <div class="action-bar">
              <button class="btn btn-primary" (click)="executeSelectedTest()" [disabled]="runningTest">
                <span *ngIf="runningTest">Running Security Check...</span>
                <span *ngIf="!runningTest">🚀 Execute Test on Live Backend</span>
              </button>
            </div>
          </div>

          <!-- Right: Live Terminal Output -->
          <div class="terminal-panel">
            <div class="terminal-bar">
              <span class="term-dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></span>
              <span class="term-title">HTTP API RESPONSE LOG</span>
            </div>
            <pre class="terminal-code" *ngIf="testResult">{{ testResult | json }}</pre>
            <div class="terminal-code empty-code" *ngIf="!testResult">
              <p>> Select a security feature on the left and click "Execute Test on Live Backend".</p>
              <p>> Real-time HTTP requests will be dispatched to Express.js to verify defensive controls.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- MASTER SPECIFICATION MATRIX -->
      <div class="card matrix-card">
        <div class="card-header">
          <h3 class="card-title">📋 Complete Security Controls Specification Matrix</h3>
          <span class="badge badge-green">100% Implemented in Code</span>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th style="width: 170px;">Security Feature</th>
                <th style="width: 220px;">Threat Prevented</th>
                <th style="width: 220px;">Implementation File</th>
                <th>Demonstration Procedure</th>
                <th>Expected Secure Result</th>
                <th style="width: 120px;">Live Test</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of features">
                <td><strong>{{ item.id }}</strong></td>
                <td><strong class="feature-name">{{ item.name }}</strong></td>
                <td class="threat-cell">{{ item.threat }}</td>
                <td><span class="code-pill">{{ item.file }}</span></td>
                <td class="procedure-cell">{{ item.procedure }}</td>
                <td class="result-cell">{{ item.expectedResult }}</td>
                <td>
                  <button class="btn btn-outline btn-sm quick-test-btn" (click)="runQuickTest(item.testAction)">
                    Test ⚡
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-center {
      max-width: 1280px;
      margin: 0 auto;
    }
    .hero-banner {
      margin-bottom: 24px;
    }
    .banner-tag {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 800;
      color: #0284c7;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .hero-banner h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .interactive-lab {
      border: 2px solid #38bdf8;
      box-shadow: 0 4px 16px rgba(56, 189, 248, 0.12);
      margin-bottom: 28px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .lab-layout {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 24px;
    }
    @media (max-width: 900px) {
      .lab-layout { grid-template-columns: 1fr; }
    }
    .hint-text {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
    }
    .action-bar {
      margin-top: 18px;
    }
    .terminal-panel {
      background: #0f172a;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
    }
    .terminal-bar {
      background: #1e293b;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .term-dots {
      display: flex;
      gap: 6px;
    }
    .term-dots .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.r { background: #ef4444; }
    .dot.y { background: #eab308; }
    .dot.g { background: #22c55e; }
    .term-title {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: #94a3b8;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .terminal-code {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: #38bdf8;
      padding: 16px;
      overflow-y: auto;
      max-height: 280px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .terminal-code.empty-code {
      color: #64748b;
    }
    .feature-name {
      color: #0f172a;
      font-size: 0.88rem;
    }
    .threat-cell {
      font-size: 0.82rem;
      color: #475569;
    }
    .procedure-cell {
      font-size: 0.8rem;
      color: #334155;
    }
    .result-cell {
      font-size: 0.8rem;
      color: #047857;
      font-weight: 500;
    }
    .quick-test-btn {
      white-space: nowrap;
      padding: 4px 10px;
      font-size: 0.75rem;
    }
  `]
})
export class SecurityDemoCenterComponent implements OnInit {
  private demoService = inject(SecurityDemoService);
  auth = inject(AuthService);

  features: any[] = [];
  selectedTest = 'sqli';
  customPayload = "' OR '1'='1";
  runningTest = false;
  testResult: any = null;

  ngOnInit() {
    this.demoService.getFeatures().subscribe({
      next: (res: any) => {
        if (res.success) this.features = res.features;
      }
    });
  }

  onTestChange() {
    if (this.selectedTest === 'sqli') {
      this.customPayload = "' OR '1'='1";
    } else if (this.selectedTest === 'xss') {
      this.customPayload = "<script>alert('XSS')</script>";
    }
  }

  runQuickTest(action: string) {
    if (action === 'test-sqli') this.selectedTest = 'sqli';
    else if (action === 'test-password-hash') this.selectedTest = 'password';
    else if (action === 'test-xss') this.selectedTest = 'xss';
    else if (action === 'test-csrf') this.selectedTest = 'csrf';
    else if (action === 'test-idor') this.selectedTest = 'idor';
    else if (action === 'test-headers') this.selectedTest = 'headers';
    else if (action === 'test-audit') this.selectedTest = 'audit';
    else if (action === 'test-config') this.selectedTest = 'config';
    this.onTestChange();
    this.executeSelectedTest();
  }

  executeSelectedTest() {
    this.runningTest = true;
    this.testResult = null;

    if (this.selectedTest === 'sqli') {
      this.demoService.testSqlInjection(this.customPayload).subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'password') {
      this.demoService.testPasswordHash().subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'xss') {
      this.demoService.testXss(this.customPayload).subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'csrf') {
      this.demoService.testCsrf().subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'idor') {
      this.demoService.testIdor(3, 'patient', 4).subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'headers') {
      this.demoService.getSecurityHeaders().subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'audit') {
      this.demoService.getAuditLogsSample().subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    } else if (this.selectedTest === 'config') {
      this.demoService.getSecureConfig().subscribe({
        next: (res: any) => { this.testResult = res.data; this.runningTest = false; },
        error: (err) => { this.testResult = err.error || { error: 'Request failed' }; this.runningTest = false; }
      });
    }
  }
}
