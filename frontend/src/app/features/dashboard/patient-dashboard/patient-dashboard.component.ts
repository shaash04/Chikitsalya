import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="dashboard-header">
        <div>
          <h1>Welcome, {{ auth.currentUser()?.fullName }}</h1>
          <p class="subtitle">Secure Patient Health Portal • Confidential Electronic Records</p>
        </div>
        <div class="actions">
          <a routerLink="/appointments/book" class="btn btn-primary">➕ Book New Appointment</a>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info">
            <h4>Upcoming Visits</h4>
            <div class="stat-number">{{ stats?.upcomingAppointments?.length || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon teal">📋</div>
          <div class="stat-info">
            <h4>Medical Records</h4>
            <div class="stat-number">{{ stats?.recentRecords?.length || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">🆔</div>
          <div class="stat-info">
            <h4>Patient Code</h4>
            <div class="code-pill">{{ stats?.patient?.patient_code || 'PAT-LOAD' }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">🩸</div>
          <div class="stat-info">
            <h4>Blood Group</h4>
            <div class="stat-number" style="font-size: 1.3rem;">{{ stats?.patient?.blood_group || 'O+' }}</div>
          </div>
        </div>
      </div>

      <!-- Main Layout Columns -->
      <div class="dashboard-layout">
        <!-- Upcoming Appointments -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📅 Upcoming Appointments</h3>
            <a routerLink="/appointments" class="btn btn-outline btn-sm">View All</a>
          </div>

          <div *ngIf="stats?.upcomingAppointments?.length === 0" class="empty-state">
            <p>You have no scheduled appointments.</p>
            <a routerLink="/appointments/book" class="btn btn-primary btn-sm" style="margin-top: 10px;">Schedule One Now</a>
          </div>

          <div *ngIf="stats?.upcomingAppointments?.length > 0" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let apt of stats.upcomingAppointments">
                  <td><strong>{{ apt.doctor_name }}</strong></td>
                  <td>{{ apt.specialization }}</td>
                  <td>{{ apt.appointment_date }} ({{ apt.time_slot }})</td>
                  <td><span class="badge badge-blue">{{ apt.status }}</span></td>
                  <td>
                    <button class="btn btn-danger btn-sm" (click)="cancelApt(apt.id)">Cancel</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Medical Records -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 Recent Clinical Diagnoses</h3>
            <a routerLink="/medical-records" class="btn btn-outline btn-sm">All Records</a>
          </div>

          <div *ngIf="stats?.recentRecords?.length === 0" class="empty-state">
            <p>No medical records on file.</p>
          </div>

          <div *ngIf="stats?.recentRecords?.length > 0" class="records-stream">
            <div *ngFor="let rec of stats.recentRecords" class="record-item">
              <div class="record-meta">
                <span class="record-date">📅 {{ rec.record_date }}</span>
                <span class="record-physician">Attending: {{ rec.doctor_name }}</span>
              </div>
              <div class="record-diag"><strong>Diagnosis:</strong> {{ rec.diagnosis }}</div>
              <div class="record-rx"><strong>Prescription:</strong> {{ rec.prescription }}</div>
              <div style="margin-top: 8px;">
                <a [routerLink]="['/medical-records', rec.id]" class="btn btn-outline btn-sm">View Clinical Details</a>
              </div>
            </div>
          </div>
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
    .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .empty-state {
      padding: 32px;
      text-align: center;
      color: #64748b;
    }
    .records-stream {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .record-item {
      padding: 16px;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .record-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 6px;
    }
    .record-diag {
      font-size: 0.95rem;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .record-rx {
      font-size: 0.85rem;
      color: #334155;
    }
  `]
})
export class PatientDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private hospital = inject(HospitalService);

  stats: any = null;

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.hospital.getDashboardStats().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats = res.data;
        }
      }
    });
  }

  cancelApt(id: number) {
    if (!confirm('Are you sure you wish to cancel this appointment?')) return;
    this.hospital.cancelAppointment(id, 'Patient cancelled via portal').subscribe({
      next: () => this.loadDashboard()
    });
  }
}
