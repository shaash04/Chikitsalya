import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { patientController } from '../controllers/patientController.js';
import { doctorController } from '../controllers/doctorController.js';
import { appointmentController } from '../controllers/appointmentController.js';
import { medicalRecordController } from '../controllers/medicalRecordController.js';
import { adminController } from '../controllers/adminController.js';
import { auditLogController } from '../controllers/auditLogController.js';
import { securityDemoController } from '../controllers/securityDemoController.js';
import { getCsrfTokenHandler } from '../middleware/csrf.js';
import { requireAuthentication, requireRole, requireRecordAccess } from '../middleware/rbac.js';
import { loginRateLimiter, sensitiveActionRateLimiter } from '../middleware/rateLimiter.js';
import { adminService } from '../services/adminService.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { medicalRecordRepository } from '../repositories/medicalRecordRepository.js';
import { env } from '../config/env.js';

export const apiRouter = Router();

// =============================================================================
// PUBLIC & TOKEN ENDPOINTS
// =============================================================================
apiRouter.get('/csrf-token', getCsrfTokenHandler);
apiRouter.get('/health', (req, res) => res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() }));

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================
apiRouter.post('/auth/login', loginRateLimiter, (req, res, next) => authController.login(req, res, next));
apiRouter.post('/auth/register', (req, res, next) => authController.registerPatient(req, res, next));
apiRouter.post('/auth/logout', (req, res, next) => authController.logout(req, res, next));
apiRouter.get('/auth/session', (req, res, next) => authController.getSession(req, res, next));
apiRouter.post('/auth/change-password', requireAuthentication, sensitiveActionRateLimiter, (req, res, next) => authController.changePassword(req, res, next));

// Development-only lockout & demo account reset route (never exposed in production)
if (env.NODE_ENV !== 'production') {
  apiRouter.post('/auth/dev-reset-lockouts', (req, res, next) => authController.devResetDemoAccounts(req, res, next));
  apiRouter.get('/auth/dev-reset-lockouts', (req, res, next) => authController.devResetDemoAccounts(req, res, next));
}

