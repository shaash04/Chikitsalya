import { v4 as uuidv4 } from 'uuid';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { Appointment, SessionData } from '../types/index.js';
import { Request } from 'express';

export class AppointmentService {
  async getAppointmentsForUser(user: SessionData): Promise<Appointment[]> {
    if (user.role === 'patient') {
      const patient = await patientRepository.findByUserId(user.userId);
      if (!patient) return [];
      return appointmentRepository.findByPatientId(patient.id);
    }
    if (user.role === 'doctor') {
      const doctor = await doctorRepository.findByUserId(user.userId);
      if (!doctor) return [];
      return appointmentRepository.findByDoctorId(doctor.id);
    }
    if (user.role === 'admin') {
      return appointmentRepository.findAll();
    }
    return [];
  }

  async getAppointmentById(id: number, user: SessionData): Promise<Appointment> {
    const apt = await appointmentRepository.findById(id);
    if (!apt) throw new Error('NOT_FOUND');

    // IDOR / object-level access check
    if (user.role === 'patient') {
      const patient = await patientRepository.findByUserId(user.userId);
      if (!patient || patient.id !== apt.patient_id) {
        throw new Error('ACCESS_DENIED');
      }
    } else if (user.role === 'doctor') {
      const doctor = await doctorRepository.findByUserId(user.userId);
      if (!doctor || doctor.id !== apt.doctor_id) {
        throw new Error('ACCESS_DENIED');
      }
    }

    return apt;
  }

  async bookAppointment(
    data: { doctorId: number; appointmentDate: string; timeSlot: string; reason: string },
    user: SessionData,
    req: Request
  ): Promise<number> {
    const doctor = await doctorRepository.findById(data.doctorId);
    if (!doctor) throw new Error('DOCTOR_NOT_FOUND');

    let patientId: number;
    if (user.role === 'patient') {
      const patient = await patientRepository.findByUserId(user.userId);
      if (!patient) throw new Error('PATIENT_PROFILE_NOT_FOUND');
      patientId = patient.id;
    } else {
      throw new Error('ONLY_PATIENTS_CAN_BOOK');
    }

    const aptUuid = uuidv4();
    const aptId = await appointmentRepository.create({
      uuid: aptUuid,
      patientId,
      doctorId: data.doctorId,
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot,
      reason: data.reason,
      status: 'scheduled'
    });

    await auditLogRepository.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'APPOINTMENT_CREATE',
      resourceType: 'APPOINTMENT',
      resourceId: String(aptId),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { doctorId: data.doctorId, date: data.appointmentDate, timeSlot: data.timeSlot }
    });

    return aptId;
  }

  async cancelAppointment(id: number, reason: string, user: SessionData, req: Request): Promise<void> {
    const apt = await this.getAppointmentById(id, user);

    await appointmentRepository.updateStatus(id, 'cancelled', reason);

    await auditLogRepository.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'APPOINTMENT_CANCEL',
      resourceType: 'APPOINTMENT',
      resourceId: String(id),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { reason }
    });
  }

  async updateStatus(id: number, status: string, user: SessionData, req: Request): Promise<void> {
    if (user.role !== 'doctor' && user.role !== 'admin') {
      throw new Error('ACCESS_DENIED');
    }
    const apt = await this.getAppointmentById(id, user);

    await appointmentRepository.updateStatus(id, status);

    await auditLogRepository.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'APPOINTMENT_STATUS_UPDATE',
      resourceType: 'APPOINTMENT',
      resourceId: String(id),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { newStatus: status }
    });
  }
}

export const appointmentService = new AppointmentService();
