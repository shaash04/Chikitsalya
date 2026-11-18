import { db } from '../config/database.js';
import { PatientProfile } from '../types/index.js';

export class PatientRepository {
  async findByUserId(userId: number): Promise<PatientProfile | null> {
    const [rows] = await db.execute<PatientProfile[]>(
      `SELECT p.*, u.full_name, u.email, u.phone 
       FROM patients p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ? LIMIT 1`,
      [userId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findById(id: number): Promise<PatientProfile | null> {
    const [rows] = await db.execute<PatientProfile[]>(
      `SELECT p.*, u.full_name, u.email, u.phone 
       FROM patients p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findAll(): Promise<PatientProfile[]> {
    const [rows] = await db.execute<PatientProfile[]>(
      `SELECT p.*, u.full_name, u.email, u.phone 
       FROM patients p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.id ASC`
    );
    return rows;
  }

  async create(data: {
    userId: number;
    patientCode: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    bloodGroup: string;
    emergencyContact: string;
    address: string;
    allergies?: string | null;
    medicalHistory?: string | null;
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO patients (user_id, patient_code, date_of_birth, gender, blood_group, emergency_contact, address, allergies, medical_history) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.patientCode,
        data.dateOfBirth,
        data.gender,
        data.bloodGroup,
        data.emergencyContact.trim(),
        data.address.trim(),
        data.allergies || null,
        data.medicalHistory || null
      ]
    );
    return result.insertId;
  }

  async update(id: number, data: {
    emergencyContact: string;
    address: string;
    allergies?: string | null;
    medicalHistory?: string | null;
  }): Promise<void> {
    await db.execute(
      `UPDATE patients 
       SET emergency_contact = ?, address = ?, allergies = ?, medical_history = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        data.emergencyContact.trim(),
        data.address.trim(),
        data.allergies || null,
        data.medicalHistory || null,
        id
      ]
    );
  }

  async count(): Promise<number> {
    const [rows] = await db.execute<any[]>('SELECT COUNT(*) as count FROM patients');
    return rows && rows[0] ? Number(rows[0].count) : 0;
  }
}

export const patientRepository = new PatientRepository();
