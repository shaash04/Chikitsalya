import { v4 as uuidv4 } from 'uuid';
import { medicalRecordRepository } from '../repositories/medicalRecordRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { MedicalRecord, SessionData } from '../types/index.js';
import { Request } from 'express';

export class MedicalRecordService {
  async getRecordsForUser(user: SessionData): Promise<MedicalRecord[]> {
    if (user.role === 'patient') {
      const patient = await patientRepository.findByUserId(user.userId);
      if (!patient) return [];
      const records = await medicalRecordRepository.findByPatientId(patient.id);
      // Redact confidential internal doctor notes for patient view
      return records.map(r => ({ ...r, confidential_notes: null }));
    }

    if (user.role === 'doctor') {
      const doctor = await doctorRepository.findByUserId(user.userId);
      if (!doctor) return [];
      return medicalRecordRepository.findByDoctorId(doctor.id);
    }

    if (user.role === 'admin') {
      // Admin sees audit/compliance view
      return medicalRecordRepository.findAll();
    }

    return [];
  }

  async getRecordById(id: number, user: SessionData, req: Request): Promise<MedicalRecord> {
    const record = await medicalRecordRepository.findById(id);
    if (!record) {
      throw new Error('NOT_FOUND');
    }

    // Object-Level IDOR Verification
    if (user.role === 'patient') {
      const patient = await patientRepository.findByUserId(user.userId);
      if (!patient || patient.id !== record.patient_id) {
        throw new Error('ACCESS_DENIED');
      }
      // Redact confidential notes
      return { ...record, confidential_notes: null };
    }

    if (user.role === 'doctor') {
      const doctor = await doctorRepository.findByUserId(user.userId);
      if (!doctor || doctor.id !== record.doctor_id) {
        throw new Error('ACCESS_DENIED');
      }
      return record;
    }

    return record;
  }

  async createRecord(
    data: {
      patientId: number;
      recordDate: string;
      diagnosis: string;
      symptoms: string;
      treatmentPlan: string;
      prescription: string;
      clinicalNotes?: string | null;
      confidentialNotes?: string | null;
    },
    user: SessionData,
    req: Request
  ): Promise<number> {
    if (user.role !== 'doctor') {
      throw new Error('ONLY_DOCTORS_CAN_CREATE_RECORDS');
    }

    const doctor = await doctorRepository.findByUserId(user.userId);
    if (!doctor) throw new Error('DOCTOR_PROFILE_NOT_FOUND');

    const patient = await patientRepository.findById(data.patientId);
    if (!patient) throw new Error('PATIENT_NOT_FOUND');

    const uuid = uuidv4();
    const recordId = await medicalRecordRepository.create({
      uuid,
      patientId: data.patientId,
      doctorId: doctor.id,
      recordDate: data.recordDate,
      diagnosis: data.diagnosis,
      symptoms: data.symptoms,
      treatmentPlan: data.treatmentPlan,
      prescription: data.prescription,
      clinicalNotes: data.clinicalNotes,
      confidentialNotes: data.confidentialNotes
    });

    await auditLogRepository.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'MEDICAL_RECORD_CREATE',
      resourceType: 'MEDICAL_RECORD',
      resourceId: String(recordId),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { patientId: data.patientId, doctorId: doctor.id, diagnosis: data.diagnosis }
    });

    return recordId;
  }
}

export const medicalRecordService = new MedicalRecordService();