// =============================================================================
// DASHBOARD AGGREGATE ROUTE (ROLE-AWARE)
// =============================================================================
apiRouter.get('/dashboard/stats', requireAuthentication, async (req, res, next) => {
  try {
    const user = req.sessionUser!;
    if (user.role === 'admin') {
      const stats = await adminService.getDashboardStats();
      return res.json({ success: true, data: stats });
    }

    if (user.role === 'doctor') {
      const doctor = await doctorRepository.findByUserId(user.userId);
      if (!doctor) return res.status(404).json({ success: false, error: { message: 'Doctor profile not found' } });
      const appointments = await appointmentRepository.findByDoctorId(doctor.id);
      const records = await medicalRecordRepository.findByDoctorId(doctor.id);
      return res.json({
        success: true,
        data: {
          doctor,
          totalAppointments: appointments.length,
          upcomingAppointments: appointments.filter(a => a.status === 'scheduled'),
          recentRecords: records.slice(0, 5)
        }
      });
    }

    if (user.role === 'patient') {
      const patient = await patientRepository.findByUserId(user.userId);
      if (!patient) return res.status(404).json({ success: false, error: { message: 'Patient profile not found' } });
      const appointments = await appointmentRepository.findByPatientId(patient.id);
      const records = await medicalRecordRepository.findByPatientId(patient.id);
      return res.json({
        success: true,
        data: {
          patient,
          upcomingAppointments: appointments.filter(a => a.status === 'scheduled'),
          recentRecords: records.slice(0, 5).map(r => ({ ...r, confidential_notes: null }))
        }
      });
    }

    return res.status(400).json({ success: false, error: { message: 'Unknown role' } });
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// PATIENTS ROUTES
// =============================================================================
apiRouter.get('/patients/profile', requireAuthentication, requireRole('patient'), (req, res, next) => patientController.getProfile(req, res, next));
apiRouter.put('/patients/profile', requireAuthentication, requireRole('patient'), (req, res, next) => patientController.updateProfile(req, res, next));
apiRouter.get('/patients', requireAuthentication, requireRole('doctor', 'admin'), (req, res, next) => patientController.getAllPatients(req, res, next));

// =============================================================================
// DOCTORS ROUTES
// =============================================================================
apiRouter.get('/doctors', requireAuthentication, (req, res, next) => doctorController.getDirectory(req, res, next));
apiRouter.get('/doctors/profile', requireAuthentication, requireRole('doctor'), (req, res, next) => doctorController.getMyProfile(req, res, next));
apiRouter.get('/doctors/:id', requireAuthentication, (req, res, next) => doctorController.getDoctorById(req, res, next));

// =============================================================================
// APPOINTMENTS ROUTES
// =============================================================================
apiRouter.get('/appointments', requireAuthentication, (req, res, next) => appointmentController.getMyAppointments(req, res, next));
apiRouter.get('/appointments/:id', requireAuthentication, (req, res, next) => appointmentController.getAppointmentById(req, res, next));
apiRouter.post('/appointments', requireAuthentication, requireRole('patient'), (req, res, next) => appointmentController.bookAppointment(req, res, next));
apiRouter.put('/appointments/:id/cancel', requireAuthentication, (req, res, next) => appointmentController.cancelAppointment(req, res, next));
apiRouter.put('/appointments/:id/status', requireAuthentication, requireRole('doctor', 'admin'), (req, res, next) => appointmentController.updateStatus(req, res, next));

// =============================================================================
// MEDICAL RECORDS ROUTES (OBJECT-LEVEL AUTHORIZATION & IDOR GUARD)
// =============================================================================
apiRouter.get('/medical-records', requireAuthentication, (req, res, next) => medicalRecordController.getMyRecords(req, res, next));
apiRouter.get('/medical-records/:id', requireAuthentication, requireRecordAccess, (req, res, next) => medicalRecordController.getRecordById(req, res, next));
apiRouter.post('/medical-records', requireAuthentication, requireRole('doctor'), (req, res, next) => medicalRecordController.createRecord(req, res, next));

// =============================================================================
// ADMINISTRATOR ROUTES
// =============================================================================
apiRouter.get('/admin/users', requireAuthentication, requireRole('admin'), (req, res, next) => adminController.getAllUsers(req, res, next));
apiRouter.put('/admin/users/:id/status', requireAuthentication, requireRole('admin'), (req, res, next) => adminController.updateUserStatus(req, res, next));
apiRouter.post('/admin/doctors', requireAuthentication, requireRole('admin'), sensitiveActionRateLimiter, (req, res, next) => adminController.provisionDoctor(req, res, next));
apiRouter.get('/admin/dashboard', requireAuthentication, requireRole('admin'), (req, res, next) => adminController.getDashboardMetrics(req, res, next));

// =============================================================================
// AUDIT LOGS ROUTES
// =============================================================================
apiRouter.get('/audit-logs', requireAuthentication, requireRole('admin'), (req, res, next) => auditLogController.getAuditLogs(req, res, next));

// =============================================================================
// SECURITY DEMONSTRATION CENTER ROUTES
// =============================================================================
apiRouter.get('/security-demo/features', (req, res) => securityDemoController.getFeaturesMatrix(req, res));
apiRouter.post('/security-demo/test-password-hash', (req, res, next) => securityDemoController.testPasswordHash(req, res, next));
apiRouter.post('/security-demo/test-sqli', (req, res, next) => securityDemoController.testSqlInjection(req, res, next));
apiRouter.post('/security-demo/test-xss', (req, res) => securityDemoController.testXss(req, res));
apiRouter.post('/security-demo/test-csrf', (req, res) => securityDemoController.testCsrf(req, res));
apiRouter.post('/security-demo/test-idor', (req, res, next) => securityDemoController.testIdor(req, res, next));
apiRouter.get('/security-demo/test-headers', (req, res) => securityDemoController.getSecurityHeaders(req, res));
apiRouter.get('/security-demo/test-audit', (req, res, next) => securityDemoController.getAuditLogs(req, res, next));
apiRouter.get('/security-demo/test-config', (req, res) => securityDemoController.getSecureConfig(req, res));
