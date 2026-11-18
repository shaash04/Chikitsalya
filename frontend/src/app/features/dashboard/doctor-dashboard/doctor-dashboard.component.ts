import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="dashboard-header">
        <div>
          <h1>Doctor Clinical Console</h1>
          <p class="subtitle">Attending Physician: {{ auth.currentUser()?.fullName }} • {{ stats?.doctor?.specialization }}</p>
        </div>
        <div class="actions">
          <a routerLink="/medical-records/new" class="btn btn-primary">📝 Document Clinical Note</a>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info">
            <h4>Assigned Appointments</h4>
            <div class="stat-number">{{ stats?.totalAppointments || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon teal">🕒</div>
          <div class="stat-info">
            <h4>Scheduled Today</h4>
            <div class="stat-number">{{ stats?.upcomingAppointments?.length || 0 }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">📜</div>
          <div class="stat-info">
            <h4>License Number</h4>
            <div class="code-pill">{{ stats?.doctor?.license_number || 'MED-VERIFIED' }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">🏥</div>
          <div class="stat-info">
            <h4>Department</h4>
            <div style="font-size: 0.88rem; font-weight: 700;">{{ stats?.doctor?.department || 'Clinical Care' }}</div>
          </div>
        </div>
      </div>

      <!-- Assigned Patients & Encounters -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📅 Assigned Patient Encounters</h3>
          <span class="badge badge-teal">{{ stats?.upcomingAppointments?.length || 0 }} Active</span>
        </div>

        <div *ngIf="stats?.upcomingAppointments?.length === 0" class="empty-state">
          No appointments scheduled for this session.
        </div>

        <div *ngIf="stats?.upcomingAppointments?.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Patient Code</th>
                <th>Date & Slot</th>
                <th>Chief Complaint</th>
                <th>Status</th>
                <th>Clinical Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of stats.upcomingAppointments">
                <td><strong>{{ apt.patient_name }}</strong></td>
                <td><span class="code-pill">{{ apt.patient_code }}</span></td>
                <td>{{ apt.appointment_date }} ({{ apt.time_slot }})</td>
                <td>{{ apt.reason }}</td>
                <td><span class="badge badge-blue">{{ apt.status }}</span></td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-success btn-sm" (click)="updateStatus(apt.id, 'completed')">
                      ✓ Mark Completed
                    </button>
                    <button class="btn btn-outline btn-sm" (click)="updateStatus(apt.id, 'cancelled')">
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Clinical Diagnoses -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 Documented Clinical Records</h3>
          <a routerLink="/medical-records" class="btn btn-outline btn-sm">View Full EMR</a>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Diagnosis</th>
                <th>Prescription</th>
                <th>Confidential Clinical Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rec of stats?.recentRecords">
                <td>{{ rec.record_date }}</td>
                <td><strong>{{ rec.patient_name }}</strong></td>
                <td>{{ rec.diagnosis }}</td>
                <td>{{ rec.prescription }}</td>
                <td>
                  <span class="badge badge-yellow">Confidential (Physician Only)</span>
                  <div style="font-size: 0.8rem; color: #475569; margin-top: 4px;">{{ rec.confidential_notes || 'None' }}</div>
                </td>
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
    .btn-group {
      display: flex;
      gap: 6px;
    }
    .empty-state {
      padding: 32px;
      text-align: center;
      color: #64748b;
    }
  `]
})
export class DoctorDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private hospital = inject(HospitalService);

  stats: any = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.hospital.getDashboardStats().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats = res.data;
        }
      }
    });
  }

  updateStatus(id: number, status: string) {
    this.hospital.updateAppointmentStatus(id, status).subscribe({
      next: () => this.loadData()
    });
  }
}
