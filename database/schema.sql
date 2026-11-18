-- =============================================================================
-- SECURE HOSPITAL MANAGEMENT SYSTEM (SHMS)
-- Database Schema: schema.sql
-- Engine: MySQL 8.0+
-- Designed with Least Privilege, Referential Integrity, and Audit Compliance
-- =============================================================================

CREATE DATABASE IF NOT EXISTS shms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shms_db;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Core authentication and role-based access identity table.
-- Passwords stored ONLY as Argon2id/bcrypt hashes.
-- Account lockout attributes mitigate automated brute-force attacks.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_login_at DATETIME NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_secret VARCHAR(255) NULL,
  recovery_codes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. PATIENTS TABLE
-- Role-specific profile linked 1-to-1 to users table.
-- Contains protected health information (PHI) requiring strict IDOR guards.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  patient_code VARCHAR(20) NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  emergency_contact VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  allergies TEXT NULL,
  medical_history TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. DOCTORS TABLE
-- Role-specific medical staff profile linked 1-to-1 to users table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  doctor_code VARCHAR(20) NOT NULL UNIQUE,
  specialization VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  bio TEXT NULL,
  available_days VARCHAR(100) NOT NULL DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. APPOINTMENTS TABLE
-- Clinical encounter booking.
-- Links patient and doctor with strict status workflow.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  cancellation_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) 
    REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) 
    REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_appointments_date (appointment_date),
  INDEX idx_appointments_status (status)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. MEDICAL RECORDS TABLE
-- Sensitive clinical diagnostic and treatment records.
-- confidential_notes field is restricted to authorized clinicians only.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  record_date DATE NOT NULL,
  diagnosis VARCHAR(255) NOT NULL,
  symptoms TEXT NOT NULL,
  treatment_plan TEXT NOT NULL,
  prescription TEXT NOT NULL,
  clinical_notes TEXT NULL,
  confidential_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_records_patient FOREIGN KEY (patient_id) 
    REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_records_doctor FOREIGN KEY (doctor_id) 
    REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_records_patient (patient_id),
  INDEX idx_records_doctor (doctor_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. AUDIT LOGS TABLE
-- Immutable append-only audit trail for security accountability.
-- Captures who, when, what, target resource, outcome, IP, and correlation ID.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_user_id INT NULL,
  actor_username VARCHAR(50) NOT NULL,
  actor_role VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50) NULL,
  outcome ENUM('SUCCESS', 'FAILURE', 'DENIED') NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent VARCHAR(255) NULL,
  correlation_id VARCHAR(36) NOT NULL,
  metadata TEXT NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) 
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_event (event_type),
  INDEX idx_audit_outcome (outcome)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. SESSIONS TABLE
-- Persistent server-side session registry.
-- Guarantees stateful invalidation and prevents zombie sessions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  data TEXT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB;
