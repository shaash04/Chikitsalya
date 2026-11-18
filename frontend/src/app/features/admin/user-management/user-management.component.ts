import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HospitalService } from '../../../core/services/hospital.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="card-header">
        <div>
          <h1>User Identity & Access Control Management</h1>
          <p class="subtitle">System account provisioning, role review, and state control</p>
        </div>
        <a routerLink="/admin/provision-doctor" class="btn btn-primary">➕ Provision New Doctor</a>
      </div>

      <div *ngIf="message" class="alert alert-info">
        <span>ℹ️</span> {{ message }}
      </div>

      <div class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Account Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td><span class="code-pill">#{{ u.id }}</span></td>
                <td><strong>{{ u.full_name }}</strong></td>
                <td>{{ u.username }}</td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="badge" [ngClass]="u.role === 'admin' ? 'badge-red' : u.role === 'doctor' ? 'badge-blue' : 'badge-green'">
                    {{ u.role }}
                  </span>
                </td>
                <td>
                  <span class="badge" [ngClass]="u.is_active === 1 ? 'badge-green' : 'badge-gray'">
                    {{ u.is_active === 1 ? 'Active' : 'Deactivated' }}
                  </span>
                </td>
                <td>
                  <button 
                    *ngIf="u.id !== auth.currentUser()?.id"
                    class="btn btn-sm" 
                    [ngClass]="u.is_active === 1 ? 'btn-danger' : 'btn-success'"
                    (click)="toggleStatus(u.id, u.is_active)">
                    {{ u.is_active === 1 ? 'Deactivate' : 'Activate' }}
                  </button>
                  <span *ngIf="u.id === auth.currentUser()?.id" style="font-size: 0.75rem; color: #94a3b8;">
                    (Current Admin)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  private hospital = inject(HospitalService);
  auth = inject(AuthService);

  users: any[] = [];
  message = '';

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.hospital.getAllUsers().subscribe({
      next: (res: any) => {
        if (res.success) this.users = res.data;
      }
    });
  }

  toggleStatus(userId: number, currentActive: number) {
    const newStatus = currentActive === 1 ? 0 : 1;
    this.hospital.setUserStatus(userId, newStatus).subscribe({
      next: (res: any) => {
        this.message = res.message;
        this.loadUsers();
      },
      error: (err: any) => {
        this.message = err.error?.error?.message || 'Operation failed.';
      }
    });
  }
}
