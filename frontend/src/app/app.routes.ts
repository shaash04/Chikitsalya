import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { PatientDashboardComponent } from './features/dashboard/patient-dashboard/patient-dashboard.component';
import { DoctorDashboardComponent } from './features/dashboard/doctor-dashboard/doctor-dashboard.component';
import { AdminDashboardComponent } from './features/dashboard/admin-dashboard/admin-dashboard.component';
import { AppointmentListComponent } from './features/appointments/appointment-list/appointment-list.component';
import { BookAppointmentComponent } from './features/appointments/book-appointment/book-appointment.component';
import { RecordListComponent } from './features/medical-records/record-list/record-list.component';
import { RecordDetailComponent } from './features/medical-records/record-detail/record-detail.component';
import { CreateRecordComponent } from './features/medical-records/create-record/create-record.component';
import { DoctorDirectoryComponent } from './features/doctors/doctor-directory/doctor-directory.component';
import { PatientProfileComponent } from './features/patients/patient-profile/patient-profile.component';
import { UserManagementComponent } from './features/admin/user-management/user-management.component';
import { ProvisionDoctorComponent } from './features/admin/provision-doctor/provision-doctor.component';
import { AuditLogViewerComponent } from './features/audit-logs/audit-log-viewer/audit-log-viewer.component';
import { SecurityDemoCenterComponent } from './features/security-demo/security-demo-center/security-demo-center.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'security-demo', component: SecurityDemoCenterComponent },

  // Patient Routes
  { path: 'patient/dashboard', component: PatientDashboardComponent, canActivate: [authGuard, roleGuard(['patient'])] },
  { path: 'patient/profile', component: PatientProfileComponent, canActivate: [authGuard, roleGuard(['patient'])] },
  { path: 'appointments/book', component: BookAppointmentComponent, canActivate: [authGuard, roleGuard(['patient'])] },

  // Doctor Routes
  { path: 'doctor/dashboard', component: DoctorDashboardComponent, canActivate: [authGuard, roleGuard(['doctor'])] },
  { path: 'medical-records/new', component: CreateRecordComponent, canActivate: [authGuard, roleGuard(['doctor'])] },

  // Admin Routes
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'admin/users', component: UserManagementComponent, canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'admin/provision-doctor', component: ProvisionDoctorComponent, canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'audit-logs', component: AuditLogViewerComponent, canActivate: [authGuard, roleGuard(['admin'])] },

  // Shared Authenticated Routes
  { path: 'appointments', component: AppointmentListComponent, canActivate: [authGuard] },
  { path: 'medical-records', component: RecordListComponent, canActivate: [authGuard] },
  { path: 'medical-records/:id', component: RecordDetailComponent, canActivate: [authGuard] },
  { path: 'doctors', component: DoctorDirectoryComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: 'login' }
];
