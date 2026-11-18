import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="card-header">
        <div>
          <h1>Appointments Registry</h1>
          <p class="subtitle">Clinical consultation schedule and encounter logs</p>
        </div>
        <div *ngIf="auth.userRole() === 'patient'">
          <a routerLink="/appointments/book" class="btn btn-primary">➕ Book New Appointment</a>
        </div>
      </div>

      <div class="card">
        <div *ngIf="loading" class="empty-state">Loading appointments...</div>

        <div *ngIf="!loading && appointments.length === 0" class="empty-state">
          No appointments recorded.
        </div>

        <div *ngIf="!loading && appointments.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time Slot</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of appointments">
                <td><span class="code-pill">#{{ apt.id }}</span></td>
                <td><strong>{{ apt.patient_name }}</strong></td>
                <td>{{ apt.doctor_name }}</td>
                <td>{{ apt.specialization }}</td>
                <td>{{ apt.appointment_date }}</td>
                <td>{{ apt.time_slot }}</td>
                <td>{{ apt.reason }}</td>
                <td>
                  <span class="badge" [ngClass]="apt.status === 'scheduled' ? 'badge-blue' : apt.status === 'completed' ? 'badge-green' : 'badge-red'">
                    {{ apt.status }}
                  </span>
                </td>
                <td>
                  <div class="btn-group" *ngIf="apt.status === 'scheduled'">
                    <button class="btn btn-danger btn-sm" (click)="cancel(apt.id)">Cancel</button>
                    <button *ngIf="auth.userRole() === 'doctor' || auth.userRole() === 'admin'" class="btn btn-success btn-sm" (click)="complete(apt.id)">
                      ✓ Complete
                    </button>
                  </div>
                  <span *ngIf="apt.status !== 'scheduled'" style="color: #94a3b8; font-size: 0.8rem;">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-group { display: flex; gap: 6px; }
    .empty-state { padding: 40px; text-align: center; color: #64748b; }
  `]
})
export class AppointmentListComponent implements OnInit {
  auth = inject(AuthService);
  private hospital = inject(HospitalService);

  appointments: any[] = [];
  loading = true;

  ngOnInit() {
    this.loadAppointments();
  }

  loadAppointments() {
    this.loading = true;
    this.hospital.getMyAppointments().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.appointments = res.data;
      },
      error: () => this.loading = false
    });
  }

  cancel(id: number) {
    if (!confirm('Confirm appointment cancellation?')) return;
    this.hospital.cancelAppointment(id, 'Cancelled via appointment portal').subscribe({
      next: () => this.loadAppointments()
    });
  }

  complete(id: number) {
    this.hospital.updateAppointmentStatus(id, 'completed').subscribe({
      next: () => this.loadAppointments()
    });
  }
}
