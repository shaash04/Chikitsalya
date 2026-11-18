// =============================================================================
// Core System Types and Interfaces for SHMS
// =============================================================================

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  is_active: number;
  failed_login_attempts: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SafeUser = Omit<User, 'password_hash' | 'failed_login_attempts' | 'locked_until'> & {
  fullName?: string;
};

export interface PatientProfile {
  id: number;
  user_id: number;
  patient_code: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group: string;
  emergency_contact: string;
  address: string;
  allergies?: string | null;
  medical_history?: string | null;
  created_at?: string;
  updated_at?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
}

export interface DoctorProfile {
  id: number;
  user_id: number;
  doctor_code: string;
  specialization: string;
  department: string;
  license_number: string;
  consultation_fee: number;
  bio?: string | null;
  available_days: string;
  created_at?: string;
  updated_at?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment {
  id: number;
  uuid: string;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  time_slot: string;
  reason: string;
  status: AppointmentStatus;
  cancellation_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
  doctor_name?: string;
  specialization?: string;
}

export interface MedicalRecord {
  id: number;
  uuid: string;
  patient_id: number;
  doctor_id: number;
  record_date: string;
  diagnosis: string;
  symptoms: string;
  treatment_plan: string;
  prescription: string;
  clinical_notes?: string | null;
  confidential_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
  doctor_name?: string;
  patient_code?: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  actor_user_id: number | null;
  actor_username: string;
  actor_role: string;
  event_type: string;
  resource_type: string;
  resource_id?: string | null;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ip_address: string;
  user_agent?: string | null;
  correlation_id: string;
  metadata?: string | null;
}

export interface SessionData {
  sessionId: string;
  userId: number;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  createdAt: number;
  lastActiveAt: number;
}
