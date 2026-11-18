import { db } from '../config/database.js';
import { MedicalRecord } from '../types/index.js';

export class MedicalRecordRepository {
  async findById(id: number): Promise<MedicalRecord | null> {
    const [rows] = await db.execute<MedicalRecord[]>(
      `SELECT mr.*, 
              u_pat.full_name as patient_name,
              p.patient_code,
              u_doc.full_name as doctor_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE mr.id = ? LIMIT 1`,
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findByPatientId(patientId: number): Promise<MedicalRecord[]> {
    const [rows] = await db.execute<MedicalRecord[]>(
      `SELECT mr.*, 
              u_pat.full_name as patient_name,
              p.patient_code,
              u_doc.full_name as doctor_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE mr.patient_id = ?
       ORDER BY mr.record_date DESC`,
      [patientId]
    );
    return rows;
  }

  async findByDoctorId(doctorId: number): Promise<MedicalRecord[]> {
    const [rows] = await db.execute<MedicalRecord[]>(
      `SELECT mr.*, 
              u_pat.full_name as patient_name,
              p.patient_code,
              u_doc.full_name as doctor_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE mr.doctor_id = ?
       ORDER BY mr.record_date DESC`,
      [doctorId]
    );
    return rows;
  }

  async findAll(): Promise<MedicalRecord[]> {
    const [rows] = await db.execute<MedicalRecord[]>(
      `SELECT mr.*, 
              u_pat.full_name as patient_name,
              p.patient_code,
              u_doc.full_name as doctor_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       ORDER BY mr.record_date DESC`
    );
    return rows;
  }

  async create(data: {
    uuid: string;
    patientId: number;
    doctorId: number;
    recordDate: string;
    diagnosis: string;
    symptoms: string;
    treatmentPlan: string;
    prescription: string;
    clinicalNotes?: string | null;
    confidentialNotes?: string | null;
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO medical_records 
       (uuid, patient_id, doctor_id, record_date, diagnosis, symptoms, treatment_plan, prescription, clinical_notes, confidential_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.uuid,
        data.patientId,
        data.doctorId,
        data.recordDate,
        data.diagnosis.trim(),
        data.symptoms.trim(),
        data.treatmentPlan.trim(),
        data.prescription.trim(),
        data.clinicalNotes || null,
        data.confidentialNotes || null
      ]
    );
    return result.insertId;
  }

  async count(): Promise<number> {
    const [rows] = await db.execute<any[]>('SELECT COUNT(*) as count FROM medical_records');
    return rows && rows[0] ? Number(rows[0].count) : 0;
  }
}

export const medicalRecordRepository = new MedicalRecordRepository();
