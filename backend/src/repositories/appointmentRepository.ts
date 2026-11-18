import { db } from '../config/database.js';
import { Appointment } from '../types/index.js';

export class AppointmentRepository {
  async findById(id: number): Promise<Appointment | null> {
    const [rows] = await db.execute<Appointment[]>(
      `SELECT a.*, 
              u_pat.full_name as patient_name,
              u_doc.full_name as doctor_name,
              d.specialization,
              p.patient_code
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findByPatientId(patientId: number): Promise<Appointment[]> {
    const [rows] = await db.execute<Appointment[]>(
      `SELECT a.*, 
              u_pat.full_name as patient_name,
              u_doc.full_name as doctor_name,
              d.specialization,
              p.patient_code
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.time_slot ASC`,
      [patientId]
    );
    return rows;
  }

  async findByDoctorId(doctorId: number): Promise<Appointment[]> {
    const [rows] = await db.execute<Appointment[]>(
      `SELECT a.*, 
              u_pat.full_name as patient_name,
              u_doc.full_name as doctor_name,
              d.specialization,
              p.patient_code
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       WHERE a.doctor_id = ?
       ORDER BY a.appointment_date DESC, a.time_slot ASC`,
      [doctorId]
    );
    return rows;
  }

  async findAll(): Promise<Appointment[]> {
    const [rows] = await db.execute<Appointment[]>(
      `SELECT a.*, 
              u_pat.full_name as patient_name,
              u_doc.full_name as doctor_name,
              d.specialization,
              p.patient_code
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u_pat ON p.user_id = u_pat.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u_doc ON d.user_id = u_doc.id
       ORDER BY a.appointment_date DESC, a.time_slot ASC`
    );
    return rows;
  }

  async create(data: {
    uuid: string;
    patientId: number;
    doctorId: number;
    appointmentDate: string;
    timeSlot: string;
    reason: string;
    status?: 'scheduled' | 'completed' | 'cancelled';
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO appointments (uuid, patient_id, doctor_id, appointment_date, time_slot, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.uuid,
        data.patientId,
        data.doctorId,
        data.appointmentDate,
        data.timeSlot,
        data.reason.trim(),
        data.status || 'scheduled'
      ]
    );
    return result.insertId;
  }

  async updateStatus(id: number, status: string, cancellationReason?: string | null): Promise<void> {
    await db.execute(
      `UPDATE appointments 
       SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, cancellationReason || null, id]
    );
  }

  async reschedule(id: number, appointmentDate: string, timeSlot: string): Promise<void> {
    await db.execute(
      `UPDATE appointments 
       SET appointment_date = ?, time_slot = ?, status = 'scheduled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [appointmentDate, timeSlot, id]
    );
  }

  async countStats(): Promise<{ scheduled: number; completed: number; total: number }> {
    const [rows] = await db.execute<any[]>(
      `SELECT 
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COUNT(*) as total
       FROM appointments`
    );
    if (!rows || rows.length === 0) return { scheduled: 0, completed: 0, total: 0 };
    return {
      scheduled: Number(rows[0].scheduled || 0),
      completed: Number(rows[0].completed || 0),
      total: Number(rows[0].total || 0)
    };
  }
}

export const appointmentRepository = new AppointmentRepository();
