import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { medicalRecordRepository } from '../repositories/medicalRecordRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { hashPassword, validatePasswordStrength } from '../utils/security.js';
import { SessionData, SafeUser } from '../types/index.js';
import { Request } from 'express';

export class AdminService {
  async provisionDoctor(
    data: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      phone?: string | null;
      specialization: string;
      department: string;
      licenseNumber: string;
      consultationFee: number;
      bio?: string | null;
      availableDays: string;
    },
    admin: SessionData,
    req: Request
  ): Promise<{ doctorId: number; userId: number; doctorCode: string }> {
    const strength = validatePasswordStrength(data.password);
    if (!strength.valid) throw new Error(`WEAK_PASSWORD:${strength.reason}`);

    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) throw new Error('EMAIL_EXISTS');

    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) throw new Error('USERNAME_EXISTS');

    const passwordHash = await hashPassword(data.password);
    const userUuid = uuidv4();

    const userId = await userRepository.create({
      uuid: userUuid,
      username: data.username,
      email: data.email,
      passwordHash,
      role: 'doctor',
      fullName: data.fullName,
      phone: data.phone
    });

    const doctorCode = `DOC-${Math.floor(2000 + Math.random() * 8000)}`;
    const doctorId = await doctorRepository.create({
      userId,
      doctorCode,
      specialization: data.specialization,
      department: data.department,
      licenseNumber: data.licenseNumber,
      consultationFee: data.consultationFee,
      bio: data.bio,
      availableDays: data.availableDays
    });

    await auditLogRepository.record({
      actorUserId: admin.userId,
      actorUsername: admin.username,
      actorRole: 'admin',
      eventType: 'ADMIN_PROVISION_DOCTOR',
      resourceType: 'DOCTOR',
      resourceId: String(doctorId),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { doctorCode, specialization: data.specialization }
    });

    return { doctorId, userId, doctorCode };
  }

  async getAllUsers(): Promise<SafeUser[]> {
    return userRepository.findAllSafe();
  }

  async setUserActiveStatus(targetUserId: number, isActive: number, admin: SessionData, req: Request): Promise<void> {
    if (targetUserId === admin.userId) {
      throw new Error('CANNOT_DEACTIVATE_SELF');
    }

    await userRepository.setActiveStatus(targetUserId, isActive);

    await auditLogRepository.record({
      actorUserId: admin.userId,
      actorUsername: admin.username,
      actorRole: 'admin',
      eventType: 'ADMIN_USER_STATUS_CHANGE',
      resourceType: 'USER',
      resourceId: String(targetUserId),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { targetUserId, newActiveStatus: isActive }
    });
  }

  async getDashboardStats() {
    const totalPatients = await patientRepository.count();
    const totalDoctors = await doctorRepository.count();
    const aptStats = await appointmentRepository.countStats();
    const totalRecords = await medicalRecordRepository.count();
    const recentAuditLogs = await auditLogRepository.findAll({ limit: 5 });

    return {
      totalPatients,
      totalDoctors,
      scheduledAppointments: aptStats.scheduled,
      completedAppointments: aptStats.completed,
      totalAppointments: aptStats.total,
      totalRecords,
      recentAuditLogs
    };
  }
}

export const adminService = new AdminService();
