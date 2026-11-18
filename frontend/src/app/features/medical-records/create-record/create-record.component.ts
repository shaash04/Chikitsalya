import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-create-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div style="max-width: 750px; margin: 0 auto;">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📝 Document Clinical Encounter</h2>
          <a routerLink="/medical-records" class="btn btn-outline btn-sm">Back</a>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          <span>⚠️</span> {{ errorMessage }}
        </div>
        <div *ngIf="successMessage" class="alert alert-success">
          <span>✅</span> {{ successMessage }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="patientId">Select Patient *</label>
              <select id="patientId" class="form-control" formControlName="patientId">
                <option value="" disabled selected>-- Choose Patient --</option>
                <option *ngFor="let p of patients" [value]="p.id">
                  {{ p.full_name }} ({{ p.patient_code }}) - Blood: {{ p.blood_group }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="recordDate">Encounter Date *</label>
              <input id="recordDate" type="date" class="form-control" formControlName="recordDate">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="diagnosis">Primary Clinical Diagnosis *</label>
            <input id="diagnosis" class="form-control" placeholder="e.g. Type 2 Diabetes Mellitus" formControlName="diagnosis">
          </div>

          <div class="form-group">
            <label class="form-label" for="symptoms">Symptoms & Clinical Presentation *</label>
            <textarea id="symptoms" class="form-control" rows="2" placeholder="Patient reported symptoms..." formControlName="symptoms"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="treatmentPlan">Treatment Plan *</label>
            <textarea id="treatmentPlan" class="form-control" rows="2" placeholder="Recommended clinical therapy..." formControlName="treatmentPlan"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="prescription">Pharmaceutical Prescription & Dosing *</label>
            <textarea id="prescription" class="form-control" rows="2" placeholder="Rx medications, frequency, duration..." formControlName="prescription"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="clinicalNotes">General Clinical Notes</label>
            <textarea id="clinicalNotes" class="form-control" rows="2" placeholder="Observations shared on report..." formControlName="clinicalNotes"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="confidentialNotes">
              🔒 Confidential Physician Notes <span style="color: #92400e; font-weight: normal;">(Redacted from patient portal view)</span>
            </label>
            <textarea id="confidentialNotes" class="form-control" rows="2" placeholder="Private differential diagnostic thoughts..." formControlName="confidentialNotes"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;" [disabled]="form.invalid || loading">
            <span *ngIf="loading">Saving Clinical Record...</span>
            <span *ngIf="!loading">Save & Seal Medical Record</span>
          </button>
        </form>
      </div>
    </div>
  `
})
export class CreateRecordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private hospital = inject(HospitalService);
  private router = inject(Router);

  patients: any[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    patientId: ['', [Validators.required]],
    recordDate: ['2026-11-01', [Validators.required]],
    diagnosis: ['', [Validators.required, Validators.minLength(3)]],
    symptoms: ['', [Validators.required]],
    treatmentPlan: ['', [Validators.required]],
    prescription: ['', [Validators.required]],
    clinicalNotes: [''],
    confidentialNotes: ['']
  });

  ngOnInit() {
    this.hospital.getAllPatients().subscribe({
      next: (res: any) => {
        if (res.success) this.patients = res.data;
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      ...this.form.value,
      patientId: Number(this.form.value.patientId)
    };

    this.hospital.createMedicalRecord(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Record created successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/medical-records']), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Failed to document record.';
      }
    });
  }
}
