import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="navbar">
      <div class="nav-left">
        <a routerLink="/" class="brand-link">
          <div class="brand-icon">🏥</div>
          <div class="brand-text">
            <span class="brand-title">SHMS Hospital Portal</span>
            <span class="brand-badge">21CSE438T • Web Security</span>
          </div>
        </a>
      </div>

      <div class="nav-center">
        <a routerLink="/security-demo" routerLinkActive="nav-active" class="demo-pill">
          <span class="shield-dot"></span>
          🛡️ Security Demonstration Center
        </a>
      </div>

      <div class="nav-right">
        <ng-container *ngIf="auth.currentUser(); else guestTemplate">
          <div class="user-profile-badge">
            <div class="avatar-circle">
              {{ auth.currentUser()?.fullName?.charAt(0) || 'U' }}
            </div>
            <div class="user-details">
              <span class="user-name">{{ auth.currentUser()?.fullName }}</span>
              <span class="role-tag" [ngClass]="'role-' + auth.currentUser()?.role">
                {{ auth.currentUser()?.role | uppercase }}
              </span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm logout-btn" (click)="onLogout()" title="Terminate session">
            Sign Out
          </button>
        </ng-container>

        <ng-template #guestTemplate>
          <div class="guest-nav">
            <a routerLink="/login" routerLinkActive="btn-primary" class="btn btn-sm btn-outline">Sign In</a>
            <a routerLink="/register" class="btn btn-sm btn-primary">Patient Register</a>
          </div>
        </ng-template>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .navbar {
      height: 70px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);
    }
    .nav-left {
      display: flex;
      align-items: center;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .brand-icon {
      font-size: 2rem;
      background: #e0f2fe;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 1.12rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-center {
      display: flex;
      align-items: center;
    }
    .demo-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 8px 18px;
      border-radius: 9999px;
      color: #1d4ed8;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .demo-pill:hover, .demo-pill.nav-active {
      background: #dbeafe;
      border-color: #3b82f6;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
    }
    .shield-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2563eb;
    }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 14px 6px 8px;
      border-radius: 9999px;
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-details {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 0.84rem;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.1;
    }
    .role-tag {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .role-admin { color: #dc2626; }
    .role-doctor { color: #0284c7; }
    .role-patient { color: #16a34a; }
    .guest-nav {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    @media (max-width: 850px) {
      .nav-center { display: none; }
    }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);

  onLogout() {
    this.auth.logout().subscribe();
  }
}
