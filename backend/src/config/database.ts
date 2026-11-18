import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';

// Database query execution interface
export interface IDatabase {
  execute<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  query<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  isUsingMock(): boolean;
  getEngineName(): string;
}

let mysqlPool: Pool | null = null;
let useMock = false;

// In-Memory Database Store for robust fallback/test isolation
interface TableStore {
  users: any[];
  patients: any[];
  doctors: any[];
  appointments: any[];
  medical_records: any[];
  audit_logs: any[];
  sessions: any[];
}

const memoryStore: TableStore = {
  users: [],
  patients: [],
  doctors: [],
  appointments: [],
  medical_records: [],
  audit_logs: [],
  sessions: []
};

let autoIncrementIds = {
  users: 1,
  patients: 1,
  doctors: 1,
  appointments: 1,
  medical_records: 1,
  audit_logs: 1
};

export async function initMemoryStore() {
  const defaultHash = bcrypt.hashSync('Password@Secure2026!', 10);
  const adminHash = bcrypt.hashSync('Admin@Secure2026!', 10);
  const doctorHash = bcrypt.hashSync('Doctor@Secure2026!', 10);
  const patientHash = bcrypt.hashSync('Patient@Secure2026!', 10);

  memoryStore.users = [
    {
      id: 1,
      uuid: 'usr-adm-0001',
      username: 'admin_sys',
      email: 'admin@hospital.local',
      password_hash: adminHash,
      role: 'admin',
      full_name: 'System Administrator',
      phone: '+1-555-0100',
      is_active: 1,
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      uuid: 'usr-doc-0001',
      username: 'dr_sharma',
      email: 'dr.sharma@hospital.local',
      password_hash: doctorHash,
      role: 'doctor',
      full_name: 'Dr. Ramesh Sharma, MD',
      phone: '+1-555-0101',
      is_active: 1,
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      uuid: 'usr-doc-0002',
      username: 'dr_patel',
      email: 'dr.patel@hospital.local',
      password_hash: doctorHash,
      role: 'doctor',
      full_name: 'Dr. Ananya Patel, MBBS',
      phone: '+1-555-0102',
      is_active: 1,
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      uuid: 'usr-pat-0001',
      username: 'johndoe',
      email: 'john.doe@patient.local',
      password_hash: patientHash,
      role: 'patient',
      full_name: 'John Doe',
      phone: '+1-555-0201',
      is_active: 1,
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      uuid: 'usr-pat-0002',
      username: 'janesmith',
      email: 'jane.smith@patient.local',
      password_hash: patientHash,
      role: 'patient',
      full_name: 'Jane Smith',
      phone: '+1-555-0202',
      is_active: 1,
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  memoryStore.doctors = [
    {
      id: 1,
      user_id: 2,
      doctor_code: 'DOC-CARDIO-01',
      specialization: 'Cardiology & Cardiovascular Medicine',
      department: 'Department of Cardiology',
      license_number: 'MED-LIC-CARD-8832',
      consultation_fee: 750.0,
      bio: 'Senior Consultant Cardiologist with 14 years clinical experience.',
      available_days: 'Monday,Wednesday,Friday',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 3,
      doctor_code: 'DOC-NEURO-02',
      specialization: 'Neurology & Neurophysiology',
      department: 'Department of Neurology',
      license_number: 'MED-LIC-NEUR-5541',
      consultation_fee: 800.0,
      bio: 'Associate Specialist in Neurological Diagnostics and Epilepsy Care.',
      available_days: 'Tuesday,Thursday,Saturday',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  memoryStore.patients = [
    {
      id: 1,
      user_id: 4,
      patient_code: 'PAT-1001-JD',
      date_of_birth: '1985-04-12',
      gender: 'male',
      blood_group: 'O+',
      emergency_contact: 'Mary Doe (+1-555-0209)',
      address: '742 Evergreen Terrace, Sector 4',
      allergies: 'Penicillin, Peanuts',
      medical_history: 'Mild hypertension diagnosed 2021. Managed with lifestyle modifications.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 5,
      patient_code: 'PAT-1002-JS',
      date_of_birth: '1992-09-28',
      gender: 'female',
      blood_group: 'B+',
      emergency_contact: 'Robert Smith (+1-555-0210)',
      address: '124 Conch Street, Block B',
      allergies: 'Sulfa drugs',
      medical_history: 'History of seasonal bronchial asthma. No surgical interventions.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  memoryStore.appointments = [
    {
      id: 1,
      uuid: 'apt-2026-001',
      patient_id: 1,
      doctor_id: 1,
      appointment_date: '2026-11-02',
      time_slot: '09:30 AM',
      reason: 'Routine cardiac stress evaluation and blood pressure check',
      status: 'scheduled',
      cancellation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      uuid: 'apt-2026-002',
      patient_id: 1,
      doctor_id: 2,
      appointment_date: '2026-10-15',
      time_slot: '02:00 PM',
      reason: 'Consultation regarding recurrent tension headaches',
      status: 'completed',
      cancellation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      uuid: 'apt-2026-003',
      patient_id: 2,
      doctor_id: 2,
      appointment_date: '2026-11-04',
      time_slot: '11:00 AM',
      reason: 'Neurological screening following vertigo episodes',
      status: 'scheduled',
      cancellation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  memoryStore.medical_records = [
    {
      id: 1,
      uuid: 'rec-2026-101',
      patient_id: 1,
      doctor_id: 1,
      record_date: '2026-09-10',
      diagnosis: 'Primary Essential Hypertension (Stage 1)',
      symptoms: 'Occasional mild occipital morning headaches, fatigue.',
      treatment_plan: 'Dietary sodium restriction (<2g/day), 30 mins moderate aerobic exercise 5x/wk.',
      prescription: 'Amlodipine 5mg orally once daily each morning. Re-evaluate in 60 days.',
      clinical_notes: 'Patient vitals: BP 138/88 mmHg, Pulse 74 bpm, Weight 78kg. Cardiac sounds regular.',
      confidential_notes: 'CONFIDENTIAL: Patient expressed elevated work-related stress during Q3.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      uuid: 'rec-2026-102',
      patient_id: 1,
      doctor_id: 2,
      record_date: '2026-10-15',
      diagnosis: 'Cervicogenic Tension Headache',
      symptoms: 'Bilateral band-like pressure across temples and cervical tightness.',
      treatment_plan: 'Ergonomic workstation adjustment, physical therapy cervical stretches.',
      prescription: 'Paracetamol 650mg SOS (max 2g/day). Naproxen 250mg post meals if pain > 6/10.',
      clinical_notes: 'Normal cranial nerve examination. Fundoscopic evaluation unremarkable.',
      confidential_notes: 'CONFIDENTIAL: Discussed anxiety management strategies.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      uuid: 'rec-2026-103',
      patient_id: 2,
      doctor_id: 2,
      record_date: '2026-10-20',
      diagnosis: 'Benign Paroxysmal Positional Vertigo (BPPV)',
      symptoms: 'Brief episodes of dizziness upon neck extension, mild nausea.',
      treatment_plan: 'Perform Epley repositioning maneuver in clinic; home Brandt-Daroff exercises.',
      prescription: 'Betahistine 16mg three times daily for 5 days. Oral rehydration.',
      clinical_notes: 'Dix-Hallpike test positive for right posterior canal canalithiasis.',
      confidential_notes: 'CONFIDENTIAL: Patient advised to avoid sudden posture shifts.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  memoryStore.audit_logs = [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      actor_user_id: 1,
      actor_username: 'admin_sys',
      actor_role: 'admin',
      event_type: 'SYSTEM_BOOT',
      resource_type: 'SYSTEM',
      resource_id: '0',
      outcome: 'SUCCESS',
      ip_address: '127.0.0.1',
      user_agent: 'Node-Backend',
      correlation_id: 'boot-corr-0001',
      metadata: '{"message":"Security controls initialized successfully."}'
    }
  ];

  autoIncrementIds = {
    users: 6,
    patients: 3,
    doctors: 3,
    appointments: 4,
    medical_records: 4,
    audit_logs: 2
  };
}

// In-Memory query simulation engine for parameterized SQL statements
class MemoryDatabaseEngine implements IDatabase {
  isUsingMock(): boolean {
    return true;
  }

  getEngineName(): string {
    return 'Secure In-Memory Relational Engine (Isolated Prepared Statement Mode)';
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    return this.query<T>(sql, params);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    const trimmed = sql.trim().toUpperCase();

    // SELECT 1 / health check
    if (trimmed.startsWith('SELECT 1')) {
      return [[{ 1: 1 }] as unknown as T, null];
    }

    // -------------------------------------------------------------------------
    // USERS QUERIES
    // -------------------------------------------------------------------------
    if (trimmed.includes('FROM USERS') || trimmed.includes('INTO USERS') || trimmed.includes('UPDATE USERS')) {
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE EMAIL = ?')) {
        const email = String(params[0]).toLowerCase();
        const found = memoryStore.users.find(u => u.email.toLowerCase() === email);
        return [(found ? [found] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE USERNAME = ?')) {
        const username = String(params[0]).toLowerCase();
        const found = memoryStore.users.find(u => u.username.toLowerCase() === username);
        return [(found ? [found] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE ID = ?')) {
        const id = Number(params[0]);
        const found = memoryStore.users.find(u => u.id === id);
        return [(found ? [found] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE UUID = ?')) {
        const uuid = String(params[0]);
        const found = memoryStore.users.find(u => u.uuid === uuid);
        return [(found ? [found] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && !trimmed.includes('WHERE')) {
        return [[...memoryStore.users] as unknown as T, null];
      }
      if (trimmed.startsWith('INSERT INTO USERS')) {
        const id = autoIncrementIds.users++;
        const newUser = {
          id,
          uuid: params[0],
          username: params[1],
          email: params[2],
          password_hash: params[3],
          role: params[4],
          full_name: params[5],
          phone: params[6] || null,
          is_active: 1,
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.users.push(newUser);
        return [{ insertId: id, affectedRows: 1 } as unknown as T, null];
      }
      if (trimmed.startsWith('UPDATE USERS')) {
        // 1. Password update
        if (trimmed.includes('PASSWORD_HASH = ?')) {
          const userId = Number(params[1]);
          const user = memoryStore.users.find(u => u.id === userId);
          if (user) {
            user.password_hash = params[0];
            user.failed_login_attempts = 0;
            user.locked_until = null;
            user.updated_at = new Date().toISOString();
          }
          return [{ affectedRows: 1 } as unknown as T, null];
        }

        // 2. Reset failed attempts & unlock (handles single user and bulk WHERE EMAIL IN)
        if (trimmed.includes('FAILED_LOGIN_ATTEMPTS = 0') || trimmed.includes('LOCKED_UNTIL = NULL')) {
          if (trimmed.includes('WHERE EMAIL IN')) {
            const emails = params.map(p => String(p).toLowerCase().trim());
            let count = 0;
            for (const u of memoryStore.users) {
              if (emails.includes(u.email.toLowerCase())) {
                u.is_active = 1;
                u.failed_login_attempts = 0;
                u.locked_until = null;
                count++;
              }
            }
            return [{ affectedRows: count } as unknown as T, null];
          }

          const userId = Number(params[params.length - 1]);
          const user = memoryStore.users.find(u => u.id === userId);
          if (user) {
            user.failed_login_attempts = 0;
            user.locked_until = null;
            user.last_login_at = new Date().toISOString();
          }
          return [{ affectedRows: 1 } as unknown as T, null];
        }

        // 3. Record failed login attempt & lockout
        if (trimmed.includes('FAILED_LOGIN_ATTEMPTS = ?')) {
          const userId = Number(params[2]);
          const user = memoryStore.users.find(u => u.id === userId);
          if (user) {
            user.failed_login_attempts = Number(params[0]);
            user.locked_until = params[1] || null;
          }
          return [{ affectedRows: 1 } as unknown as T, null];
        }

        // 4. Set Active Status
        if (trimmed.includes('IS_ACTIVE = ?')) {
          const userId = Number(params[1]);
          const user = memoryStore.users.find(u => u.id === userId);
          if (user) {
            user.is_active = Number(params[0]);
            user.updated_at = new Date().toISOString();
          }
          return [{ affectedRows: 1 } as unknown as T, null];
        }

        // 5. Update Profile
        if (trimmed.includes('FULL_NAME = ?')) {
          const userId = Number(params[2]);
          const user = memoryStore.users.find(u => u.id === userId);
          if (user) {
            user.full_name = params[0];
            user.phone = params[1];
            user.updated_at = new Date().toISOString();
          }
          return [{ affectedRows: 1 } as unknown as T, null];
        }
      }
    }

    // -------------------------------------------------------------------------
    // PATIENTS QUERIES
    // -------------------------------------------------------------------------
    if (trimmed.includes('PATIENTS')) {
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE P.USER_ID = ?')) {
        const userId = Number(params[0]);
        const p = memoryStore.patients.find(x => x.user_id === userId);
        if (!p) return [[] as unknown as T, null];
        const u = memoryStore.users.find(x => x.id === userId);
        return [[{ ...p, full_name: u?.full_name, email: u?.email, phone: u?.phone }] as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE P.ID = ?')) {
        const id = Number(params[0]);
        const p = memoryStore.patients.find(x => x.id === id);
        if (!p) return [[] as unknown as T, null];
        const u = memoryStore.users.find(x => x.id === p.user_id);
        return [[{ ...p, full_name: u?.full_name, email: u?.email, phone: u?.phone }] as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('FROM PATIENTS P')) {
        const list = memoryStore.patients.map(p => {
          const u = memoryStore.users.find(x => x.id === p.user_id);
          return { ...p, full_name: u?.full_name, email: u?.email, phone: u?.phone };
        });
        return [list as unknown as T, null];
      }
      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        const id = autoIncrementIds.patients++;
        const p = {
          id,
          user_id: params[0],
          patient_code: params[1],
          date_of_birth: params[2],
          gender: params[3],
          blood_group: params[4],
          emergency_contact: params[5],
          address: params[6],
          allergies: params[7] || null,
          medical_history: params[8] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.patients.push(p);
        return [{ insertId: id, affectedRows: 1 } as unknown as T, null];
      }
      if (trimmed.startsWith('UPDATE PATIENTS')) {
        const id = Number(params[params.length - 1]);
        const p = memoryStore.patients.find(x => x.id === id || x.user_id === id);
        if (p) {
          p.emergency_contact = params[0];
          p.address = params[1];
          p.allergies = params[2];
          p.medical_history = params[3];
        }
        return [{ affectedRows: 1 } as unknown as T, null];
      }
    }

    // -------------------------------------------------------------------------
    // DOCTORS QUERIES
    // -------------------------------------------------------------------------
    if (trimmed.includes('DOCTORS')) {
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE D.USER_ID = ?')) {
        const userId = Number(params[0]);
        const d = memoryStore.doctors.find(x => x.user_id === userId);
        if (!d) return [[] as unknown as T, null];
        const u = memoryStore.users.find(x => x.id === userId);
        return [[{ ...d, full_name: u?.full_name, email: u?.email, phone: u?.phone }] as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE D.ID = ?')) {
        const id = Number(params[0]);
        const d = memoryStore.doctors.find(x => x.id === id);
        if (!d) return [[] as unknown as T, null];
        const u = memoryStore.users.find(x => x.id === d.user_id);
        return [[{ ...d, full_name: u?.full_name, email: u?.email, phone: u?.phone }] as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('FROM DOCTORS D')) {
        let list = memoryStore.doctors.map(d => {
          const u = memoryStore.users.find(x => x.id === d.user_id);
          return { ...d, full_name: u?.full_name, email: u?.email, phone: u?.phone };
        });
        if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
          const term = params[0].replace(/%/g, '').toLowerCase();
          list = list.filter(d => 
            d.full_name?.toLowerCase().includes(term) ||
            d.specialization.toLowerCase().includes(term) ||
            d.department.toLowerCase().includes(term)
          );
        }
        return [list as unknown as T, null];
      }
      if (trimmed.startsWith('INSERT INTO DOCTORS')) {
        const id = autoIncrementIds.doctors++;
        const d = {
          id,
          user_id: params[0],
          doctor_code: params[1],
          specialization: params[2],
          department: params[3],
          license_number: params[4],
          consultation_fee: params[5],
          bio: params[6] || null,
          available_days: params[7],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.doctors.push(d);
        return [{ insertId: id, affectedRows: 1 } as unknown as T, null];
      }
    }

    // -------------------------------------------------------------------------
    // APPOINTMENTS QUERIES
    // -------------------------------------------------------------------------
    if (trimmed.includes('APPOINTMENTS')) {
      const enrichAppointment = (apt: any) => {
        const pat = memoryStore.patients.find(p => p.id === apt.patient_id);
        const patUser = memoryStore.users.find(u => u.id === pat?.user_id);
        const doc = memoryStore.doctors.find(d => d.id === apt.doctor_id);
        const docUser = memoryStore.users.find(u => u.id === doc?.user_id);
        return {
          ...apt,
          patient_name: patUser?.full_name || 'Unknown Patient',
          doctor_name: docUser?.full_name || 'Unknown Doctor',
          specialization: doc?.specialization || 'General',
          patient_code: pat?.patient_code
        };
      };

      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE A.ID = ?')) {
        const id = Number(params[0]);
        const apt = memoryStore.appointments.find(a => a.id === id);
        return [(apt ? [enrichAppointment(apt)] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE A.PATIENT_ID = ?')) {
        const patId = Number(params[0]);
        const results = memoryStore.appointments.filter(a => a.patient_id === patId).map(enrichAppointment);
        return [results as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE A.DOCTOR_ID = ?')) {
        const docId = Number(params[0]);
        const results = memoryStore.appointments.filter(a => a.doctor_id === docId).map(enrichAppointment);
        return [results as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('FROM APPOINTMENTS A')) {
        const results = memoryStore.appointments.map(enrichAppointment);
        return [results as unknown as T, null];
      }
      if (trimmed.startsWith('INSERT INTO APPOINTMENTS')) {
        const id = autoIncrementIds.appointments++;
        const newApt = {
          id,
          uuid: params[0],
          patient_id: Number(params[1]),
          doctor_id: Number(params[2]),
          appointment_date: params[3],
          time_slot: params[4],
          reason: params[5],
          status: params[6] || 'scheduled',
          cancellation_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.appointments.push(newApt);
        return [{ insertId: id, affectedRows: 1 } as unknown as T, null];
      }
      if (trimmed.startsWith('UPDATE APPOINTMENTS')) {
        const id = Number(params[params.length - 1]);
        const apt = memoryStore.appointments.find(a => a.id === id);
        if (apt) {
          if (trimmed.includes('STATUS = ?') && trimmed.includes('CANCELLATION_REASON = ?')) {
            apt.status = params[0];
            apt.cancellation_reason = params[1];
          } else if (trimmed.includes('STATUS = ?')) {
            apt.status = params[0];
          } else if (trimmed.includes('APPOINTMENT_DATE = ?')) {
            apt.appointment_date = params[0];
            apt.time_slot = params[1];
          }
          apt.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: 1 } as unknown as T, null];
      }
    }

    // -------------------------------------------------------------------------
    // MEDICAL RECORDS QUERIES (with Object-Level Access)
    // -------------------------------------------------------------------------
    if (trimmed.includes('MEDICAL_RECORDS')) {
      const enrichRecord = (rec: any) => {
        const pat = memoryStore.patients.find(p => p.id === rec.patient_id);
        const patUser = memoryStore.users.find(u => u.id === pat?.user_id);
        const doc = memoryStore.doctors.find(d => d.id === rec.doctor_id);
        const docUser = memoryStore.users.find(u => u.id === doc?.user_id);
        return {
          ...rec,
          patient_name: patUser?.full_name || 'Unknown Patient',
          doctor_name: docUser?.full_name || 'Unknown Doctor',
          patient_code: pat?.patient_code
        };
      };

      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE MR.ID = ?')) {
        const id = Number(params[0]);
        const rec = memoryStore.medical_records.find(r => r.id === id);
        return [(rec ? [enrichRecord(rec)] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE MR.PATIENT_ID = ?')) {
        const patId = Number(params[0]);
        const results = memoryStore.medical_records.filter(r => r.patient_id === patId).map(enrichRecord);
        return [results as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE MR.DOCTOR_ID = ?')) {
        const docId = Number(params[0]);
        const results = memoryStore.medical_records.filter(r => r.doctor_id === docId).map(enrichRecord);
        return [results as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('FROM MEDICAL_RECORDS MR')) {
        const results = memoryStore.medical_records.map(enrichRecord);
        return [results as unknown as T, null];
      }
      if (trimmed.startsWith('INSERT INTO MEDICAL_RECORDS')) {
        const id = autoIncrementIds.medical_records++;
        const newRec = {
          id,
          uuid: params[0],
          patient_id: Number(params[1]),
          doctor_id: Number(params[2]),
          record_date: params[3],
          diagnosis: params[4],
          symptoms: params[5],
          treatment_plan: params[6],
          prescription: params[7],
          clinical_notes: params[8] || null,
          confidential_notes: params[9] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.medical_records.push(newRec);
        return [{ insertId: id, affectedRows: 1 } as unknown as T, null];
      }
    }

    // -------------------------------------------------------------------------
    // AUDIT LOGS QUERIES
    // -------------------------------------------------------------------------
    if (trimmed.includes('AUDIT_LOGS')) {
      if (trimmed.startsWith('INSERT INTO AUDIT_LOGS')) {
        const id = autoIncrementIds.audit_logs++;
        const newLog = {
          id,
          timestamp: new Date().toISOString(),
          actor_user_id: params[0],
          actor_username: params[1],
          actor_role: params[2],
          event_type: params[3],
          resource_type: params[4],
          resource_id: params[5] ? String(params[5]) : null,
          outcome: params[6],
          ip_address: params[7],
          user_agent: params[8] || null,
          correlation_id: params[9],
          metadata: params[10] || null
        };
        memoryStore.audit_logs.unshift(newLog); // latest first
        return [{ insertId: id, affectedRows: 1 } as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT')) {
        let logs = [...memoryStore.audit_logs];
        if (params.length > 0 && typeof params[0] === 'string' && params[0].length > 0) {
          logs = logs.filter(l => l.event_type === params[0]);
        }
        return [logs.slice(0, 100) as unknown as T, null];
      }
    }

    // -------------------------------------------------------------------------
    // SESSIONS QUERIES
    // -------------------------------------------------------------------------
    if (trimmed.includes('SESSIONS')) {
      if (trimmed.startsWith('INSERT INTO SESSIONS')) {
        const newSession = {
          session_id: params[0],
          user_id: params[1],
          data: params[2],
          ip_address: params[3],
          user_agent: params[4],
          expires_at: params[5],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.sessions = memoryStore.sessions.filter(s => s.session_id !== params[0]);
        memoryStore.sessions.push(newSession);
        return [{ affectedRows: 1 } as unknown as T, null];
      }
      if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE SESSION_ID = ?')) {
        const sid = String(params[0]);
        const s = memoryStore.sessions.find(x => x.session_id === sid);
        return [(s ? [s] : []) as unknown as T, null];
      }
      if (trimmed.startsWith('DELETE FROM SESSIONS WHERE SESSION_ID = ?')) {
        const sid = String(params[0]);
        memoryStore.sessions = memoryStore.sessions.filter(s => s.session_id !== sid);
        return [{ affectedRows: 1 } as unknown as T, null];
      }
    }

    // -------------------------------------------------------------------------
    // DASHBOARD COUNTS
    // -------------------------------------------------------------------------
    if (trimmed.includes('COUNT(')) {
      if (trimmed.includes('FROM PATIENTS')) {
        return [[{ count: memoryStore.patients.length }] as unknown as T, null];
      }
      if (trimmed.includes('FROM DOCTORS')) {
        return [[{ count: memoryStore.doctors.length }] as unknown as T, null];
      }
      if (trimmed.includes('FROM APPOINTMENTS')) {
        const scheduled = memoryStore.appointments.filter(a => a.status === 'scheduled').length;
        const completed = memoryStore.appointments.filter(a => a.status === 'completed').length;
        return [[{ scheduled, completed, total: memoryStore.appointments.length }] as unknown as T, null];
      }
    }

    // Default empty array
    return [[] as unknown as T, null];
  }
}

const mockEngine = new MemoryDatabaseEngine();

// Database initialization
export async function initializeDatabase(): Promise<IDatabase> {
  // If explicitly requested or test environment
  if (env.USE_IN_MEMORY_DB === 'true' || env.NODE_ENV === 'test') {
    logger.info('Initializing In-Memory SQL Engine for isolation/testing...');
    await initMemoryStore();
    useMock = true;
    return mockEngine;
  }

  // Attempt real MySQL connection
  try {
    logger.info(`Attempting MySQL connection to ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}...`);
    const pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Test ping
    const [rows] = await pool.query('SELECT 1 as is_alive');
    logger.info(' Connected to live MySQL 8.0 Server via mysql2/promise pool.');
    mysqlPool = pool;
    useMock = false;

    // Execute schema if needed
    await applySchemaIfEmpty(pool);

    // In development mode, ensure all seeded demo accounts are active and unlocked
    if (env.NODE_ENV === 'development') {
      try {
        await pool.execute(
          'UPDATE users SET is_active = 1, failed_login_attempts = 0, locked_until = NULL WHERE email IN (?, ?, ?, ?, ?)',
          ['admin@hospital.local', 'dr.sharma@hospital.local', 'dr.patel@hospital.local', 'john.doe@patient.local', 'jane.smith@patient.local']
        );
      } catch (_) {}
    }

    return {
      execute: (sql: string, params?: any[]) => pool.execute(sql, params) as unknown as Promise<any>,
      query: (sql: string, params?: any[]) => pool.query(sql, params) as unknown as Promise<any>,
      isUsingMock: () => false,
      getEngineName: () => 'MySQL Server 8.0 (mysql2/promise connection pool)'
    };
  } catch (error: any) {
    if (env.USE_IN_MEMORY_DB === 'auto') {
      logger.warn(`MySQL server connection unavailable (${error.message}).`);
      logger.info(' Automatically activating high-fidelity In-Memory Database Engine.');
      await initMemoryStore();
      useMock = true;
      return mockEngine;
    } else {
      logger.error('Fatal: Failed to connect to MySQL database:', error);
      throw error;
    }
  }
}

async function applySchemaIfEmpty(pool: Pool) {
  try {
    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES LIKE "users"');
    if (tables.length === 0) {
      logger.info('Database empty. Running schema.sql initialization...');
      const schemaPath = path.resolve(process.cwd(), '../database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // split statements safely
        const statements = schemaSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE ') && !s.startsWith('CREATE DATABASE '));
        
        for (const stmt of statements) {
          await pool.query(stmt);
        }
        logger.info(' MySQL schema applied successfully.');
      }
    }
  } catch (e: any) {
    logger.warn('Schema check warning:', e.message);
  }
}

// Global db helper accessor
export const db: IDatabase = {
  execute: async <T = any>(sql: string, params?: any[]): Promise<[T, any]> => {
    if (mysqlPool && !useMock) {
      return (await mysqlPool.execute(sql, params)) as unknown as [T, any];
    }
    return mockEngine.execute<T>(sql, params);
  },
  query: async <T = any>(sql: string, params?: any[]): Promise<[T, any]> => {
    if (mysqlPool && !useMock) {
      return (await mysqlPool.query(sql, params)) as unknown as [T, any];
    }
    return mockEngine.query<T>(sql, params);
  },
  isUsingMock: () => useMock,
  getEngineName: () => (useMock ? mockEngine.getEngineName() : 'MySQL Server 8.0 (mysql2/promise connection pool)')
};
