import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  SecurityCommandCenterService,
  SecurityOverviewMetrics,
  ThreatAnalytics,
  SecurityEventItem,
  SecurityAlert
} from '../../../core/services/security-command-center.service';

@Component({
  selector: 'app-security-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="soc-container">
      <!-- SOC Header Bar -->
      <div class="soc-header">
        <div class="soc-title-area">
          <div class="soc-badge">
            <span class="pulsing-radar"></span>
            <span>ENTERPRISE SOC ENGINE</span>
          </div>
          <h1 class="soc-heading">Security Command Center</h1>
          <p class="soc-subtitle">Real-Time Threat Detection, Incident Monitoring & Defense Operations</p>
        </div>

        <div class="soc-controls">
          <div class="defense-status" [ngClass]="'status-' + (overview()?.systemStatus?.toLowerCase() || 'optimal')">
            <span class="status-dot"></span>
            <span class="status-label">DEFENSE: {{ overview()?.systemStatus || 'OPTIMAL' }}</span>
          </div>

          <div class="refresh-group">
            <label class="auto-refresh-label">
              <span>Auto-Sync:</span>
              <select [(ngModel)]="refreshIntervalSec" (change)="updateInterval()" class="soc-select">
                <option [ngValue]="5">5 seconds</option>
                <option [ngValue]="10">10 seconds</option>
                <option [ngValue]="30">30 seconds</option>
                <option [ngValue]="0">Paused</option>
              </select>
            </label>

            <button class="soc-btn soc-btn-primary" (click)="refreshAllData()" [disabled]="isLoading()">
              <span [class.spinning]="isLoading()">🔄</span>
              <span>Sync Feed</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Critical Alerts Section -->
      <div class="soc-alerts-container" *ngIf="alerts().length > 0">
        <div class="alerts-header">
          <div class="alerts-title">
            <span class="alert-icon">⚠️</span>
            <h3>Priority Threat Advisories ({{ alerts().length }})</h3>
          </div>
          <span class="alerts-hint">Continuous automated analysis across system audit traces</span>
        </div>

        <div class="alerts-grid">
          <div *ngFor="let alert of alerts()" class="alert-card" [ngClass]="'alert-' + alert.severity.toLowerCase()">
            <div class="alert-card-header">
              <span class="alert-severity-badge">{{ alert.severity }}</span>
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </div>
            <h4 class="alert-card-title">{{ alert.title }}</h4>
            <p class="alert-card-desc">{{ alert.description }}</p>
            <div class="alert-meta">
              <span class="meta-tag"><strong>Target:</strong> {{ alert.targetAccount || 'N/A' }}</span>
              <span class="meta-tag"><strong>Source IP:</strong> <code>{{ alert.sourceIp }}</code></span>
            </div>
            <div class="alert-recommendation">
              <strong>Shield Recommendation:</strong> {{ alert.recommendation }}
            </div>
          </div>
        </div>
      </div>

      <!-- Overview KPI Cards -->
      <div class="soc-kpi-grid">
        <div class="kpi-card kpi-blue">
          <div class="kpi-top">
            <span class="kpi-label">Requests Analyzed</span>
            <span class="kpi-icon">📡</span>
          </div>
          <div class="kpi-value">{{ overview()?.totalRequestsAnalyzed || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-trend green">✓ 100% Parameterized</span>
            <span class="kpi-desc">Total processed</span>
          </div>
        </div>

        <div class="kpi-card kpi-amber">
          <div class="kpi-top">
            <span class="kpi-label">Suspicious Requests</span>
            <span class="kpi-icon">👁️</span>
          </div>
          <div class="kpi-value">{{ overview()?.suspiciousRequestsDetected || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-trend amber">Anomalies Flagged</span>
            <span class="kpi-desc">Threat detection layer</span>
          </div>
        </div>

        <div class="kpi-card kpi-rose">
          <div class="kpi-top">
            <span class="kpi-label">Blocked Attacks</span>
            <span class="kpi-icon">🛡️</span>
          </div>
          <div class="kpi-value">{{ overview()?.blockedAttacks || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-trend red">Neutralized at Gateway</span>
            <span class="kpi-desc">RBAC / IDOR / WAF</span>
          </div>
        </div>

        <div class="kpi-card kpi-purple">
          <div class="kpi-top">
            <span class="kpi-label">Failed Logins</span>
            <span class="kpi-icon">🔐</span>
          </div>
          <div class="kpi-value">{{ overview()?.failedLoginAttempts || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-trend purple">Brute-Force Shield Active</span>
            <span class="kpi-desc">Lockout enforcement</span>
          </div>
        </div>

        <div class="kpi-card kpi-emerald">
          <div class="kpi-top">
            <span class="kpi-label">Active User Sessions</span>
            <span class="kpi-icon">💻</span>
          </div>
          <div class="kpi-value">{{ overview()?.activeUserSessions || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-trend green">HttpOnly Signed Tokens</span>
            <span class="kpi-desc">Server-side registry</span>
          </div>
        </div>

        <div class="kpi-card kpi-red">
          <div class="kpi-top">
            <span class="kpi-label">Critical Alerts</span>
            <span class="kpi-icon">🚨</span>
          </div>
          <div class="kpi-value">{{ overview()?.criticalSecurityAlerts || 0 }}</div>
          <div class="kpi-footer">
            <span class="kpi-trend" [ngClass]="(overview()?.criticalSecurityAlerts || 0) > 0 ? 'red' : 'green'">
              {{ (overview()?.criticalSecurityAlerts || 0) > 0 ? 'Immediate Action' : 'System Secure' }}
            </span>
            <span class="kpi-desc">Zero unhandled breaches</span>
          </div>
        </div>
      </div>

      <!-- Threat Analytics Visualizations -->
      <div class="soc-analytics-grid">
        <!-- Chart 1: SVG Attack Activity Timeline -->
        <div class="soc-panel timeline-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Attack & Threat Activity Over Time</h3>
              <p class="panel-subtitle">Rolling 24-hour chronological distribution</p>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-color cyan"></span> Total Events</span>
              <span class="legend-item"><span class="legend-color rose"></span> Blocked Threats</span>
            </div>
          </div>

          <div class="timeline-chart-wrap" *ngIf="analytics()?.timeline as tl">
            <svg class="timeline-svg" viewBox="0 0 500 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0" />
                </linearGradient>
                <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Grid horizontal lines -->
              <line x1="30" y1="30" x2="490" y2="30" stroke="#1f2937" stroke-dasharray="3,3" />
              <line x1="30" y1="75" x2="490" y2="75" stroke="#1f2937" stroke-dasharray="3,3" />
              <line x1="30" y1="120" x2="490" y2="120" stroke="#1f2937" stroke-dasharray="3,3" />
              <line x1="30" y1="150" x2="490" y2="150" stroke="#374151" />

              <!-- Polyline & polygon for Total Events -->
              <polygon [attr.points]="getTotalAreaPoints(tl)" fill="url(#cyanGrad)" />
              <polyline [attr.points]="getTotalPolylinePoints(tl)" fill="none" stroke="#06b6d4" stroke-width="2.5" />

              <!-- Polyline & polygon for Blocked Threats -->
              <polygon [attr.points]="getBlockedAreaPoints(tl)" fill="url(#roseGrad)" />
              <polyline [attr.points]="getBlockedPolylinePoints(tl)" fill="none" stroke="#f43f5e" stroke-width="2.5" />

              <!-- Points -->
              <g *ngFor="let pt of getPointCoordinates(tl)">
                <circle [attr.cx]="pt.x" [attr.cy]="pt.yTotal" r="4" fill="#06b6d4" stroke="#0f172a" stroke-width="2" />
                <circle [attr.cx]="pt.x" [attr.cy]="pt.yBlocked" r="4" fill="#f43f5e" stroke="#0f172a" stroke-width="2" />
                <text [attr.x]="pt.x" y="170" fill="#94a3b8" font-size="10" text-anchor="middle">{{ pt.label }}</text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Chart 2: Category Breakdown Bar Chart -->
        <div class="soc-panel category-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Attacks by Threat Category</h3>
              <p class="panel-subtitle">Classification across security controls</p>
            </div>
          </div>

          <div class="category-bars" *ngIf="analytics()?.categories as cats">
            <div *ngFor="let cat of cats" class="cat-bar-item">
              <div class="cat-bar-info">
                <span class="cat-name">{{ cat.label }}</span>
                <span class="cat-count"><strong>{{ cat.count }}</strong> ({{ cat.percentage }}%)</span>
              </div>
              <div class="cat-progress-track">
                <div class="cat-progress-fill" [ngClass]="'fill-' + cat.category.toLowerCase()" [style.width.%]="cat.percentage"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart 3: Severity Donut Distribution -->
        <div class="soc-panel severity-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Security Event Distribution</h3>
              <p class="panel-subtitle">Breakdown by severity severity</p>
            </div>
          </div>

          <div class="donut-content" *ngIf="analytics()?.severities as sevs">
            <div class="donut-wrap">
              <svg viewBox="0 0 100 100" class="donut-svg">
                <!-- Low segment -->
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" stroke-width="12"
                  [attr.stroke-dasharray]="getDonutDash(sevs, 'LOW')"
                  [attr.stroke-dashoffset]="getDonutOffset(sevs, 'LOW')" />
                <!-- Medium segment -->
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" stroke-width="12"
                  [attr.stroke-dasharray]="getDonutDash(sevs, 'MEDIUM')"
                  [attr.stroke-dashoffset]="getDonutOffset(sevs, 'MEDIUM')" />
                <!-- High segment -->
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f97316" stroke-width="12"
                  [attr.stroke-dasharray]="getDonutDash(sevs, 'HIGH')"
                  [attr.stroke-dashoffset]="getDonutOffset(sevs, 'HIGH')" />
                <!-- Critical segment -->
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" stroke-width="12"
                  [attr.stroke-dasharray]="getDonutDash(sevs, 'CRITICAL')"
                  [attr.stroke-dashoffset]="getDonutOffset(sevs, 'CRITICAL')" />
              </svg>
              <div class="donut-center">
                <span class="donut-number">{{ getTotalEventCount() }}</span>
                <span class="donut-label">EVENTS</span>
              </div>
            </div>

            <div class="donut-legend">
              <div *ngFor="let s of sevs" class="legend-row">
                <span class="legend-dot" [ngClass]="'dot-' + s.severity.toLowerCase()"></span>
                <span class="legend-name">{{ s.severity }}</span>
                <span class="legend-val"><strong>{{ s.count }}</strong> ({{ s.percentage }}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart 4: Authentication Security Statistics -->
        <div class="soc-panel auth-stats-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Authentication Statistics</h3>
              <p class="panel-subtitle">Login success vs failure analysis</p>
            </div>
          </div>

          <div class="auth-stats-body" *ngIf="analytics()?.loginStats as ls">
            <div class="auth-stats-summary">
              <div class="auth-stat-box">
                <span class="stat-number green">{{ ls.successfulLogins }}</span>
                <span class="stat-label">Successful Logins</span>
              </div>
              <div class="auth-stat-box">
                <span class="stat-number amber">{{ ls.failedLogins }}</span>
                <span class="stat-label">Failed Attempts</span>
              </div>
              <div class="auth-stat-box">
                <span class="stat-number red">{{ ls.lockoutsTriggered }}</span>
                <span class="stat-label">Lockouts Triggered</span>
              </div>
            </div>

            <div class="auth-ratio-bar">
              <div class="ratio-labels">
                <span>Success Rate: {{ (100 - ls.failureRatePercentage) | number:'1.1-1' }}%</span>
                <span>Failure Rate: {{ ls.failureRatePercentage }}%</span>
              </div>
              <div class="ratio-track">
                <div class="ratio-success" [style.width.%]="100 - ls.failureRatePercentage"></div>
                <div class="ratio-failure" [style.width.%]="ls.failureRatePercentage"></div>
              </div>
            </div>

            <div class="auth-note">
              <span>🛡️ Bcrypt 12-round hashing + constant-time comparison prevents timing analysis side-channels.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Security Event Monitor Table -->
      <div class="soc-panel monitor-panel">
        <div class="monitor-header">
          <div class="monitor-title-box">
            <div class="live-dot-container">
              <span class="live-pulse"></span>
              <h2 class="panel-title">Live Security Event Monitor</h2>
            </div>
            <p class="panel-subtitle">Real-time tamper-resistant database audit stream ({{ filteredEvents().length }} events listed)</p>
          </div>

          <!-- Filters Bar -->
          <div class="monitor-filters">
            <!-- Search -->
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" [(ngModel)]="searchQuery" (input)="onFilterChange()" placeholder="Search IP, username, event..." class="soc-input" />
            </div>

            <!-- Severity Pills -->
            <div class="filter-pills">
              <button *ngFor="let s of ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']"
                class="pill-btn"
                [class.active]="selectedSeverity === s"
                [ngClass]="'pill-' + s.toLowerCase()"
                (click)="setSeverity(s)">
                {{ s }}
              </button>
            </div>

            <!-- Category Selector -->
            <select [(ngModel)]="selectedCategory" (change)="onFilterChange()" class="soc-select category-select">
              <option value="ALL">All Categories</option>
              <option value="AUTHENTICATION">Authentication</option>
              <option value="ACCESS_CONTROL">Access Control & IDOR</option>
              <option value="INJECTION_WAF">Injection & WAF</option>
              <option value="RATE_LIMIT">Rate Limiting</option>
              <option value="ADMIN">Administrative</option>
            </select>
          </div>
        </div>

        <!-- Events Table -->
        <div class="table-responsive">
          <table class="soc-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Category</th>
                <th>Source IP</th>
                <th>Account / Actor</th>
                <th>Severity</th>
                <th>Action Taken</th>
                <th>Event Details</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let evt of filteredEvents()" class="event-row" [ngClass]="'row-severity-' + evt.severity.toLowerCase()">
                <td class="col-time">
                  <span class="time-main">{{ formatTime(evt.timestamp) }}</span>
                  <span class="time-relative">{{ getRelativeTime(evt.timestamp) }}</span>
                </td>
                <td class="col-event">
                  <span class="event-type-badge">{{ evt.eventType }}</span>
                </td>
                <td class="col-category">
                  <span class="category-tag">{{ evt.category }}</span>
                </td>
                <td class="col-ip">
                  <code>{{ evt.ipAddress }}</code>
                </td>
                <td class="col-actor">
                  <span class="actor-name">{{ evt.actorUsername }}</span>
                  <span class="actor-role">{{ evt.actorRole }}</span>
                </td>
                <td class="col-severity">
                  <span class="severity-pill" [ngClass]="'sev-' + evt.severity.toLowerCase()">
                    {{ evt.severity }}
                  </span>
                </td>
                <td class="col-action">
                  <span class="action-pill" [ngClass]="'act-' + evt.actionTaken.toLowerCase()">
                    {{ evt.actionTaken }}
                  </span>
                </td>
                <td class="col-details">
                  <span class="details-text" [title]="evt.details">{{ evt.details }}</span>
                </td>
                <td class="col-inspect">
                  <button class="btn-inspect" (click)="openInspectModal(evt)">
                    Inspect
                  </button>
                </td>
              </tr>

              <tr *ngIf="filteredEvents().length === 0">
                <td colspan="9" class="no-events-cell">
                  <div class="no-events-box">
                    <span>🔍</span>
                    <p>No security events matching current criteria.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Event Inspection Modal -->
      <div class="soc-modal-backdrop" *ngIf="inspectedEvent" (click)="closeInspectModal()">
        <div class="soc-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-box">
              <span class="modal-badge" [ngClass]="'sev-' + inspectedEvent.severity.toLowerCase()">
                {{ inspectedEvent.severity }}
              </span>
              <h3>Audit Trace Inspection: #{{ inspectedEvent.id }}</h3>
            </div>
            <button class="modal-close-btn" (click)="closeInspectModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="modal-meta-grid">
              <div class="modal-meta-item">
                <label>Event Type</label>
                <code>{{ inspectedEvent.eventType }}</code>
              </div>
              <div class="modal-meta-item">
                <label>Action Taken</label>
                <span class="action-pill" [ngClass]="'act-' + inspectedEvent.actionTaken.toLowerCase()">
                  {{ inspectedEvent.actionTaken }}
                </span>
              </div>
              <div class="modal-meta-item">
                <label>Actor</label>
                <span>{{ inspectedEvent.actorUsername }} ({{ inspectedEvent.actorRole }})</span>
              </div>
              <div class="modal-meta-item">
                <label>Source IP</label>
                <code>{{ inspectedEvent.ipAddress }}</code>
              </div>
              <div class="modal-meta-item">
                <label>Resource Target</label>
                <span>{{ inspectedEvent.resourceType }} {{ inspectedEvent.resourceId ? '#' + inspectedEvent.resourceId : '' }}</span>
              </div>
              <div class="modal-meta-item">
                <label>Correlation ID</label>
                <code class="corr-id">{{ inspectedEvent.correlationId }}</code>
              </div>
            </div>

            <div class="modal-section">
              <label>Event Explanation</label>
              <p class="modal-explanation">{{ inspectedEvent.details }}</p>
            </div>

            <div class="modal-section" *ngIf="inspectedEvent.userAgent">
              <label>User Agent</label>
              <code class="code-block">{{ inspectedEvent.userAgent }}</code>
            </div>

            <div class="modal-section" *ngIf="inspectedEvent.metadata">
              <label>Structured Security Metadata</label>
              <pre class="json-block">{{ inspectedEvent.metadata | json }}</pre>
            </div>
          </div>

          <div class="modal-footer">
            <button class="soc-btn soc-btn-outline" (click)="closeInspectModal()">Close Trace</button>
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
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .soc-container {
      padding: 28px 32px;
      max-width: 1600px;
      margin: 0 auto;
    }

    /* Header */
    .soc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #1e293b;
      flex-wrap: wrap;
      gap: 16px;
    }

    .soc-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .pulsing-radar {
      width: 8px;
      height: 8px;
      background: #06b6d4;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
      animation: pulse 1.6s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 7px rgba(6, 182, 212, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
    }

    .soc-heading {
      font-size: 1.85rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }

    .soc-subtitle {
      font-size: 0.88rem;
      color: #94a3b8;
      margin: 0;
    }

    .soc-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .defense-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .status-optimal {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .status-optimal .status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
    }

    .status-elevated {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }

    .status-elevated .status-dot {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
    }

    .status-critical {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    .status-critical .status-dot {
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
    }

    .refresh-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .auto-refresh-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .soc-select {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
      cursor: pointer;
    }

    .soc-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .soc-btn-primary {
      background: #0284c7;
      color: #ffffff;
    }

    .soc-btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }

    .soc-btn-outline {
      background: transparent;
      border: 1px solid #475569;
      color: #cbd5e1;
    }

    .soc-btn-outline:hover {
      background: #1e293b;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Alerts section */
    .soc-alerts-container {
      background: #111827;
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }

    .alerts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .alerts-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alerts-title h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fca5a5;
      margin: 0;
    }

    .alerts-hint {
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .alerts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }

    .alert-card {
      background: #182032;
      border-left: 4px solid #ef4444;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .alert-critical { border-left-color: #ef4444; }
    .alert-high { border-left-color: #f97316; }
    .alert-medium { border-left-color: #f59e0b; }

    .alert-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .alert-severity-badge {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .alert-time {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .alert-card-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
    }

    .alert-card-desc {
      font-size: 0.8rem;
      color: #cbd5e1;
      margin: 0 0 10px 0;
      line-height: 1.4;
    }

    .alert-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 0.74rem;
      color: #94a3b8;
    }

    .alert-meta code {
      color: #38bdf8;
    }

    .alert-recommendation {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 0.74rem;
      color: #a7f3d0;
      line-height: 1.35;
    }

    /* KPI Grid */
    .soc-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    .kpi-blue { border-top: 3px solid #06b6d4; }
    .kpi-amber { border-top: 3px solid #f59e0b; }
    .kpi-rose { border-top: 3px solid #f43f5e; }
    .kpi-purple { border-top: 3px solid #a855f7; }
    .kpi-emerald { border-top: 3px solid #10b981; }
    .kpi-red { border-top: 3px solid #ef4444; }

    .kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .kpi-label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-icon {
      font-size: 1.25rem;
    }

    .kpi-value {
      font-size: 2.1rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      line-height: 1;
    }

    .kpi-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #64748b;
      margin-top: auto;
    }

    .kpi-trend.green { color: #34d399; font-weight: 600; }
    .kpi-trend.amber { color: #fbbf24; font-weight: 600; }
    .kpi-trend.red { color: #f87171; font-weight: 600; }
    .kpi-trend.purple { color: #c084fc; font-weight: 600; }

    /* Threat Analytics Panels Grid */
    .soc-analytics-grid {
      display: grid;
      grid-template-columns: 2fr 1.3fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    @media (max-width: 1024px) {
      .soc-analytics-grid {
        grid-template-columns: 1fr;
      }
    }

    .soc-panel {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 20px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 2px 0;
    }

    .panel-subtitle {
      font-size: 0.78rem;
      color: #94a3b8;
      margin: 0;
    }

    .chart-legend {
      display: flex;
      gap: 14px;
      font-size: 0.74rem;
      color: #cbd5e1;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .legend-color.cyan { background: #06b6d4; }
    .legend-color.rose { background: #f43f5e; }

    /* SVG Timeline */
    .timeline-chart-wrap {
      width: 100%;
      height: 190px;
      margin-top: 10px;
    }

    .timeline-svg {
      width: 100%;
      height: 100%;
    }

    /* Category Bars */
    .category-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .cat-bar-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cat-bar-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: #cbd5e1;
    }

    .cat-progress-track {
      height: 8px;
      background: #1f2937;
      border-radius: 4px;
      overflow: hidden;
    }

    .cat-progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease-out;
    }

    .fill-authentication { background: #38bdf8; }
    .fill-access_control { background: #f43f5e; }
    .fill-injection_waf { background: #ef4444; }
    .fill-rate_limit { background: #f59e0b; }
    .fill-admin { background: #a855f7; }
    .fill-general { background: #10b981; }

    /* Severity Donut */
    .donut-content {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 20px;
      padding: 10px 0;
    }

    .donut-wrap {
      position: relative;
      width: 130px;
      height: 130px;
    }

    .donut-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .donut-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .donut-number {
      display: block;
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
    }

    .donut-label {
      font-size: 0.62rem;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .donut-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.76rem;
      color: #cbd5e1;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-low { background: #10b981; }
    .dot-medium { background: #f59e0b; }
    .dot-high { background: #f97316; }
    .dot-critical { background: #ef4444; }

    /* Auth Stats */
    .auth-stats-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .auth-stats-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .auth-stat-box {
      background: #182032;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-number.green { color: #34d399; }
    .stat-number.amber { color: #fbbf24; }
    .stat-number.red { color: #f87171; }

    .stat-label {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .auth-ratio-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.74rem;
      color: #94a3b8;
    }

    .ratio-track {
      height: 10px;
      background: #1f2937;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
    }

    .ratio-success {
      background: #10b981;
      height: 100%;
    }

    .ratio-failure {
      background: #ef4444;
      height: 100%;
    }

    .auth-note {
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.4;
    }

    /* Monitor Panel */
    .monitor-panel {
      padding: 24px;
    }

    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .live-dot-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .live-pulse {
      width: 10px;
      height: 10px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: livePulse 1.8s infinite;
    }

    @keyframes livePulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .monitor-filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.8rem;
      color: #64748b;
    }

    .soc-input {
      background: #1e293b;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 6px 12px 6px 32px;
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
      width: 220px;
    }

    .soc-input:focus {
      border-color: #0284c7;
    }

    .filter-pills {
      display: flex;
      background: #1e293b;
      padding: 2px;
      border-radius: 6px;
      border: 1px solid #334155;
    }

    .pill-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pill-btn.active {
      background: #334155;
      color: #ffffff;
    }

    .pill-critical.active { background: #991b1b; color: #fee2e2; }
    .pill-high.active { background: #c2410c; color: #ffedd5; }
    .pill-medium.active { background: #b45309; color: #fef3c7; }
    .pill-low.active { background: #065f46; color: #d1fae5; }

    /* Table */
    .table-responsive {
      overflow-x: auto;
    }

    .soc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    .soc-table th {
      background: #1e293b;
      color: #94a3b8;
      text-align: left;
      padding: 10px 14px;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      white-space: nowrap;
    }

    .soc-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #1e293b;
      color: #cbd5e1;
      vertical-align: middle;
    }

    .event-row:hover {
      background: rgba(30, 41, 59, 0.45);
    }

    .row-severity-critical {
      background: rgba(239, 68, 68, 0.05);
    }

    .col-time .time-main {
      display: block;
      font-size: 0.78rem;
      color: #f1f5f9;
      font-weight: 600;
    }

    .col-time .time-relative {
      display: block;
      font-size: 0.68rem;
      color: #64748b;
    }

    .event-type-badge {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.74rem;
      color: #e2e8f0;
      font-weight: 600;
    }

    .category-tag {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .col-ip code {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.76rem;
    }

    .col-actor .actor-name {
      display: block;
      font-weight: 600;
      color: #ffffff;
    }

    .col-actor .actor-role {
      display: block;
      font-size: 0.68rem;
      color: #64748b;
      text-transform: uppercase;
    }

    /* Severity badges */
    .severity-pill {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }

    .sev-low {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .sev-medium {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }

    .sev-high {
      background: rgba(249, 115, 22, 0.15);
      border: 1px solid rgba(249, 115, 22, 0.35);
      color: #fb923c;
    }

    .sev-critical {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #f87171;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
    }

    /* Action taken */
    .action-pill {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .act-allowed {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }

    .act-blocked {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .act-rejected {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .col-details {
      max-width: 320px;
    }

    .details-text {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #94a3b8;
    }

    .btn-inspect {
      background: #1e293b;
      border: 1px solid #334155;
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-inspect:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .no-events-cell {
      text-align: center;
      padding: 40px !important;
    }

    .no-events-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #64748b;
    }

    .no-events-box span {
      font-size: 1.8rem;
    }

    /* Modal */
    .soc-modal-backdrop {
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

    .soc-modal {
      background: #111827;
      border: 1px solid #334155;
      border-radius: 12px;
      width: 100%;
      max-width: 650px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #1f2937;
    }

    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .modal-title-box h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .modal-close-btn:hover {
      color: #ffffff;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #182032;
      padding: 14px;
      border-radius: 8px;
    }

    .modal-meta-item label {
      display: block;
      font-size: 0.68rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .modal-meta-item span,
    .modal-meta-item code {
      font-size: 0.8rem;
      color: #ffffff;
    }

    .corr-id {
      color: #a855f7 !important;
      font-size: 0.72rem !important;
      word-break: break-all;
    }

    .modal-section label {
      display: block;
      font-size: 0.72rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .modal-explanation {
      font-size: 0.85rem;
      color: #e2e8f0;
      line-height: 1.45;
      background: #1e293b;
      padding: 12px;
      border-radius: 6px;
      margin: 0;
    }

    .code-block,
    .json-block {
      background: #090d16;
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 10px;
      font-family: monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      display: block;
      word-break: break-all;
      overflow-x: auto;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 14px 20px;
      border-top: 1px solid #1f2937;
    }
  `]
})
export class SecurityCommandCenterComponent implements OnInit, OnDestroy {
  overview = signal<SecurityOverviewMetrics | null>(null);
  analytics = signal<ThreatAnalytics | null>(null);
  events = signal<SecurityEventItem[]>([]);
  alerts = signal<SecurityAlert[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  selectedSeverity: string = 'ALL';
  selectedCategory: string = 'ALL';
  searchQuery: string = '';
  refreshIntervalSec: number = 5;

  private refreshTimer: any = null;
  inspectedEvent: SecurityEventItem | null = null;

  constructor(private secService: SecurityCommandCenterService) {}

  ngOnInit(): void {
    this.refreshAllData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  updateInterval(): void {
    this.stopAutoRefresh();
    this.startAutoRefresh();
  }

  private startAutoRefresh(): void {
    if (this.refreshIntervalSec > 0) {
      this.refreshTimer = setInterval(() => {
        this.fetchLiveEvents();
        this.fetchOverview();
      }, this.refreshIntervalSec * 1000);
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  refreshAllData(): void {
    this.isLoading.set(true);
    this.fetchOverview();
    this.fetchAnalytics();
    this.fetchLiveEvents();
    this.fetchAlerts();
  }

  private fetchOverview(): void {
    this.secService.getOverview().subscribe({
      next: res => {
        if (res.success) this.overview.set(res.data);
      }
    });
  }

  private fetchAnalytics(): void {
    this.secService.getAnalytics().subscribe({
      next: res => {
        if (res.success) this.analytics.set(res.data);
      }
    });
  }

  private fetchLiveEvents(): void {
    this.secService
      .getEvents({
        severity: this.selectedSeverity,
        category: this.selectedCategory,
        search: this.searchQuery,
        limit: 100
      })
      .subscribe({
        next: res => {
          if (res.success) {
            this.events.set(res.data);
            this.isLoading.set(false);
          }
        },
        error: () => this.isLoading.set(false)
      });
  }

  private fetchAlerts(): void {
    this.secService.getAlerts().subscribe({
      next: res => {
        if (res.success) this.alerts.set(res.data);
      }
    });
  }

  setSeverity(sev: string): void {
    this.selectedSeverity = sev;
    this.fetchLiveEvents();
  }

  onFilterChange(): void {
    this.fetchLiveEvents();
  }

  filteredEvents(): SecurityEventItem[] {
    return this.events();
  }

  openInspectModal(evt: SecurityEventItem): void {
    this.inspectedEvent = evt;
  }

  closeInspectModal(): void {
    this.inspectedEvent = null;
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  getRelativeTime(isoString: string): string {
    if (!isoString) return '';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  }

  getTotalEventCount(): number {
    const sevs = this.analytics()?.severities || [];
    return sevs.reduce((acc, s) => acc + s.count, 0);
  }

  // SVG Chart Calculation Helpers
  getPointCoordinates(timeline: any[]): { x: number; yTotal: number; yBlocked: number; label: string }[] {
    if (!timeline || timeline.length === 0) return [];
    const maxVal = Math.max(...timeline.map(t => Math.max(t.totalEvents, t.blockedAttacks, 5)));
    const startX = 45;
    const endX = 475;
    const stepX = (endX - startX) / (timeline.length - 1 || 1);
    const topY = 30;
    const bottomY = 150;
    const height = bottomY - topY;

    return timeline.map((pt, idx) => {
      const x = startX + idx * stepX;
      const yTotal = bottomY - (pt.totalEvents / maxVal) * height;
      const yBlocked = bottomY - (pt.blockedAttacks / maxVal) * height;
      return { x, yTotal, yBlocked, label: pt.timeLabel };
    });
  }

  getTotalPolylinePoints(timeline: any[]): string {
    const pts = this.getPointCoordinates(timeline);
    return pts.map(p => `${p.x},${p.yTotal}`).join(' ');
  }

  getTotalAreaPoints(timeline: any[]): string {
    const pts = this.getPointCoordinates(timeline);
    if (pts.length === 0) return '';
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const poly = pts.map(p => `${p.x},${p.yTotal}`).join(' ');
    return `${firstX},150 ${poly} ${lastX},150`;
  }

  getBlockedPolylinePoints(timeline: any[]): string {
    const pts = this.getPointCoordinates(timeline);
    return pts.map(p => `${p.x},${p.yBlocked}`).join(' ');
  }

  getBlockedAreaPoints(timeline: any[]): string {
    const pts = this.getPointCoordinates(timeline);
    if (pts.length === 0) return '';
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const poly = pts.map(p => `${p.x},${p.yBlocked}`).join(' ');
    return `${firstX},150 ${poly} ${lastX},150`;
  }

  // Donut SVG Calculations
  getDonutDash(sevs: any[], severity: string): string {
    const circumference = 2 * Math.PI * 38; // approx 238.76
    const item = sevs.find(s => s.severity === severity);
    if (!item) return `0 ${circumference}`;
    const strokeLen = (item.percentage / 100) * circumference;
    return `${strokeLen} ${circumference - strokeLen}`;
  }

  getDonutOffset(sevs: any[], severity: string): number {
    const circumference = 2 * Math.PI * 38;
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const targetIdx = order.indexOf(severity);
    let cumulative = 0;
    for (let i = 0; i < targetIdx; i++) {
      const it = sevs.find(s => s.severity === order[i]);
      if (it) cumulative += it.percentage;
    }
    return -((cumulative / 100) * circumference);
  }
}
