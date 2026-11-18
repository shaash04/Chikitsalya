import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div style="max-width: 650px; margin: 0 auto;">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📅 Schedule Clinical Consultation</h2>
          <a routerLink="/appointments" class="btn btn-outline btn-sm">Back</a>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          <span>⚠️</span> {{ errorMessage }}
        </div>
        <div *ngIf="successMessage" class="alert alert-success">
          <span>✅</span> {{ successMessage }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="doctorId">Select Attending Physician *</label>
            <select id="doctorId" class="form-control" formControlName="doctorId">
              <option value="" disabled selected>-- Choose Doctor & Specialty --</option>
              <option *ngFor="let doc of doctors" [value]="doc.id">
                {{ doc.full_name }} — {{ doc.specialization }} (Fee: ₹{{ doc.consultation_fee }})
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="appointmentDate">Appointment Date *</label>
              <input id="appointmentDate" type="date" class="form-control" formControlName="appointmentDate">
            </div>

            <div class="form-group">
              <label class="form-label" for="timeSlot">Time Slot *</label>
              <select id="timeSlot" class="form-control" formControlName="timeSlot">
                <option value="09:00 AM">09:00 AM - 09:30 AM</option>
                <option value="09:30 AM">09:30 AM - 10:00 AM</option>
                <option value="10:30 AM">10:30 AM - 11:00 AM</option>
                <option value="11:30 AM">11:30 AM - 12:00 PM</option>
                <option value="02:00 PM">02:00 PM - 02:30 PM</option>
                <option value="03:00 PM">03:00 PM - 03:30 PM</option>
                <option value="04:30 PM">04:30 PM - 05:00 PM</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="reason">Chief Complaint / Reason for Visit *</label>
            <textarea id="reason" class="form-control" rows="3" placeholder="Describe symptoms or reasons for consultation..." formControlName="reason"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;" [disabled]="form.invalid || loading">
            <span *ngIf="loading">Securing Booking...</span>
            <span *ngIf="!loading">Confirm & Book Appointment</span>
          </button>
        </form>
      </div>
    </div>
  `
})
export class BookAppointmentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private hospital = inject(HospitalService);
  private router = inject(Router);

  doctors: any[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    doctorId: ['', [Validators.required]],
    appointmentDate: ['2026-11-05', [Validators.required]],
    timeSlot: ['10:30 AM', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(3)]]
  });

  ngOnInit() {
    this.hospital.getDoctors().subscribe({
      next: (res: any) => {
        if (res.success) this.doctors = res.data;
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      doctorId: Number(this.form.value.doctorId),
      appointmentDate: this.form.value.appointmentDate!,
      timeSlot: this.form.value.timeSlot!,
      reason: this.form.value.reason!
    };

    this.hospital.bookAppointment(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Appointment scheduled successfully! Redirecting...';
        setTimeout(() => this.router.navigate(['/appointments']), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Failed to book appointment.';
      }
    });
  }
}
