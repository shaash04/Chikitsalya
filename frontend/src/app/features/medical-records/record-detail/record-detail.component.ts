import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-record-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="max-width: 800px; margin: 0 auto;">
      <div class="card" *ngIf="record">
        <div class="card-header">
          <div>
            <span class="badge badge-teal">Official Medical Record</span>
            <h2 class="card-title" style="margin-top: 6px;">Clinical Encounter: {{ record.diagnosis }}</h2>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
              Encounter Date: <strong>{{ record.record_date }}</strong> • Record UUID: {{ record.uuid }}
            </div>
          </div>
          <a routerLink="/medical-records" class="btn btn-outline btn-sm">Back</a>
        </div>

        <div class="meta-section">
          <div>
            <div class="meta-label">Patient Name</div>
            <div class="meta-val">{{ record.patient_name }} ({{ record.patient_code || 'Verified' }})</div>
          </div>
          <div>
            <div class="meta-label">Attending Physician</div>
            <div class="meta-val">{{ record.doctor_name }}</div>
          </div>
          <div>
            <div class="meta-label">Record Reference ID</div>
            <div class="code-pill">#{{ record.id }}</div>
          </div>
        </div>

        <div class="clinical-block">
          <h4>Presented Symptoms & Clinical Observations</h4>
          <p>{{ record.symptoms }}</p>
        </div>

        <div class="clinical-block">
          <h4>Treatment Plan & Lifestyle Prescriptions</h4>
          <p>{{ record.treatment_plan }}</p>
        </div>

        <div class="clinical-block rx-block">
          <h4>💊 Pharmaceutical Prescription & Dosing</h4>
          <div class="prescription-text">{{ record.prescription }}</div>
        </div>

        <div class="clinical-block" *ngIf="record.clinical_notes">
          <h4>General Clinical Notes</h4>
          <p>{{ record.clinical_notes }}</p>
        </div>

        <!-- Confidential Doctor Notes (Only visible to Doctors/Privileged) -->
        <div class="clinical-block confidential-block" *ngIf="record.confidential_notes">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span class="badge badge-yellow">Confidential Physician Worknotes</span>
            <span style="font-size: 0.75rem; color: #92400e;">(Least Privilege: Redacted from Patient View)</span>
          </div>
          <p>{{ record.confidential_notes }}</p>
        </div>

        <div class="security-footer-badge">
          🛡️ Verified by SHMS Object-Level Authorization Middleware (No IDOR Exposure)
        </div>
      </div>

      <!-- Access Denied State (IDOR Demonstration) -->
      <div class="card" *ngIf="errorMessage">
        <div class="alert alert-danger" style="margin-bottom: 0;">
          <div style="font-size: 1.5rem;">🛑</div>
          <div>
            <strong>Object-Level Access Denied (IDOR Protection)</strong>
            <p style="margin-top: 4px; font-size: 0.9rem;">{{ errorMessage }}</p>
            <div style="margin-top: 10px;">
              <a routerLink="/medical-records" class="btn btn-outline btn-sm">Return to Permitted Records</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .meta-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .meta-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .meta-val { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .clinical-block {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .clinical-block h4 { font-size: 0.9rem; text-transform: uppercase; color: #475569; margin-bottom: 6px; letter-spacing: 0.03em; }
    .clinical-block p { font-size: 0.95rem; color: #1e293b; line-height: 1.6; }
    .rx-block {
      background: #f0fdf4;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #bbf7d0;
    }
    .prescription-text { font-family: var(--font-mono); font-size: 0.9rem; color: #166534; font-weight: 600; }
    .confidential-block {
      background: #fffbeb;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #fde68a;
    }
    .security-footer-badge {
      margin-top: 24px;
      text-align: center;
      font-size: 0.78rem;
      color: #0369a1;
      font-weight: 600;
      background: #f0f9ff;
      padding: 8px;
      border-radius: 6px;
    }
  `]
})
export class RecordDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private hospital = inject(HospitalService);
  auth = inject(AuthService);

  record: any = null;
  errorMessage = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.hospital.getMedicalRecordById(id).subscribe({
      next: (res: any) => {
        if (res.success) this.record = res.data;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.error?.message || 'Access denied: You do not have authorization to view this medical record.';
      }
    });
  }
}
