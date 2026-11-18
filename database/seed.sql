-- =============================================================================
-- SECURE HOSPITAL MANAGEMENT SYSTEM (SHMS)
-- Database Seed Data: seed.sql
-- Fictional, realistic clinical and administrative demo data
-- Passwords are all hashed with bcrypt (cost factor 10 or 12).
-- =============================================================================

USE shms_db;

-- Clear previous data in correct foreign key order
DELETE FROM audit_logs;
DELETE FROM sessions;
DELETE FROM medical_records;
DELETE FROM appointments;
DELETE FROM doctors;
DELETE FROM patients;
DELETE FROM users;

-- -----------------------------------------------------------------------------
-- USERS
-- Demo Passwords:
--   admin@hospital.local      => Admin@Secure2026!
--   dr.sharma@hospital.local  => Doctor@Secure2026!
--   dr.patel@hospital.local   => Doctor@Secure2026!
--   john.doe@patient.local    => Patient@Secure2026!
--   jane.smith@patient.local  => Patient@Secure2026!
-- Bcrypt Hash for 'Admin@Secure2026!':
--   $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi (standard placeholder)
-- Note: seedRunner.ts computes exact bcrypt salts dynamically.
-- -----------------------------------------------------------------------------
INSERT INTO users (id, uuid, username, email, password_hash, role, full_name, phone, is_active) VALUES
(1, 'usr-adm-0001', 'admin_sys', 'admin@hospital.local', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOdMQiXz20xM3k8JjQ8Z9uV7jQe5LSm6m', 'admin', 'System Administrator', '+1-555-0100', 1),
(2, 'usr-doc-0001', 'dr_sharma', 'dr.sharma@hospital.local', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOdMQiXz20xM3k8JjQ8Z9uV7jQe5LSm6m', 'doctor', 'Dr. Ramesh Sharma, MD', '+1-555-0101', 1),
(3, 'usr-doc-0002', 'dr_patel', 'dr.patel@hospital.local', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOdMQiXz20xM3k8JjQ8Z9uV7jQe5LSm6m', 'doctor', 'Dr. Ananya Patel, MBBS', '+1-555-0102', 1),
(4, 'usr-pat-0001', 'johndoe', 'john.doe@patient.local', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOdMQiXz20xM3k8JjQ8Z9uV7jQe5LSm6m', 'patient', 'John Doe', '+1-555-0201', 1),
(5, 'usr-pat-0002', 'janesmith', 'jane.smith@patient.local', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOdMQiXz20xM3k8JjQ8Z9uV7jQe5LSm6m', 'patient', 'Jane Smith', '+1-555-0202', 1);

-- -----------------------------------------------------------------------------
-- DOCTOR PROFILES
-- -----------------------------------------------------------------------------
INSERT INTO doctors (id, user_id, doctor_code, specialization, department, license_number, consultation_fee, bio, available_days) VALUES
(1, 2, 'DOC-CARDIO-01', 'Cardiology & Cardiovascular Medicine', 'Department of Cardiology', 'MED-LIC-CARD-8832', 750.00, 'Senior Consultant Cardiologist with 14 years clinical experience.', 'Monday,Wednesday,Friday'),
(2, 3, 'DOC-NEURO-02', 'Neurology & Neurophysiology', 'Department of Neurology', 'MED-LIC-NEUR-5541', 800.00, 'Associate Specialist in Neurological Diagnostics and Epilepsy Care.', 'Tuesday,Thursday,Saturday');

-- -----------------------------------------------------------------------------
-- PATIENT PROFILES
-- -----------------------------------------------------------------------------
INSERT INTO patients (id, user_id, patient_code, date_of_birth, gender, blood_group, emergency_contact, address, allergies, medical_history) VALUES
(1, 4, 'PAT-1001-JD', '1985-04-12', 'male', 'O+', 'Mary Doe (+1-555-0209)', '742 Evergreen Terrace, Sector 4', 'Penicillin, Peanuts', 'Mild hypertension diagnosed 2021. Managed with lifestyle modifications.'),
(2, 5, 'PAT-1002-JS', '1992-09-28', 'female', 'B+', 'Robert Smith (+1-555-0210)', '124 Conch Street, Block B', 'Sulfa drugs', 'History of seasonal bronchial asthma. No surgical interventions.');

-- -----------------------------------------------------------------------------
-- APPOINTMENTS
-- -----------------------------------------------------------------------------
INSERT INTO appointments (id, uuid, patient_id, doctor_id, appointment_date, time_slot, reason, status) VALUES
(1, 'apt-2026-001', 1, 1, '2026-11-02', '09:30 AM', 'Routine cardiac stress evaluation and blood pressure check', 'scheduled'),
(2, 'apt-2026-002', 1, 2, '2026-10-15', '02:00 PM', 'Consultation regarding recurrent tension headaches', 'completed'),
(3, 'apt-2026-003', 2, 2, '2026-11-04', '11:00 AM', 'Neurological screening following vertigo episodes', 'scheduled');

-- -----------------------------------------------------------------------------
-- MEDICAL RECORDS
-- Demonstrates Object-Level Access Control (IDOR Prevention):
--   Record 1 & 2 belong to Patient 1 (John Doe).
--   Record 3 belongs to Patient 2 (Jane Smith).
-- Patient 2 MUST NOT be able to view Record 1 or 2.
-- -----------------------------------------------------------------------------
INSERT INTO medical_records (id, uuid, patient_id, doctor_id, record_date, diagnosis, symptoms, treatment_plan, prescription, clinical_notes, confidential_notes) VALUES
(1, 'rec-2026-101', 1, 1, '2026-09-10', 'Primary Essential Hypertension (Stage 1)', 'Occasional mild occipital morning headaches, fatigue.', 'Dietary sodium restriction (<2g/day), 30 mins moderate aerobic exercise 5x/wk.', 'Amlodipine 5mg orally once daily each morning. Re-evaluate in 60 days.', 'Patient vitals: BP 138/88 mmHg, Pulse 74 bpm, Weight 78kg. Cardiac sounds regular.', 'CONFIDENTIAL: Patient expressed elevated work-related stress during Q3.'),
(2, 'rec-2026-102', 1, 2, '2026-10-15', 'Cervicogenic Tension Headache', 'Bilateral band-like pressure across temples and cervical tightness.', 'Ergonomic workstation adjustment, physical therapy cervical stretches.', 'Paracetamol 650mg SOS (max 2g/day). Naproxen 250mg post meals if pain > 6/10.', 'Normal cranial nerve examination. Fundoscopic evaluation unremarkable.', 'CONFIDENTIAL: Discussed anxiety management strategies.'),
(3, 'rec-2026-103', 2, 2, '2026-10-20', 'Benign Paroxysmal Positional Vertigo (BPPV)', 'Brief episodes of dizziness upon neck extension, mild nausea.', 'Perform Epley repositioning maneuver in clinic; home Brandt-Daroff exercises.', 'Betahistine 16mg three times daily for 5 days. Oral rehydration.', 'Dix-Hallpike test positive for right posterior canal canalithiasis.', 'CONFIDENTIAL: Patient advised to avoid sudden posture shifts.');

-- -----------------------------------------------------------------------------
-- INITIAL AUDIT LOGS
-- -----------------------------------------------------------------------------
INSERT INTO audit_logs (id, actor_user_id, actor_username, actor_role, event_type, resource_type, resource_id, outcome, ip_address, correlation_id, metadata) VALUES
(1, 1, 'admin_sys', 'admin', 'SYSTEM_INITIALIZATION', 'SYSTEM', '0', 'SUCCESS', '127.0.0.1', 'init-corr-0001', '{"message":"Database schema deployed and initialized securely."}'),
(2, 2, 'dr_sharma', 'doctor', 'AUTH_LOGIN', 'USER', '2', 'SUCCESS', '127.0.0.1', 'seed-corr-0002', '{"authMethod":"session_cookie"}'),
(3, 4, 'johndoe', 'patient', 'AUTH_LOGIN', 'USER', '4', 'SUCCESS', '127.0.0.1', 'seed-corr-0003', '{"authMethod":"session_cookie"}');
