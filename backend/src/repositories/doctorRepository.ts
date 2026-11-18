import { db } from '../config/database.js';
import { DoctorProfile } from '../types/index.js';

export class DoctorRepository {
  async findByUserId(userId: number): Promise<DoctorProfile | null> {
    const [rows] = await db.execute<DoctorProfile[]>(
      `SELECT d.*, u.full_name, u.email, u.phone 
       FROM doctors d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.user_id = ? LIMIT 1`,
      [userId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findById(id: number): Promise<DoctorProfile | null> {
    const [rows] = await db.execute<DoctorProfile[]>(
      `SELECT d.*, u.full_name, u.email, u.phone 
       FROM doctors d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findAll(searchQuery?: string): Promise<DoctorProfile[]> {
    if (searchQuery && searchQuery.trim().length > 0) {
      const term = `%${searchQuery.trim()}%`;
      const [rows] = await db.execute<DoctorProfile[]>(
        `SELECT d.*, u.full_name, u.email, u.phone 
         FROM doctors d 
         JOIN users u ON d.user_id = u.id 
         WHERE u.full_name LIKE ? OR d.specialization LIKE ? OR d.department LIKE ?
         ORDER BY d.id ASC`,
        [term, term, term]
      );
      return rows;
    }
    const [rows] = await db.execute<DoctorProfile[]>(
      `SELECT d.*, u.full_name, u.email, u.phone 
       FROM doctors d 
       JOIN users u ON d.user_id = u.id 
       ORDER BY d.id ASC`
    );
    return rows;
  }

  async create(data: {
    userId: number;
    doctorCode: string;
    specialization: string;
    department: string;
    licenseNumber: string;
    consultationFee: number;
    bio?: string | null;
    availableDays: string;
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO doctors (user_id, doctor_code, specialization, department, license_number, consultation_fee, bio, available_days) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.doctorCode,
        data.specialization.trim(),
        data.department.trim(),
        data.licenseNumber.trim(),
        data.consultationFee,
        data.bio || null,
        data.availableDays
      ]
    );
    return result.insertId;
  }

  async count(): Promise<number> {
    const [rows] = await db.execute<any[]>('SELECT COUNT(*) as count FROM doctors');
    return rows && rows[0] ? Number(rows[0].count) : 0;
  }
}

export const doctorRepository = new DoctorRepository();
