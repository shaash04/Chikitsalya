import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-provision-doctor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div style="max-width: 700px; margin: 0 auto;">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">👨‍⚕️ Provision Doctor Account</h2>
          <a routerLink="/admin/users" class="btn btn-outline btn-sm">Back</a>
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
              <label class="form-label" for="fullName">Physician Full Name *</label>
              <input id="fullName" class="form-control" placeholder="Dr. Jane Watson, MD" formControlName="fullName">
            </div>
            <div class="form-group">
              <label class="form-label" for="username">System Username *</label>
              <input id="username" class="form-control" placeholder="dr_watson" formControlName="username">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="email">Hospital Email *</label>
              <input id="email" type="email" class="form-control" placeholder="dr.watson@hospital.local" formControlName="email">
            </div>
            <div class="form-group">
              <label class="form-label" for="phone">Contact Phone</label>
              <input id="phone" class="form-control" placeholder="+1-555-0155" formControlName="phone">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Temporary Secure Password * (Min 8 chars, Upper, Lower, Number, Symbol)</label>
            <input id="password" type="password" class="form-control" placeholder="••••••••••••" formControlName="password">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="specialization">Medical Specialty *</label>
              <input id="specialization" class="form-control" placeholder="e.g. Oncology & Hematology" formControlName="specialization">
            </div>
            <div class="form-group">
              <label class="form-label" for="department">Clinical Department *</label>
              <input id="department" class="form-control" placeholder="e.g. Department of Oncology" formControlName="department">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="licenseNumber">Medical License / Council Registration *</label>
              <input id="licenseNumber" class="form-control" placeholder="MED-LIC-ONC-9921" formControlName="licenseNumber">
            </div>
            <div class="form-group">
              <label class="form-label" for="consultationFee">Consultation Fee (INR) *</label>
              <input id="consultationFee" type="number" class="form-control" placeholder="700" formControlName="consultationFee">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="availableDays">Clinic Days</label>
            <input id="availableDays" class="form-control" formControlName="availableDays">
          </div>

          <div class="form-group">
            <label class="form-label" for="bio">Professional Bio & Experience</label>
            <textarea id="bio" class="form-control" rows="2" placeholder="Brief clinical background..." formControlName="bio"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;" [disabled]="form.invalid || loading">
            <span *ngIf="loading">Provisioning Staff Account...</span>
            <span *ngIf="!loading">Provision Doctor Credentials</span>
          </button>
        </form>
      </div>
    </div>
  `
})
export class ProvisionDoctorComponent {
  private fb = inject(FormBuilder);
  private hospital = inject(HospitalService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['Doctor@Secure2026!', [Validators.required, Validators.minLength(8)]],
    specialization: ['', [Validators.required]],
    department: ['', [Validators.required]],
    licenseNumber: ['', [Validators.required]],
    consultationFee: [750, [Validators.required]],
    availableDays: ['Monday,Wednesday,Friday'],
    bio: ['']
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.hospital.provisionDoctor(this.form.value).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage = `Doctor account provisioned! Assigned Doctor Code: ${res.data.doctorCode}.`;
        setTimeout(() => this.router.navigate(['/admin/users']), 2000);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Failed to provision doctor account.';
      }
    });
  }
}
