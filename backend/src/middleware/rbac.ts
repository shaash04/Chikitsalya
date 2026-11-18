import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { medicalRecordRepository } from '../repositories/medicalRecordRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';

/**
 * Require valid authenticated session
 */
export function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  if (!req.sessionUser) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Please log in with valid credentials.'
      }
    });
  }
  next();
}

/**
 * Require specific user role (RBAC)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.sessionUser) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.'
        }
      });
    }

    if (!roles.includes(req.sessionUser.role)) {
      // Record access denial to audit trail
      auditLogRepository.record({
        actorUserId: req.sessionUser.userId,
        actorUsername: req.sessionUser.username,
        actorRole: req.sessionUser.role,
        eventType: 'ACCESS_DENIED_RBAC',
        resourceType: 'API_ENDPOINT',
        resourceId: req.originalUrl,
        outcome: 'DENIED',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId || 'rbac-denied',
        metadata: { requiredRoles: roles, userRole: req.sessionUser.role }
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role '${req.sessionUser.role}' lacks permission for this administrative/clinical resource.`
        }
      });
    }

    next();
  };
}

/**
 * Object-Level Authorization Middleware for Medical Records (IDOR Prevention)
 * Enforces least privilege:
 * 1. Patient may ONLY view their own records.
 * 2. Doctor may ONLY view records for patients they treat.
 * 3. Prevents unauthorized parameter tampering (e.g. GET /api/medical-records/123)
 */
export async function requireRecordAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.sessionUser) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' }
    });
  }

  const recordId = Number(req.params.id);
  if (!recordId || isNaN(recordId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid medical record identifier.' }
    });
  }

  try {
    const record = await medicalRecordRepository.findById(recordId);
    if (!record) {
      // 404 to avoid disclosing existence of private records
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Requested medical record was not found.' }
      });
    }

    const { role, userId } = req.sessionUser;

    // PATIENT CHECK: must own the record
    if (role === 'patient') {
      const patientProfile = await patientRepository.findByUserId(userId);
      if (!patientProfile || patientProfile.id !== record.patient_id) {
        auditLogRepository.record({
          actorUserId: userId,
          actorUsername: req.sessionUser.username,
          actorRole: role,
          eventType: 'IDOR_PREVENTED',
          resourceType: 'MEDICAL_RECORD',
          resourceId: String(recordId),
          outcome: 'DENIED',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'],
          correlationId: req.correlationId || 'idor-check',
          metadata: { attemptedRecordId: recordId, ownerPatientId: record.patient_id }
        }).catch(() => {});

        return res.status(403).json({
          success: false,
          error: {
            code: 'OBJECT_ACCESS_DENIED',
            message: 'Access denied: You are not authorized to view another patient\'s medical record.'
          }
        });
      }
    }

    // DOCTOR CHECK: doctor must be author or assigned doctor
    if (role === 'doctor') {
      const doctorProfile = await doctorRepository.findByUserId(userId);
      if (!doctorProfile || doctorProfile.id !== record.doctor_id) {
        // Can also allow if doctor has scheduled appointment with patient, otherwise deny
        auditLogRepository.record({
          actorUserId: userId,
          actorUsername: req.sessionUser.username,
          actorRole: role,
          eventType: 'DOCTOR_UNAUTHORIZED_RECORD_ACCESS',
          resourceType: 'MEDICAL_RECORD',
          resourceId: String(recordId),
          outcome: 'DENIED',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'],
          correlationId: req.correlationId || 'doctor-access',
          metadata: { attemptedRecordId: recordId, authorDoctorId: record.doctor_id }
        }).catch(() => {});

        return res.status(403).json({
          success: false,
          error: {
            code: 'DOCTOR_ACCESS_DENIED',
            message: 'Access denied: You are not the attending physician for this patient record.'
          }
        });
      }
    }

    // ADMIN: admin can oversee record existence/compliance but clinical notes should be audited
    if (role === 'admin') {
      auditLogRepository.record({
        actorUserId: userId,
        actorUsername: req.sessionUser.username,
        actorRole: role,
        eventType: 'ADMIN_RECORD_AUDIT_INSPECTION',
        resourceType: 'MEDICAL_RECORD',
        resourceId: String(recordId),
        outcome: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId || 'admin-audit',
        metadata: { inspectedRecordId: recordId }
      }).catch(() => {});
    }

    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'AUTHORIZATION_ERROR', message: 'Failed to verify object-level authorization.' }
    });
  }
}
