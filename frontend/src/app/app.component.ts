import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="shms-layout">
      <app-navbar></app-navbar>

      <div class="body-wrapper">
        <app-sidebar *ngIf="!isAuthPage()"></app-sidebar>

        <main class="page-viewport" [class.full-width]="isAuthPage()">
          <div class="viewport-inner">
            <router-outlet></router-outlet>
          </div>

          <footer class="system-footer">
            <div class="footer-left">
              <strong>Secure Hospital Management System (SHMS)</strong> • Academic Web Security Evaluation Project
            </div>
            <div class="footer-right">
              <span class="security-stamp">
                🔒 Cryptographic Integrity Verified • Salted Bcrypt • RBAC & Anti-IDOR Enforced
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f8fafc;
    }
    .shms-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .body-wrapper {
      display: flex;
      flex: 1;
      width: 100%;
      min-height: calc(100vh - 70px);
    }
    .page-viewport {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: #f8fafc;
    }
    .page-viewport.full-width {
      width: 100%;
    }
    .viewport-inner {
      flex: 1;
      padding: 32px 40px;
    }
    .system-footer {
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      padding: 16px 40px;
      margin-top: auto;
      font-size: 0.8rem;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .security-stamp {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: #0284c7;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 4px 10px;
      border-radius: 6px;
    }
    @media (max-width: 768px) {
      .body-wrapper {
        flex-direction: column;
      }
      .viewport-inner {
        padding: 20px 16px;
      }
      .system-footer {
        padding: 16px;
      }
    }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
  router = inject(Router);

  isAuthPage(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/login' || url === '/register';
  }
}
