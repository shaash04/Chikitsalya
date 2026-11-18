import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-audit-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="card-header">
        <div>
          <h1>Security Audit Trail</h1>
          <p class="subtitle">Immutable forensic log of authentications, authorizations, and clinical access</p>
        </div>
        <div class="filter-controls">
          <select class="form-control filter-select" [(ngModel)]="outcomeFilter" (change)="loadLogs()">
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="DENIED">DENIED (Security Violation)</option>
          </select>
          <button class="btn btn-outline btn-sm" (click)="loadLogs()">🔄 Refresh</button>
        </div>
      </div>

      <div class="card">
        <div *ngIf="loading" class="empty-state">Loading audit logs from database...</div>

        <div *ngIf="!loading && logs.length === 0" class="empty-state">
          No audit logs matching selected filter.
        </div>

        <div *ngIf="!loading && logs.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Actor User</th>
                <th>Role</th>
                <th>Event Type</th>
                <th>Resource Target</th>
                <th>Outcome</th>
                <th>IP Address</th>
                <th>Correlation ID</th>
                <th>Forensic Metadata</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs">
                <td><span class="code-pill">#{{ log.id }}</span></td>
                <td style="white-space: nowrap;">{{ log.timestamp | date:'short' }}</td>
                <td><strong>{{ log.actor_username }}</strong></td>
                <td>
                  <span class="badge" [ngClass]="log.actor_role === 'admin' ? 'badge-red' : log.actor_role === 'doctor' ? 'badge-blue' : 'badge-green'">
                    {{ log.actor_role }}
                  </span>
                </td>
                <td><span class="code-pill">{{ log.event_type }}</span></td>
                <td>{{ log.resource_type }} <span *ngIf="log.resource_id">#{{ log.resource_id }}</span></td>
                <td>
                  <span class="badge" [ngClass]="log.outcome === 'SUCCESS' ? 'badge-green' : log.outcome === 'DENIED' ? 'badge-red' : 'badge-yellow'">
                    {{ log.outcome }}
                  </span>
                </td>
                <td style="font-family: var(--font-mono); font-size: 0.8rem;">{{ log.ip_address }}</td>
                <td style="font-family: var(--font-mono); font-size: 0.75rem; color: #64748b;">{{ log.correlation_id }}</td>
                <td style="font-size: 0.8rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ log.metadata || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-controls { display: flex; gap: 10px; align-items: center; }
    .filter-select { width: 180px; padding: 6px 12px; }
    .empty-state { padding: 40px; text-align: center; color: #64748b; }
  `]
})
export class AuditLogViewerComponent implements OnInit {
  private hospital = inject(HospitalService);

  logs: any[] = [];
  outcomeFilter = '';
  loading = true;

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.loading = true;
    this.hospital.getAuditLogs({ outcome: this.outcomeFilter || undefined, limit: 100 }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.logs = res.data;
      },
      error: () => this.loading = false
    });
  }
}
