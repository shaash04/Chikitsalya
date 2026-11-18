import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WafService, WafOverviewData, WafRule, WafDetectedEvent } from '../../../core/services/waf.service';

@Component({
  selector: 'app-waf-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="waf-container">
      <div class="waf-header">
        <div class="waf-title-area">
          <div class="waf-badge">
            <span class="pulsing-shield"></span>
            <span>PERIMETER APPLICATION DEFENSE</span>
          </div>
          <h1 class="waf-heading">Web Application Firewall (WAF) Simulator</h1>
          <p class="waf-subtitle">Real-Time Request Inspection, Signature Matching & Policy Configuration</p>
        </div>

        <div class="header-actions">
          <a routerLink="/admin/security-center" class="waf-btn waf-btn-outline">
            🛡️ Security Command Center
          </a>
          <button class="waf-btn waf-btn-primary" (click)="loadWafOverview()" [disabled]="loading()">
            <span>🔄</span> Refresh Rules & Logs
          </button>
        </div>
      </div>

      <!-- Feedback Alerts -->
      <div *ngIf="successMessage" class="alert alert-success">
        <span>✓</span> {{ successMessage }}
      </div>
      <div *ngIf="errorMessage" class="alert alert-danger">
        <span>⚠️</span> {{ errorMessage }}
      </div>

      <!-- WAF Overview Cards -->
      <div class="waf-kpi-grid">
        <div class="kpi-card kpi-cyan">
          <div class="kpi-top">
            <span class="kpi-label">Inspected Requests</span>
            <span class="kpi-icon">🔍</span>
          </div>
          <div class="kpi-value">{{ overview()?.totalInspectedRequests || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-note green">Active In-Line Middleware</span>
          </div>
        </div>

        <div class="kpi-card kpi-rose">
          <div class="kpi-top">
            <span class="kpi-label">Blocked Payloads</span>
            <span class="kpi-icon">🛑</span>
          </div>
          <div class="kpi-value">{{ overview()?.totalBlockedRequests || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-note red">Neutralized at Boundary</span>
          </div>
        </div>

        <div class="kpi-card kpi-emerald">
          <div class="kpi-top">
            <span class="kpi-label">Active Rules</span>
            <span class="kpi-icon">⚙️</span>
          </div>
          <div class="kpi-value">{{ overview()?.activeRulesCount || 0 }} / {{ overview()?.rules?.length || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-note green">Multi-Vector Coverage</span>
          </div>
        </div>

        <div class="kpi-card kpi-purple">
          <div class="kpi-top">
            <span class="kpi-label">Interception Mode</span>
            <span class="kpi-icon">🛡️</span>
          </div>
          <div class="kpi-value value-text">DYNAMIC BLOCK</div>
          <div class="kpi-footer">
            <span class="kpi-note purple">Zero-Tolerance Payload Policy</span>
          </div>
        </div>
      </div>

      <!-- Configurable Rule Table -->
      <div class="waf-panel mb-4">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Active WAF Inspection Rules</h3>
            <p class="panel-subtitle">Configure rule activation and action mode (Block vs Detect Only)</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="waf-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Rule Name & Description</th>
                <th>Threat Category</th>
                <th>Severity</th>
                <th>Action Mode</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rule of overview()?.rules" class="rule-row" [class.rule-disabled]="!rule.enabled">
                <td>
                  <code class="rule-id">{{ rule.id }}</code>
                </td>
                <td class="rule-info-col">
                  <strong class="rule-name">{{ rule.name }}</strong>
                  <p class="rule-desc">{{ rule.description }}</p>
                </td>
                <td>
                  <span class="cat-pill" [ngClass]="'cat-' + rule.category.toLowerCase()">
                    {{ rule.category }}
                  </span>
                </td>
                <td>
                  <span class="sev-pill" [ngClass]="'sev-' + rule.severity.toLowerCase()">
                    {{ rule.severity }}
                  </span>
                </td>
                <td>
                  <select 
                    [ngModel]="rule.mode" 
                    (ngModelChange)="onModeChange(rule, $event)" 
                    class="waf-select" 
                    [disabled]="!rule.enabled">
                    <option value="BLOCK">BLOCK (Drop 403)</option>
                    <option value="DETECT_ONLY">DETECT_ONLY (Log Only)</option>
                  </select>
                </td>
                <td>
                  <span class="status-badge" [class.badge-active]="rule.enabled" [class.badge-inactive]="!rule.enabled">
                    {{ rule.enabled ? 'ACTIVE' : 'DISABLED' }}
                  </span>
                </td>
                <td>
                  <button 
                    class="waf-toggle-btn" 
                    [ngClass]="rule.enabled ? 'btn-disable' : 'btn-enable'"
                    (click)="toggleRule(rule)">
                    {{ rule.enabled ? 'Deactivate' : 'Activate' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detected & Blocked Request History -->
      <div class="waf-panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">WAF Interception Event History</h3>
            <p class="panel-subtitle">Recent malicious payload match events captured in-memory and logged to database audit</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="waf-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Rule Triggered</th>
                <th>Category</th>
                <th>Source IP</th>
                <th>Endpoint Path</th>
                <th>Action Taken</th>
                <th>Payload Sample</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let det of overview()?.recentDetections" class="detection-row">
                <td class="col-time">{{ formatTime(det.timestamp) }}</td>
                <td><code class="rule-id">{{ det.ruleId }}</code></td>
                <td>
                  <span class="cat-pill" [ngClass]="'cat-' + det.category.toLowerCase()">
                    {{ det.category }}
                  </span>
                </td>
                <td><code>{{ det.sourceIp }}</code></td>
                <td><code>{{ det.path }}</code></td>
                <td>
                  <span class="action-pill" [ngClass]="'act-' + det.actionTaken.toLowerCase()">
                    {{ det.actionTaken }}
                  </span>
                </td>
                <td class="col-snippet">
                  <span class="snippet-text" [title]="det.snippet">{{ det.snippet }}</span>
                </td>
                <td>
                  <button class="btn-inspect-sm" (click)="openDetailModal(det)">Inspect</button>
                </td>
              </tr>

              <tr *ngIf="overview()?.recentDetections?.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">
                  No attack payloads detected yet in current server session. Try simulating attacks in the Security Demo Center!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Modal -->
      <div class="modal-backdrop" *ngIf="selectedDetection" (click)="closeDetailModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>WAF Incident Inspection: {{ selectedDetection.id }}</h3>
            <button class="close-btn" (click)="closeDetailModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="meta-grid">
              <div><label>Rule ID</label><code>{{ selectedDetection.ruleId }}</code></div>
              <div><label>Category</label><span>{{ selectedDetection.category }}</span></div>
              <div><label>Source IP</label><code>{{ selectedDetection.sourceIp }}</code></div>
              <div><label>Path</label><code>{{ selectedDetection.path }}</code></div>
              <div><label>Action</label><strong>{{ selectedDetection.actionTaken }}</strong></div>
              <div><label>Location</label><span>{{ selectedDetection.location }}</span></div>
            </div>

            <div class="mt-3">
              <label>Intercepted Payload Snippet</label>
              <pre class="payload-box">{{ selectedDetection.snippet }}</pre>
            </div>
          </div>
          <div class="modal-footer">
            <button class="waf-btn waf-btn-outline" (click)="closeDetailModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: #090d16;
      color: #f1f5f9;
      min-height: 100vh;
      padding: 28px 32px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .waf-container {
      max-width: 1500px;
      margin: 0 auto;
    }
    .waf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #1e293b;
      flex-wrap: wrap;
      gap: 16px;
    }
    .waf-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fb7185;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .pulsing-shield {
      width: 8px;
      height: 8px;
      background: #f43f5e;
      border-radius: 50%;
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 7px rgba(244, 63, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
    }
    .waf-heading {
      font-size: 1.85rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .waf-subtitle {
      font-size: 0.88rem;
      color: #94a3b8;
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .waf-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s;
    }
    .waf-btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
    .waf-btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }
    .waf-btn-outline {
      background: #1e293b;
      border: 1px solid #334155;
      color: #38bdf8;
    }
    .waf-btn-outline:hover {
      background: #334155;
    }
    /* KPI Grid */
    .waf-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 18px 20px;
    }
    .kpi-cyan { border-top: 3px solid #06b6d4; }
    .kpi-rose { border-top: 3px solid #f43f5e; }
    .kpi-emerald { border-top: 3px solid #10b981; }
    .kpi-purple { border-top: 3px solid #a855f7; }
    .kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .kpi-label {
      font-size: 0.78rem;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
    }
    .kpi-icon {
      font-size: 1.2rem;
    }
    .kpi-value {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .value-text {
      font-size: 1.35rem;
      letter-spacing: 0.05em;
    }
    .kpi-footer {
      font-size: 0.72rem;
    }
    .kpi-note.green { color: #34d399; }
    .kpi-note.red { color: #f87171; }
    .kpi-note.purple { color: #c084fc; }
    /* Panel */
    .waf-panel {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 20px;
    }
    .panel-header {
      margin-bottom: 16px;
    }
    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 4px 0;
    }
    .panel-subtitle {
      font-size: 0.78rem;
      color: #94a3b8;
      margin: 0;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .waf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .waf-table th {
      background: #1e293b;
      color: #94a3b8;
      text-align: left;
      padding: 10px 14px;
      font-weight: 600;
      border-bottom: 1px solid #334155;
    }
    .waf-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #1e293b;
      vertical-align: middle;
      color: #cbd5e1;
    }
    .rule-id {
      color: #38bdf8;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .rule-name {
      display: block;
      color: #ffffff;
      margin-bottom: 2px;
    }
    .rule-desc {
      font-size: 0.74rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.35;
    }
    .cat-pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .cat-sqli { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .cat-xss { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
    .cat-path_traversal { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    .cat-command_injection { background: rgba(239, 68, 68, 0.25); color: #fca5a5; }
    .cat-suspicious_payload { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .sev-pill {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sev-critical { background: #991b1b; color: #fee2e2; }
    .sev-high { background: #c2410c; color: #ffedd5; }
    .waf-select {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 0.76rem;
      outline: none;
    }
    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .badge-active { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-inactive { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    .waf-toggle-btn {
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    .btn-disable { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .btn-disable:hover { background: #dc2626; color: #fff; }
    .btn-enable { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .btn-enable:hover { background: #16a34a; color: #fff; }
    .rule-disabled { opacity: 0.55; }
    .action-pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .act-blocked { background: rgba(239, 68, 68, 0.25); color: #f87171; }
    .act-detected { background: rgba(245, 158, 11, 0.25); color: #fbbf24; }
    .col-snippet { max-width: 250px; }
    .snippet-text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 0.75rem; color: #94a3b8; }
    .btn-inspect-sm {
      background: #1e293b;
      border: 1px solid #334155;
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      cursor: pointer;
    }
    .btn-inspect-sm:hover { background: #0284c7; color: #fff; }
    .mb-4 { margin-bottom: 24px; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; }
    .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; }
    .alert-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; }
    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-dialog {
      background: #111827;
      border: 1px solid #334155;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #1f2937;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { font-size: 1.1rem; color: #fff; margin: 0; }
    .close-btn { background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; }
    .modal-body { padding: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #182032; padding: 12px; border-radius: 8px; }
    .meta-grid label { display: block; font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
    .payload-box { background: #090d16; border: 1px solid #1f2937; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; color: #f87171; word-break: break-all; }
    .modal-footer { padding: 14px 20px; border-top: 1px solid #1f2937; display: flex; justify-content: flex-end; }
  `]
})
export class WafManagementComponent implements OnInit {
  overview = signal<WafOverviewData | null>(null);
  loading = signal<boolean>(false);
  successMessage = '';
  errorMessage = '';

  selectedDetection: WafDetectedEvent | null = null;

  constructor(private wafService: WafService) {}

  ngOnInit(): void {
    this.loadWafOverview();
  }

  loadWafOverview(): void {
    this.loading.set(true);
    this.wafService.getOverview().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) {
          this.overview.set(res.data);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  toggleRule(rule: WafRule): void {
    const newStatus = !rule.enabled;
    this.wafService.updateRule(rule.id, { enabled: newStatus }).subscribe({
      next: res => {
        if (res.success) {
          rule.enabled = newStatus;
          this.successMessage = `Rule ${rule.id} set to ${newStatus ? 'ACTIVE' : 'DISABLED'}.`;
          setTimeout(() => (this.successMessage = ''), 3000);
        }
      },
      error: () => {
        this.errorMessage = 'Failed to update rule status.';
        setTimeout(() => (this.errorMessage = ''), 3000);
      }
    });
  }

  onModeChange(rule: WafRule, newMode: 'BLOCK' | 'DETECT_ONLY'): void {
    this.wafService.updateRule(rule.id, { mode: newMode }).subscribe({
      next: res => {
        if (res.success) {
          rule.mode = newMode;
          this.successMessage = `Rule ${rule.id} mode updated to ${newMode}.`;
          setTimeout(() => (this.successMessage = ''), 3000);
        }
      }
    });
  }

  openDetailModal(det: WafDetectedEvent): void {
    this.selectedDetection = det;
  }

  closeDetailModal(): void {
    this.selectedDetection = null;
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
