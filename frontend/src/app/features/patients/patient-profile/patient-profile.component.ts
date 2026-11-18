import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HospitalService } from '../../../core/services/hospital.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div style="max-width: 750px; margin: 0 auto;">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">👤 Patient Health Profile</h2>
            <p class="subtitle" style="margin-bottom: 0;">Update permitted contact and emergency medical notes</p>
          </div>
          <span class="code-pill">{{ profile?.patient_code || 'PAT-LOAD' }}</span>
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          <span>✅</span> {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger">
          <span>⚠️</span> {{ errorMessage }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="fullName">Full Name *</label>
              <input id="fullName" class="form-control" formControlName="fullName">
            </div>
            <div class="form-group">
              <label class="form-label" for="phone">Phone Number</label>
              <input id="phone" class="form-control" formControlName="phone">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date of Birth</label>
              <input class="form-control" [value]="profile?.date_of_birth" disabled>
            </div>
            <div class="form-group">
              <label class="form-label">Blood Group</label>
              <input class="form-control" [value]="profile?.blood_group" disabled>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="emergencyContact">Emergency Contact *</label>
            <input id="emergencyContact" class="form-control" formControlName="emergencyContact">
          </div>

          <div class="form-group">
            <label class="form-label" for="address">Residential Address *</label>
            <input id="address" class="form-control" formControlName="address">
          </div>

          <div class="form-group">
            <label class="form-label" for="allergies">Known Allergies</label>
            <textarea id="allergies" class="form-control" rows="2" formControlName="allergies"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="medicalHistory">Medical History</label>
            <textarea id="medicalHistory" class="form-control" rows="2" formControlName="medicalHistory"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading">
            <span *ngIf="loading">Saving...</span>
            <span *ngIf="!loading">Update Profile Information</span>
          </button>
        </form>
      </div>

      <!-- Change Password Card -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-header">
          <h3 class="card-title">🔑 Change Account Password</h3>
        </div>

        <div *ngIf="pwdSuccess" class="alert alert-success"><span>✅</span> {{ pwdSuccess }}</div>
        <div *ngIf="pwdError" class="alert alert-danger"><span>⚠️</span> {{ pwdError }}</div>

        <form [formGroup]="pwdForm" (ngSubmit)="onChangePassword()">
          <div class="form-group">
            <label class="form-label" for="currPass">Current Password</label>
            <input id="currPass" type="password" class="form-control" formControlName="currentPassword">
          </div>
          <div class="form-group">
            <label class="form-label" for="newPass">New Password (Min 8 chars, Upper, Lower, Number, Symbol)</label>
            <input id="newPass" type="password" class="form-control" formControlName="newPassword">
          </div>
          <button type="submit" class="btn btn-secondary" [disabled]="pwdForm.invalid">
            Change Password
          </button>
        </form>
      </div>
    </div>
  `
})
export class PatientProfileComponent implements OnInit {
  private hospital = inject(HospitalService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  profile: any = null;
  loading = false;
  successMessage = '';
  errorMessage = '';

  pwdSuccess = '';
  pwdError = '';

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    phone: [''],
    emergencyContact: ['', [Validators.required]],
    address: ['', [Validators.required]],
    allergies: [''],
    medicalHistory: ['']
  });

  pwdForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit() {
    this.hospital.getPatientProfile().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.profile = res.data;
          this.form.patchValue({
            fullName: this.profile.full_name,
            phone: this.profile.phone,
            emergencyContact: this.profile.emergency_contact,
            address: this.profile.address,
            allergies: this.profile.allergies,
            medicalHistory: this.profile.medical_history
          });
        }
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.hospital.updatePatientProfile(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Profile updated successfully!';
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Update failed.';
      }
    });
  }

  onChangePassword() {
    if (this.pwdForm.invalid) return;
    this.pwdSuccess = '';
    this.pwdError = '';

    const { currentPassword, newPassword } = this.pwdForm.value;
    this.auth.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.pwdSuccess = 'Password updated successfully!';
        this.pwdForm.reset();
      },
      error: (err: any) => {
        this.pwdError = err.error?.error?.message || 'Password change failed.';
      }
    });
  }
}
