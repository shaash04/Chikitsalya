import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-doctor-directory',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div>
      <div class="card-header">
        <div>
          <h1>Medical Staff Directory</h1>
          <p class="subtitle">Verified physicians and specialists practicing at SHMS</p>
        </div>
        <div class="search-box">
          <input 
            type="text" 
            class="form-control" 
            placeholder="🔍 Search doctor, specialty, department..." 
            [(ngModel)]="searchQuery" 
            (input)="onSearch()">
        </div>
      </div>

      <div class="doctors-grid">
        <div class="doctor-card" *ngFor="let doc of doctors">
          <div class="doc-avatar">👨‍⚕️</div>
          <div class="doc-info">
            <h3>{{ doc.full_name }}</h3>
            <div class="doc-specialty">{{ doc.specialization }}</div>
            <div class="doc-dept">{{ doc.department }}</div>
            <div class="doc-details">
              <div><strong>License:</strong> {{ doc.license_number }}</div>
              <div><strong>Fee:</strong> ₹{{ doc.consultation_fee }}</div>
              <div><strong>Available:</strong> {{ doc.available_days }}</div>
            </div>
            <div class="doc-bio" *ngIf="doc.bio">{{ doc.bio }}</div>
            <div class="doc-actions">
              <a routerLink="/appointments/book" class="btn btn-primary btn-sm">Book Consultation</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-box { width: 320px; }
    .doctors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .doctor-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      display: flex;
      gap: 16px;
    }
    .doc-avatar {
      font-size: 2.5rem;
      background: var(--primary-light);
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .doc-info { flex: 1; }
    .doc-specialty { color: var(--primary); font-weight: 700; font-size: 0.9rem; margin-top: 2px; }
    .doc-dept { color: #64748b; font-size: 0.8rem; margin-bottom: 10px; }
    .doc-details {
      font-size: 0.8rem;
      color: #334155;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .doc-bio { font-size: 0.85rem; color: #475569; margin-bottom: 14px; }
  `]
})
export class DoctorDirectoryComponent implements OnInit {
  private hospital = inject(HospitalService);
  doctors: any[] = [];
  searchQuery = '';

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.hospital.getDoctors(this.searchQuery).subscribe({
      next: (res: any) => {
        if (res.success) this.doctors = res.data;
      }
    });
  }

  onSearch() {
    this.loadDoctors();
  }
}
