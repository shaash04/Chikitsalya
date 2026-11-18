# Secure Hospital Management System (SHMS)

[![Web Security](https://img.shields.io/badge/Security-Defense--in--Depth-0284c7.svg)](#mandatory-security-controls)
[![Course](https://img.shields.io/badge/Course-21CSE438T%20Web%20Security-emerald.svg)](#academic-context)
[![Tests](https://img.shields.io/badge/Automated%20Security%20Tests-57%2F57%20Passed-success.svg)](#automated-security-testing)
[![Tech Stack](https://img.shields.io/badge/Stack-Angular%2018%20%7C%20Node.js%20%7C%20Express%20%7C%20MySQL%208-blueviolet.svg)](#technology-stack)

**Secure Hospital Management System (SHMS)** is an enterprise-grade, full-stack academic web application designed for the **Web Security (21CSE438T)** course at SRM Institute of Science and Technology. It models a production-grade hospital portal demonstrating defense-in-depth security mitigations against real-world attack vectors, including SQL Injection, Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), Insecure Direct Object References (IDOR), session hijacking, privilege escalation, and credential stuffing.

---

## Table of Contents
1. [Academic Context & Objectives](#academic-context--objectives)
2. [Technology Stack](#technology-stack)
3. [System Architecture & Folder Structure](#system-architecture--folder-structure)
4. [Mandatory Security Controls Implemented](#mandatory-security-controls-implemented)
5. [Hospital Management Functional Features](#hospital-management-functional-features)
6. [Development Demo Accounts](#development-demo-accounts)
7. [Prerequisites & Setup Instructions](#prerequisites--setup-instructions)
8. [Database Initialization & Seeding](#database-initialization--seeding)
9. [Running the Application](#running-the-application)
10. [Automated Security Testing](#automated-security-testing)
11. [Security Demonstration Center](#security-demonstration-center)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Academic Context & Objectives

Healthcare portals manage highly sensitive **Protected Health Information (PHI)** and **Personally Identifiable Information (PII)**. Compromising a hospital system results in severe privacy violations, blackmail, medical identity theft, and potential harm to patient life. 

Following the security principles laid out by Saltzer & Schroeder (1975) and modern application security standards (OWASP Top 10, Garfinkel & Spafford *Web Security, Privacy & Commerce*), this project delivers:
- **Least Privilege**: Users and roles possess only the minimal access rights necessary.
- **Complete Mediation**: Every incoming request is verified against authentication, role permissions, and object-level ownership on the backend.
- **Defense in Depth**: Layered protections across HTTP headers, session cookies, input validation, parameterized queries, and database audit logs.
- **Accountability & Non-Repudiation**: Database-backed audit trail for every authentication and clinical encounter.

---

## 2. Technology Stack

### Frontend
- **Framework**: Angular 18 (Standalone Components, Signals & Reactive Forms)
- **Routing**: Angular Router with functional `authGuard` and `roleGuard`
- **HTTP Client**: Angular `HttpClient` with automatic `csrfInterceptor` and `withCredentials: true`
- **UI/UX**: Custom responsive Medical UI theme, accessible typography, color-coded badges, and live testing terminal

### Backend
- **Runtime**: Node.js v22+ with TypeScript
- **Web Framework**: Express.js REST API
- **Layered Architecture**: Routes, Controllers, Services, Repositories, Validators, and Security Middleware

### Database
- **Engine**: MySQL 8.0+
- **Driver**: `mysql2/promise` utilizing prepared statements and parameter binding (`?` placeholders)
- **High-Fidelity Fallback**: Automatic, zero-dependency in-memory relational engine for running automated tests in isolated CI/CD environments without external database server dependencies.

### Security Libraries & Advanced Enhancements
- **Password Hashing**: `bcryptjs` (Blowfish cipher, work factor 12)
- **Two-Factor Authentication (2FA)**: RFC 6238 TOTP with Base32 decoding, `qrcode` data URL rendering, AES-256-GCM encrypted secrets at rest, and 8 single-use hashed emergency backup recovery codes.
- **Active Session & Device Registry**: Server-side session store with device/OS/browser user-agent telemetry, IP tracking, current device tagging, and remote session revocation.
- **Web Application Firewall (WAF) Simulator**: In-line request inspection middleware scanning headers, query params, and body for SQLi, XSS, Path Traversal, and Command Injection with configurable BLOCK / DETECT_ONLY modes.
- **Security Command Center (SOC)**: Enterprise-grade dark telemetry dashboard with 6 KPI cards, SVG attack activity timelines, threat category breakdown bars, severity donut charts, and searchable live audit logs.
- **Security HTTP Headers**: `helmet` (CSP, anti-clickjacking `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`)
- **Session Management**: Server-side session registry with signed `HttpOnly`, `SameSite=Strict` cookies
- **CSRF Protection**: Double-Submit HMAC cryptographic tokens verified on state mutations
- **Rate Limiting**: `express-rate-limit` with IP-based throttling and database account lockout
- **Validation**: `zod` for compile-time & runtime schema validation
- **Testing**: `vitest` + `supertest` with 57 automated end-to-end security integration tests

---

## 3. System Architecture & Folder Structure

```
CHIKITSALYA/
├── .env                          # Runtime environment configuration
├── .env.example                  # Environment template with placeholders
├── .gitignore                    # Secrets, binaries, and dependencies ignore list
├── package.json                  # Root npm workspace configuration
├── PROGRESS.md                   # Real-time project status and verification audit
├── README.md                     # Comprehensive system documentation
│
├── database/                     # Relational Database Artifacts
│   ├── schema.sql                # Complete MySQL DDL schema (7 tables, FKs, indexes)
│   └── seed.sql                  # Fictional, realistic clinical demo data
│
├── backend/                      # Node.js + Express + TypeScript API
│   ├── package.json              # Backend dependencies and scripts
│   ├── tsconfig.json             # TypeScript compiler configuration
│   ├── tests/
│   │   └── security.test.ts      # 21 automated security integration tests (Vitest + Supertest)
│   └── src/
│       ├── app.ts                # Express application factory, middleware pipeline
│       ├── server.ts             # HTTP server bootstrap, graceful shutdown
│       ├── config/
│       │   ├── env.ts            # Strict Zod validation of environment variables at startup
│       │   └── database.ts       # MySQL2 connection pool + in-memory engine fallback
│       ├── types/
│       │   └── index.ts          # Core TypeScript domain models and interfaces
│       ├── utils/
│       │   ├── logger.ts         # Defensive logging with sensitive credential redaction
│       │   └── security.ts       # Bcrypt, HMAC CSRF, session tokens, HTML escaping
│       ├── middleware/
│       │   ├── securityHeaders.ts # Helmet CSP, CORS allowlist, Cache-Control
│       │   ├── sessionAuth.ts    # HttpOnly cookie parser, session regeneration, timeout
│       │   ├── csrf.ts           # Double-submit HMAC CSRF validation middleware
│       │   ├── rateLimiter.ts    # Express rate limiters for login and sensitive actions
│       │   ├── rbac.ts           # requireAuthentication, requireRole, requireRecordAccess (IDOR)
│       │   ├── auditLogger.ts    # Request correlation ID attachment
│       │   └── errorHandler.ts   # Safe error suppression (no stack traces or SQL leakage)
│       ├── validators/
│       │   └── index.ts          # Zod validation schemas for all inputs
│       ├── repositories/         # Database access layer (100% Parameterized Queries)
│       │   ├── userRepository.ts
│       │   ├── patientRepository.ts
│       │   ├── doctorRepository.ts
│       │   ├── appointmentRepository.ts
│       │   ├── medicalRecordRepository.ts
│       │   └── auditLogRepository.ts
│       ├── services/             # Business logic & security rules
│       │   ├── authService.ts
│       │   ├── appointmentService.ts
│       │   ├── medicalRecordService.ts
│       │   ├── adminService.ts
│       │   └── securityDemoService.ts
│       ├── controllers/          # HTTP request/response handlers
│       │   ├── authController.ts
│       │   ├── patientController.ts
│       │   ├── doctorController.ts
│       │   ├── appointmentController.ts
│       │   ├── medicalRecordController.ts
│       │   ├── adminController.ts
│       │   ├── auditLogController.ts
│       │   └── securityDemoController.ts
│       ├── routes/
│       │   └── index.ts          # API route definitions
│       └── database/
│           └── seedRunner.ts     # Dynamic bcrypt seeder script
│
├── frontend/                     # Angular 18 Single Page Application
│   ├── angular.json              # Angular CLI project configuration
│   ├── package.json              # Frontend dependencies and build scripts
│   ├── tsconfig.json             # TypeScript root configuration
│   ├── tsconfig.app.json         # Application TypeScript settings
│   └── src/
│       ├── index.html            # Main HTML wrapper with security headers & meta
│       ├── main.ts               # Angular standalone bootstrap
│       ├── styles.css            # Medical UI design system and components
│       └── app/
│           ├── app.component.ts  # Root layout with reactive navbar & sidebar
│           ├── app.config.ts     # Global providers (HttpClient, Interceptors, Router)
│           ├── app.routes.ts     # Modular route mapping with Auth & Role guards
│           ├── core/
│           │   ├── guards/
│           │   │   └── auth.guard.ts     # Route protection & role enforcement
│           │   ├── interceptors/
│           │   │   └── csrf.interceptor.ts # Attaches X-CSRF-Token & withCredentials
│           │   └── services/
│           │       ├── auth.service.ts
│           │       ├── hospital.service.ts
│           │       └── security-demo.service.ts
│           ├── shared/
│           │   └── components/
│           │       ├── navbar/navbar.component.ts
│           │       └── sidebar/sidebar.component.ts
│           └── features/
│               ├── auth/
│               │   ├── login/login.component.ts
│               │   └── register/register.component.ts
│               ├── dashboard/
│               │   ├── patient-dashboard/patient-dashboard.component.ts
│               │   ├── doctor-dashboard/doctor-dashboard.component.ts
│               │   └── admin-dashboard/admin-dashboard.component.ts
│               ├── patients/
│               │   └── patient-profile/patient-profile.component.ts
│               ├── doctors/
│               │   └── doctor-directory/doctor-directory.component.ts
│               ├── appointments/
│               │   ├── appointment-list/appointment-list.component.ts
│               │   └── book-appointment/book-appointment.component.ts
│               ├── medical-records/
│               │   ├── record-list/record-list.component.ts
│               │   ├── record-detail/record-detail.component.ts
│               │   └── create-record/create-record.component.ts
│               ├── admin/
│               │   ├── user-management/user-management.component.ts
│               │   └── provision-doctor/provision-doctor.component.ts
│               ├── audit-logs/
│               │   └── audit-log-viewer/audit-log-viewer.component.ts
│               └── security-demo/
│                   └── security-demo-center/security-demo-center.component.ts
│
└── docs/                         # Academic Web Security Deliverables
    ├── SECURITY_IMPLEMENTATION.md # Comprehensive defense breakdown
    ├── SECURITY_TESTING.md        # Test matrix & automated execution logs
    └── PRESENTATION_GUIDE.md      # College evaluation guide & 5-7 min script
```

---

## 4. Mandatory Security Controls Implemented

| # | Security Feature | Threat Prevented | Working Code Location | Verification Evidence |
|---|------------------|------------------|------------------------|-----------------------|
| 1 | **Password Hashing** | Credential dumping, rainbow tables | `backend/src/utils/security.ts` | Bcrypt salt rounds 12; hashes never leaked in API |
| 2 | **Authentication & Secure Sessions** | Session hijacking, token theft | `backend/src/middleware/sessionAuth.ts` | Signed `HttpOnly`, `SameSite=Strict` cookie, session regeneration, 30m idle timeout |
| 3 | **Role-Based Access Control (RBAC)** | Privilege escalation | `backend/src/middleware/rbac.ts` | Server-side role checks (`requireRole('admin')`); returns 403 & logs denial |
| 4 | **SQL Injection Prevention** | DB compromise, auth bypass | `backend/src/repositories/*` | 100% prepared statements with `?` parameters; `' OR '1'='1` treated as literal |
| 5 | **Cross-Site Scripting (XSS)** | Malicious script execution | `backend/src/middleware/securityHeaders.ts` | Helmet CSP (`default-src 'self'`), Angular contextual template escaping |
| 6 | **CSRF Protection** | Forged cross-site state changes | `backend/src/middleware/csrf.ts` | Double-Submit HMAC token via `X-CSRF-Token` header on POST/PUT/DELETE |
| 7 | **Brute-Force Rate Limiting** | Credential stuffing, DoS | `backend/src/middleware/rateLimiter.ts` | 5 login attempts / 15 min; returns HTTP 429; DB locks account for 15 min |
| 8 | **Security Response Headers** | Clickjacking, MIME sniffing | `backend/src/middleware/securityHeaders.ts` | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy |
| 9 | **Input Validation & Safe Errors** | Buffer overflows, stack traces | `backend/src/validators/index.ts` & `errorHandler.ts` | Zod schema validation; stack traces & internal SQL queries suppressed |
| 10 | **Patient Privacy & IDOR Prevention** | Horizontal privilege escalation | `backend/src/middleware/rbac.ts (requireRecordAccess)` | Checks requester user ID matches record owner; cross-access denied with 403 |
| 11 | **Security Audit Logs** | Unaccountable misuse, repudiation | `backend/src/repositories/auditLogRepository.ts` | Database-backed audit table recording actor, event, IP, correlation ID, outcome |
| 12 | **Secure Secrets & Configuration** | Secret leakage in version control | `backend/src/config/env.ts` | Mandatory variables validated on boot via Zod; passwords/keys isolated in `.env` |
| 13 | **Two-Factor Authentication (2FA)** | Credential stuffing, account takeover | `backend/src/utils/totp.ts` & `authController.ts` | RFC 6238 TOTP, AES-256-GCM encrypted secrets at rest, 8 single-use hashed recovery codes |
| 14 | **Active Session & Device Management** | Stale sessions, rogue concurrent logins | `backend/src/middleware/sessionAuth.ts` | Server-side session registry, browser/OS device parsing, single & bulk remote revocation |
| 15 | **Web Application Firewall (WAF)** | Zero-day web exploits, injection payloads | `backend/src/middleware/wafMiddleware.ts` | In-line regex scanning for SQLi, XSS, Path Traversal, Command Injection (BLOCK/DETECT_ONLY) |
| 16 | **Security Command Center (SOC)** | Blind spots, delayed incident response | `backend/src/services/securityAnalyticsService.ts` | Enterprise dark SOC console: 6 KPI metrics, SVG timeline charts, event donut, live event monitor |

---

## 5. Hospital Management Functional Features

1. **Authentication**:
   - Secure login with constant-time verification against account lockout.
   - Public patient self-registration with password complexity meter.
   - Controlled administrative provisioning of doctor accounts (public cannot register as staff).
   - Invalidation of sessions on logout.
2. **Role Dashboards**:
   - **Patient Dashboard**: Upcoming clinical appointments, personal medical history, quick booking action.
   - **Doctor Dashboard**: Assigned patient visits, clinical status workflow (completed/cancelled), medical record documentation.
   - **Administrator Dashboard**: Hospital operational statistics, security control health status, real-time security audit alerts.
3. **Appointments**:
   - Patient books appointments with doctor selection, date, time slot, and reason.
   - Patients can cancel scheduled appointments.
   - Doctors can update clinical status (`completed`, `cancelled`).
4. **Medical Records**:
   - Complete Electronic Medical Record (EMR) listing and detail view.
   - Strict separation of internal physician notes (`confidential_notes` are redacted for patients).
   - Doctors create clinical records with diagnoses, symptoms, treatments, and prescriptions.
5. **Staff Directory**:
   - Filterable physician directory with specialties, consultation fees, and clinic schedules.
6. **User Management**:
   - Admin view of all system accounts with one-click activation/deactivation.
   - Admin is prevented from deactivating their own active account.
7. **Security Demonstration Center**:
   - Built-in interactive laboratory for live presentation testing of all 12 controls.

---

## 6. Development Demo Accounts

The database comes pre-seeded with fictional test accounts for evaluation:

| Role | Username | Email | Password | Access Scope |
|------|----------|-------|----------|--------------|
| **Administrator** | `admin_sys` | `admin@hospital.local` | `Admin@Secure2026!` | Full administrative console, user management, audit logs |
| **Doctor (Cardiology)** | `dr_sharma` | `dr.sharma@hospital.local` | `Doctor@Secure2026!` | Cardiology clinic, assigned appointments, clinical records |
| **Doctor (Neurology)** | `dr_patel` | `dr.patel@hospital.local` | `Doctor@Secure2026!` | Neurology clinic, assigned appointments, clinical records |
| **Patient A** | `johndoe` | `john.doe@patient.local` | `Patient@Secure2026!` | Patient portal, own appointments, own medical records (#1, #2) |
| **Patient B** | `janesmith` | `jane.smith@patient.local` | `Patient@Secure2026!` | Patient portal, own appointments, own medical record (#3) |

> [!NOTE]
> All passwords above meet strict complexity rules (uppercase, lowercase, number, special symbol) and are stored in the database exclusively as 12-round bcrypt hashes.

---

## 7. Prerequisites & Setup Instructions

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v22.17.1)
- **npm**: v9+ (tested on npm 10.9.2)
- **MySQL Server** (optional for live MySQL mode; otherwise the high-fidelity in-memory engine auto-activates)

### Installation
From the project root directory (`CHIKITSALYA/`), install all workspace dependencies:
```powershell
npm install
```

---

## 8. Database Initialization & Seeding

### Option A: Using Real MySQL Server
1. Ensure your MySQL server is running on `127.0.0.1:3306`.
2. Create the database and user using the schema:
```powershell
mysql -u root -p < database/schema.sql
```
3. Update `.env` with your MySQL user and password:
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=shms_db
USE_IN_MEMORY_DB=false
```
4. Seed the database with hashed demo records:
```powershell
npm run seed:backend
```

### Option B: Automatic Zero-Dependency Mode (Default)
With `USE_IN_MEMORY_DB=auto` in `.env`, the system connects to MySQL if reachable; if MySQL is stopped or in a sandboxed port environment, it seamlessly auto-initializes the embedded relational engine. All data, relationships, and security controls remain 100% active and testable!

---

## 9. Running the Application

### Method 1: Full-Stack Integrated Server (Single Port 4000)
The backend is already configured to serve the compiled Angular production build directly:
```powershell
# 1. Build the frontend (already built in frontend/dist)
npm run build:frontend

# 2. Start the backend
npm run dev:backend
```
Open your browser to: **`http://localhost:4000`**

### Method 2: Dual Development Servers (Frontend 4200 + Backend 4000)
Terminal 1 (Backend API):
```powershell
npm run dev:backend
```
Terminal 2 (Angular Dev Server):
```powershell
npm run dev:frontend
```
Open your browser to: **`http://localhost:4200`**

---

## 10. Automated Security Testing

The backend includes a comprehensive automated security test suite comprising 4 test suites and **57 automated tests** executed with `vitest` and `supertest`:
1. `tests/securityCommandCenter.test.ts` (11 tests) - Threat analytics, KPI metrics, RBAC, live event filtering, alert triggers.
2. `tests/twoFactorAndSessions.test.ts` (13 tests) - TOTP enrollment, AES-256 secret encryption, invalid OTP rejection, 2FA login challenge, recovery codes, session device parsing, remote session revocation.
3. `tests/waf.test.ts` (12 tests) - SQL injection detection, XSS detection, Path Traversal detection, false-positive handling on medical notes, BLOCK vs DETECT_ONLY mode updates, attack simulation.
4. `tests/security.test.ts` (21 tests) - Core auth, bcrypt, RBAC, IDOR, parameterized queries, CSRF Double-Submit tokens, Helmet headers, Zod validation, rate limiting, and audit logging.

To execute the complete test suite:
```powershell
npm test
```
*(Or directly: `cd backend; npx vitest run`)*

### Verified Test Results:
```text
 RUN  v3.2.7 E:/Chikitsalaya/Chikitsalya/backend

 ✓ tests/securityCommandCenter.test.ts (11 tests) 1428ms
 ✓ tests/waf.test.ts (12 tests) 1447ms
 ✓ tests/security.test.ts (21 tests) 3028ms
 ✓ tests/twoFactorAndSessions.test.ts (13 tests) 3053ms

 Test Files  4 passed (4)
      Tests  57 passed (57) - 100% Pass Rate
   Duration  5.97s
```

---

## 11. Security Demonstration Center & Advanced Features

For academic project viva, demonstrations, and college presentations:
1. Navigate to **`http://localhost:4200/security-demo`** (or **`http://localhost:4000/security-demo`**).
2. The Security Demonstration Center provides:
   - A live interactive test console with customizable payloads.
   - Test 1: SQL Injection verification (`' OR '1'='1`).
   - Test 2: Password hashing & bcrypt salt verification.
   - Test 3: XSS input escaping & CSP inspection.
   - Test 4: CSRF token validation and missing token rejection.
   - Test 5: IDOR cross-patient record access denial.
   - Test 6: HTTP Security headers report.
   - Test 7: Database audit log inspection.
   - Test 8: Configuration secrets verification.
   - Test 9: Web Application Firewall (WAF) live payload filter (SQLi, XSS, Path Traversal, Command Injection).
   - A master specification table outlining all 16 controls, threat models, implementation source files, and verification status.

3. **Feature 1: Security Command Center (`/admin/security-center`)**:
   - Enterprise-grade dark SOC dashboard for administrators.
   - Real-time KPI summary (Total Analyzed, Suspicious Requests, Blocked Attacks, Failed Logins, Active Sessions, Critical Alerts).
   - SVG attack timeline polyline chart, threat categories horizontal bars, severity donut chart, login ratio stats.
   - Live security event stream with severity badges, IP, actor, and instant JSON forensic trace modal.

4. **Feature 2: Two-Factor Authentication (2FA) (`/account/security`)**:
   - RFC 6238 TOTP enrollment with QR code, manual secret, and AES-256-GCM secret encryption at rest.
   - 8 single-use cryptographically hashed backup recovery codes.
   - Strict 2FA challenge gate during login preventing session cookie issuance until OTP verification.

5. **Feature 3: Active Session & Device Management (`/account/security`)**:
   - Live session registry tracking device, OS, browser, IP address, and last active timestamp.
   - Real-time current device badge with individual remote revocation and "Revoke All Other Sessions" capability.

6. **Feature 4: Web Application Firewall (WAF) Simulator (`/admin/waf`)**:
   - In-line request inspection engine (`WAF-SQLI-001`, `WAF-XSS-002`, `WAF-PATH-003`, `WAF-CMD-004`, `WAF-PROTO-005`).
   - Administrator rule toggles between BLOCK and DETECT_ONLY modes with real-time incident audit logging.

---

## 12. Troubleshooting Guide

- **Port 4000 or 4200 already in use**:
  Update `PORT` in `.env` to another port (e.g. `5000`) and restart.
- **PowerShell Script Execution Policy Warning**:
  On Windows systems where PowerShell disables `.ps1` execution, invoke commands using `npm.cmd` or run via `cmd.exe`.
- **Session cookies not persisting across domains**:
  The system sets `SameSite=Strict`. When testing frontend on port 4200 and backend on port 4000, ensure `withCredentials: true` is enabled (configured automatically in `csrf.interceptor.ts`).
