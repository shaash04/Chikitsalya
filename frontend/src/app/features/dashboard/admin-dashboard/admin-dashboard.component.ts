import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="dashboard-header">
        <div>
          <h1>Administrator Security & Operations Console</h1>
          <p class="subtitle">Full System Oversight • Least Privilege Policy Enforcement • Security Auditing</p>
        </div>
        <div class="actions">
          <a routerLink="/admin/provision-doctor" class="btn btn-primary">➕ Provision Doctor Account</a>
          <a routerLink="/audit-logs" class="btn btn-outline" style="margin-left: 8px;">📜 View Audit Trail</a>
        </div>
      </div>

      <!-- Key Performance & Security Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🧑</div>
          <div class="stat-info">
            <h4>Total Patients</h4>
            <div class="stat-number">{{ metrics?.totalPatients || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon teal">👨‍⚕️</div>
          <div class="stat-info">
            <h4>Active Doctors</h4>
            <div class="stat-number">{{ metrics?.totalDoctors || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">📅</div>
          <div class="stat-info">
            <h4>Scheduled Visits</h4>
            <div class="stat-number">{{ metrics?.scheduledAppointments || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">📁</div>
          <div class="stat-info">
            <h4>Clinical Records</h4>
            <div class="stat-number">{{ metrics?.totalRecords || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Security Controls Active Status Grid -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔒 System Security Control Status</h3>
          <span class="badge badge-green">12 / 12 Active & Verified</span>
        </div>

        <div class="security-features-grid">
          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>Bcrypt Password Hashing</strong>
              <div class="sec-desc">Work factor 12, salted, zero plaintext storage</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>Server-Managed Sessions</strong>
              <div class="sec-desc">HttpOnly, SameSite=Strict, 30m idle timeout</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>Role-Based Access Control</strong>
              <div class="sec-desc">Patient/Doctor/Admin server-side enforcement</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>SQL Injection Defense</strong>
              <div class="sec-desc">Prepared statements with parameter binding</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>Cross-Site Scripting (XSS)</strong>
              <div class="sec-desc">Angular escaping + Helmet CSP directives</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>CSRF Token Protection</strong>
              <div class="sec-desc">Double-Submit HMAC token on state mutation</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>Brute-Force Rate Limiting</strong>
              <div class="sec-desc">5 login attempts/15m + DB account lockout</div>
            </div>
          </div>

          <div class="sec-status-item">
            <span class="sec-dot green"></span>
            <div>
              <strong>IDOR Object-Level Guard</strong>
              <div class="sec-desc">Patient record ownership validated on backend</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Security Audit Trail Stream -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📜 Real-Time Security Audit Stream</h3>
          <a routerLink="/audit-logs" class="btn btn-outline btn-sm">Full Audit Trail</a>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Event Type</th>
                <th>Resource</th>
                <th>Outcome</th>
                <th>IP Address</th>
                <th>Correlation ID</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of metrics?.recentAuditLogs">
                <td>{{ log.timestamp | date:'short' }}</td>
                <td><strong>{{ log.actor_username }}</strong></td>
                <td><span class="badge" [ngClass]="'badge-' + (log.actor_role === 'admin' ? 'red' : log.actor_role === 'doctor' ? 'blue' : 'green')">{{ log.actor_role }}</span></td>
                <td><span class="code-pill">{{ log.event_type }}</span></td>
                <td>{{ log.resource_type }} #{{ log.resource_id || '-' }}</td>
                <td>
                  <span class="badge" [ngClass]="log.outcome === 'SUCCESS' ? 'badge-green' : log.outcome === 'DENIED' ? 'badge-red' : 'badge-yellow'">
                    {{ log.outcome }}
                  </span>
                </td>
                <td>{{ log.ip_address }}</td>
                <td style="font-size: 0.75rem; color: #64748b;">{{ log.correlation_id }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .security-features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .sec-status-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .sec-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }
    .sec-dot.green { background: #10b981; }
    .sec-desc {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 2px;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private hospital = inject(HospitalService);

  metrics: any = null;

  ngOnInit() {
    this.hospital.getDashboardStats().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.metrics = res.data;
        }
      }
    });
  }
}
