import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <!-- Role Label -->
      <div class="sidebar-header">
        <span class="role-badge" [ngClass]="'role-' + (auth.userRole() || 'guest')">
          {{ (auth.userRole() || 'Guest') | uppercase }} PORTAL
        </span>
      </div>

      <!-- Patient Navigation -->
      <ng-container *ngIf="auth.userRole() === 'patient'">
        <div class="sidebar-section-title">Patient Services</div>
        <nav class="nav-links">
          <a routerLink="/patient/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📊</span> Patient Overview
          </a>
          <a routerLink="/appointments/book" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">➕</span> Book Consultation
          </a>
          <a routerLink="/appointments" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
            <span class="nav-icon">📅</span> My Appointments
          </a>
          <a routerLink="/medical-records" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📋</span> My Health Records
          </a>
          <a routerLink="/doctors" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👨‍⚕️</span> Specialists Directory
          </a>
          <a routerLink="/patient/profile" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👤</span> Profile & Password
          </a>
        </nav>
      </ng-container>

      <!-- Doctor Navigation -->
      <ng-container *ngIf="auth.userRole() === 'doctor'">
        <div class="sidebar-section-title">Clinical Care</div>
        <nav class="nav-links">
          <a routerLink="/doctor/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🩺</span> Clinical Console
          </a>
          <a routerLink="/appointments" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📅</span> Patient Visits
          </a>
          <a routerLink="/medical-records" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
            <span class="nav-icon">📋</span> Clinical EMR Records
          </a>
          <a routerLink="/medical-records/new" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📝</span> Document Clinical Note
          </a>
          <a routerLink="/doctors" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👥</span> Medical Staff
          </a>
        </nav>
      </ng-container>

      <!-- Admin Navigation -->
      <ng-container *ngIf="auth.userRole() === 'admin'">
        <div class="sidebar-section-title">Administration</div>
        <nav class="nav-links">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🏛️</span> Control Center
          </a>
          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👥</span> User Management
          </a>
          <a routerLink="/admin/provision-doctor" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👨‍⚕️</span> Provision Doctor
          </a>
          <a routerLink="/appointments" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📅</span> All Appointments
          </a>
          <a routerLink="/medical-records" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📁</span> Medical Records
          </a>
          <a routerLink="/audit-logs" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📜</span> Security Audit Logs
          </a>
        </nav>
      </ng-container>

      <!-- Guest / Presentation Navigation -->
      <ng-container *ngIf="!auth.isAuthenticated()">
        <div class="sidebar-section-title">Evaluation Access</div>
        <nav class="nav-links">
          <a routerLink="/login" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🔐</span> Sign In
          </a>
          <a routerLink="/register" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🏥</span> Patient Registration
          </a>
        </nav>
      </ng-container>

      <div class="sidebar-divider"></div>
      <div class="sidebar-section-title">Evaluation Lab</div>

      <nav class="nav-links">
        <a routerLink="/security-demo" routerLinkActive="active" class="nav-item demo-item">
          <span class="nav-icon">🛡️</span> Security Demo Center
        </a>
      </nav>

      <!-- Active Controls Widget -->
      <div class="security-status-box">
        <div class="status-top">
          <span class="status-indicator"></span>
          <span class="status-text">Security Engine Active</span>
        </div>
        <ul class="status-list">
          <li>✓ Bcrypt Work Factor 12</li>
          <li>✓ Double-Submit CSRF</li>
          <li>✓ Anti-IDOR Object Guard</li>
          <li>✓ Strict CSP & Helmet</li>
          <li>✓ Database Audit Logs</li>
        </ul>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      width: 260px;
      flex-shrink: 0;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      min-height: calc(100vh - 70px);
    }
    .sidebar {
      width: 100%;
      height: 100%;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .sidebar-header {
      margin-bottom: 20px;
      padding: 0 4px;
    }
    .role-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .role-admin { background: #fee2e2; color: #dc2626; }
    .role-doctor { background: #e0f2fe; color: #0284c7; }
    .role-patient { background: #dcfce7; color: #16a34a; }
    .role-guest { background: #f1f5f9; color: #475569; }
    .sidebar-section-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0 10px;
      margin-bottom: 10px;
    }
    .sidebar-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 18px 0;
    }
    .nav-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      color: #334155;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .nav-icon {
      font-size: 1.15rem;
    }
    .nav-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .nav-item.active {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
    }
    .demo-item {
      background: #f0fdf4;
      border: 1px dashed #86efac;
      color: #166534;
    }
    .demo-item:hover, .demo-item.active {
      background: #dcfce7;
      border-color: #22c55e;
      color: #15803d;
    }
    .security-status-box {
      margin-top: auto;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      font-size: 0.75rem;
    }
    .status-top {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }
    .status-list {
      list-style: none;
      color: #64748b;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);
}
