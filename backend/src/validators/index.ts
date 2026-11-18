import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format').max(100),
  password: z.string().min(1, 'Password is required').max(128)
});

export const registerPatientSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  email: z.string().trim().email('Invalid email format').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9\-\s]{7,20}$/, 'Invalid phone number format').optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  emergencyContact: z.string().trim().min(5).max(100),
  address: z.string().trim().min(5).max(255),
  allergies: z.string().trim().max(500).optional().nullable(),
  medicalHistory: z.string().trim().max(1000).optional().nullable()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long').max(128)
});

export const createDoctorSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email().max(100),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  specialization: z.string().trim().min(3).max(100),
  department: z.string().trim().min(3).max(100),
  licenseNumber: z.string().trim().min(4).max(50),
  consultationFee: z.coerce.number().positive(),
  bio: z.string().trim().max(1000).optional().nullable(),
  availableDays: z.string().trim().default('Monday,Tuesday,Wednesday,Thursday,Friday')
});

export const createAppointmentSchema = z.object({
  doctorId: z.coerce.number().int().positive('Doctor ID must be a positive integer'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  timeSlot: z.string().trim().min(2).max(20),
  reason: z.string().trim().min(3).max(255)
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  cancellationReason: z.string().trim().max(255).optional().nullable()
});

export const rescheduleAppointmentSchema = z.object({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  timeSlot: z.string().trim().min(2).max(20)
});

export const createMedicalRecordSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Record date must be YYYY-MM-DD'),
  diagnosis: z.string().trim().min(3).max(255),
  symptoms: z.string().trim().min(3).max(2000),
  treatmentPlan: z.string().trim().min(3).max(2000),
  prescription: z.string().trim().min(3).max(2000),
  clinicalNotes: z.string().trim().max(2000).optional().nullable(),
  confidentialNotes: z.string().trim().max(2000).optional().nullable()
});

export const updateUserStatusSchema = z.object({
  isActive: z.coerce.number().int().min(0).max(1)
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID parameter must be a positive integer')
});

export const searchSchema = z.object({
  q: z.string().trim().max(100).optional()
});

// =============================================================================
// Two-Factor Authentication & Session Management Schemas
// =============================================================================

export const enable2FASchema = z.object({
  secret: z.string().min(16).max(64),
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be a 6-digit numeric string'),
  recoveryCodes: z.array(
    z.object({
      hash: z.string(),
      used: z.boolean(),
      usedAt: z.string().nullable()
    })
  ).min(1, 'Recovery codes array is required')
});

export const verifyLogin2FASchema = z.object({
  tempToken: z.string().min(10, 'Temporary 2FA token is required'),
  code: z.string().trim().min(4, 'Code is required').max(30),
  isRecoveryCode: z.boolean().optional().default(false)
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Current password is required to disable 2FA'),
  code: z.string().trim().min(4, 'Verification code or recovery code is required').max(30)
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(10).max(128)
});
