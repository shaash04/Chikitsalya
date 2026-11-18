import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="card-header">
        <div>
          <h1>Electronic Medical Records (EMR)</h1>
          <p class="subtitle">Protected Health Information with Object-Level Access Enforcement</p>
        </div>
        <div *ngIf="auth.userRole() === 'doctor'">
          <a routerLink="/medical-records/new" class="btn btn-primary">📝 Add Medical Record</a>
        </div>
      </div>

      <div class="card">
        <div *ngIf="loading" class="empty-state">Loading clinical records...</div>

        <div *ngIf="!loading && records.length === 0" class="empty-state">
          No medical records found.
        </div>

        <div *ngIf="!loading && records.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Record Ref</th>
                <th>Encounter Date</th>
                <th>Patient</th>
                <th>Attending Doctor</th>
                <th>Primary Diagnosis</th>
                <th>Prescription</th>
                <th>Security / Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rec of records">
                <td><span class="code-pill">#{{ rec.id }}</span></td>
                <td>{{ rec.record_date }}</td>
                <td><strong>{{ rec.patient_name }}</strong> <span *ngIf="rec.patient_code">({{ rec.patient_code }})</span></td>
                <td>{{ rec.doctor_name }}</td>
                <td>{{ rec.diagnosis }}</td>
                <td>{{ rec.prescription }}</td>
                <td>
                  <a [routerLink]="['/medical-records', rec.id]" class="btn btn-outline btn-sm">
                    🔍 View Full Record
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .empty-state { padding: 40px; text-align: center; color: #64748b; }
  `]
})
export class RecordListComponent implements OnInit {
  auth = inject(AuthService);
  private hospital = inject(HospitalService);

  records: any[] = [];
  loading = true;

  ngOnInit() {
    this.hospital.getMyMedicalRecords().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.records = res.data;
      },
      error: () => this.loading = false
    });
  }
}
