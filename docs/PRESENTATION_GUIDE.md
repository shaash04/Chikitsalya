# College Evaluation Presentation Guide: Secure Hospital Management System (SHMS)

**Course**: 21CSE438T - Web Security  
**Topic**: Full-Stack Healthcare Application with Defense-in-Depth Security Controls  
**Target Time**: 5–7 Minutes  
**Audience**: Course Faculty, External Examiners, and Peer Evaluators

---

## 1. Project Overview & Problem Statement

### Problem Statement
Healthcare portals store Protected Health Information (PHI) and clinical records that are prime targets for cyberattacks. Vulnerabilities such as SQL Injection, Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), and Insecure Direct Object References (IDOR) allow attackers to dump entire databases, impersonate attending physicians, alter prescriptions, and leak private diagnoses.

### Objective
Build a complete, functional, full-stack hospital management web application (SHMS) using Angular and Node.js/Express with MySQL, and implement defense-in-depth security controls in working code—demonstrating real protection rather than theoretical concepts.

---

## 2. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                           CLIENT TIER (Angular 18 SPA)                            |
|  - Standalone Components, Reactive Forms, Role-based Routing                      |
|  - Automatic CsrfInterceptor attaches X-CSRF-Token & withCredentials              |
|  - Security Demonstration Center with Live Interactive Testing Terminal           |
+-----------------------------------------------------------------------------------+
                                        |  HTTPS / REST (JSON + HttpOnly Cookies)
                                        v
+-----------------------------------------------------------------------------------+
|                     SECURITY MIDDLEWARE PIPELINE (Express.js)                     |
|  1. Helmet (CSP, nosniff, X-Frame-Options: DENY, Referrer-Policy)                 |
|  2. CORS Strict Allowlist with Credentials                                        |
|  3. Rate Limiter (10 attempts / 15 min; returns HTTP 429)                         |
|  4. Request Correlation Tracing (X-Correlation-ID)                                |
|  5. Server-Managed Session Authenticator (Signed HttpOnly SameSite=Strict cookie) |
|  6. Double-Submit HMAC CSRF Protection (POST/PUT/PATCH/DELETE)                    |
|  7. RBAC & IDOR Object-Level Access Guard (Least Privilege)                       |
|  8. Safe Error Suppression (Zero stack traces or SQL error leakage)               |
+-----------------------------------------------------------------------------------+
                                        |  Prepared Statements (? placeholders)
                                        v
+-----------------------------------------------------------------------------------+
|                            DATABASE TIER (MySQL 8.0)                              |
|  - users (Bcrypt Cost 12 hashes, lockout timers, activity flags)                  |
|  - patients, doctors, appointments, medical_records (PHI separation)              |
|  - audit_logs (Immutable append-only forensic activity log)                       |
|  - sessions (Server-side session store with 30m idle timeout)                      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Live Demonstration Sequence (Step-by-Step for Viva)

### Step 1: Open the Application
Navigate to: **`http://localhost:4000`** (or `http://localhost:4200`)

### Step 2: The Security Demonstration Center
1. Click **"Security Demo"** in the top navigation bar or sidebar (`/security-demo`).
2. Show the **Security Specification Matrix** listing all 16 controls, threat models, implementation file locations, and verification status.
3. Use the **Live Security Testing Terminal**:
   - **Test 1 (SQL Injection)**: Submit `' OR '1'='1`. Show how the server uses prepared statements; 0 rows are returned and bypass is blocked.
   - **Test 2 (Password Hashing)**: Trigger password hash inspection. Show the `$2a$12$...` salted bcrypt hash and constant-time verification.
   - **Test 3 (XSS Sanitization & CSP)**: Submit `<script>alert('XSS')</script>`. Show how HTML entity encoding and CSP headers prevent execution.
   - **Test 4 (CSRF Protection)**: Test state mutation without token; observe HTTP 403 Forbidden.
   - **Test 5 (IDOR Prevention)**: Demonstrate cross-patient record access denial (Patient 1 trying to read Patient 2's Record 3).
   - **Test 9 (WAF Simulator)**: Select attack presets (SQLi, XSS, Path Traversal, Command Injection) or benign clinical text; watch the WAF intercept exploits with 403 `WAF_REQUEST_BLOCKED` while permitting valid medical records.

### Step 3: Role-Based Access Control Demonstration
1. Sign in as **Patient A** (`john.doe@patient.local` / `Patient@Secure2026!`).
2. Show Patient Dashboard: upcoming visits, own medical history.
3. Attempt to access `/admin/users` directly in the URL:
   - The server rejects the call with **HTTP 403 Forbidden**.
   - An `ACCESS_DENIED_RBAC` security audit log is created.
4. Sign out (show session cookie destruction in DevTools).
5. Sign in as **Doctor** (`dr.sharma@hospital.local` / `Doctor@Secure2026!`).
   - Doctor sees clinical console, assigned appointments, and can document records.
6. Sign in as **Administrator** (`admin@hospital.local` / `Admin@Secure2026!`).
   - Admin sees system metrics, user activation controls, doctor provisioning, and the real-time **Security Audit Trail**.

### Step 4: Enterprise Security Command Center (SOC)
1. In the Administrator portal or sidebar, click **"🛡️ Security Command Center"** (`/admin/security-center`).
2. Point out the enterprise dark cyber-themed SOC design:
   - **6 KPI Overview Cards**: Total Analyzed, Suspicious Requests, Blocked Attacks, Failed Logins, Active User Sessions, and Critical Alerts.
   - **Attack Activity Timeline**: 24-hour SVG polyline/area chart tracking threat peaks.
   - **Threat Analytics**: Horizontal bar chart of attacks by category and SVG donut chart of severity distribution.
   - **Live Security Event Stream**: Real-time table with severity pills (Critical, High, Medium, Low), action badges (Allowed, Blocked), and search/category filters.
   - **Forensic Trace Inspector**: Click "Inspect" on any event to view the full unredacted JSON event record (actor, IP, correlation ID, user-agent).

### Step 5: Two-Factor Authentication & Active Session Management
1. Navigate to **"🔐 Account Security (2FA)"** (`/account/security`).
2. **2FA Enrollment**:
   - Click "Enable Two-Factor Authentication".
   - Show the dynamic TOTP QR code generated via `qrcode` alongside the Base32 manual entry secret.
   - Enter a test code or explain RFC 6238 time-step algorithm with HMAC-SHA1 and AES-256-GCM secret encryption at rest.
   - Display the **8 single-use emergency backup recovery codes** and explain single-use hash consumption.
3. **Active Session & Device Management**:
   - Show the active session registry table: device type, browser (`Chrome on Windows`), IP address, login timestamp, last active timestamp, and the green **Current Device** badge.
   - Click "Revoke" on another session (or "Revoke All Other Sessions") to show real-time remote session destruction.
   - Demonstrate that any subsequent request using the revoked session cookie is rejected with HTTP 401.

### Step 6: Web Application Firewall (WAF) Management
1. Navigate to **"🧱 WAF Management"** (`/admin/waf`).
2. Inspect the 5 active WAF detection rules:
   - `WAF-SQLI-001` (SQL Injection)
   - `WAF-XSS-002` (Cross-Site Scripting)
   - `WAF-PATH-003` (Directory Traversal)
   - `WAF-CMD-004` (Command Injection)
   - `WAF-PROTO-005` (Protocol Anomalies)
3. Demonstrate toggling a rule between **BLOCK** and **DETECT_ONLY** mode; observe that changes generate an audited administrative event (`WAF_RULE_CONFIG_CHANGED`).

---

## 4. 5–7 Minute Spoken Presentation Script

*(You can read or speak this script directly during your college viva!)*

> **[0:00 - 1:00] Introduction & Problem Statement**  
> *"Good morning respected faculty and examiners. Today, I am presenting our academic Web Security project: the **Secure Hospital Management System (SHMS)**.  
> In healthcare applications, security is not an optional feature—it is a critical requirement. A hospital management system handles Protected Health Information (PHI). If an attacker breaches the system, they could exfiltrate psychiatric notes, steal medical identities, or maliciously cancel surgical procedures.  
> Rather than simply reading about these vulnerabilities, we built a fully working, full-stack hospital application with Angular, Node.js, Express, and MySQL, implementing every security control directly in code."*

> **[1:00 - 2:30] Core Defense Mechanisms**  
> *"Our architecture implements the fundamental design principles established by Saltzer and Schroeder: **Least Privilege**, **Complete Mediation**, and **Defense-in-Depth**.  
> First, for **Authentication and Password Security**, we never store plaintext passwords. We use **bcrypt with a work factor of 12**, meaning every password undergoes 4,096 rounds of key expansion with a unique cryptographic salt. When a user logs in, we use constant-time verification to prevent timing side-channel attacks, and we enforce a strict 5-attempt rate limit and account lockout.  
> Second, for **Session Security**, authentication tokens are never stored in localStorage, which is vulnerable to XSS. Instead, we use server-managed sessions with signed **HttpOnly, SameSite=Strict** cookies. On successful login, the session ID is regenerated to prevent session fixation.  
> Third, for **Injection and XSS Prevention**, 100% of our database queries use parameterized prepared statements through `mysql2/promise`. Strings like `' OR '1'='1` are treated strictly as literal data, making SQL injection impossible. On the client, Angular automatically escapes template variables, while Helmet enforces a strict Content Security Policy."*

> **[2:30 - 4:00] CSRF and IDOR Prevention**  
> *"Now let's examine two of the most critical web vulnerabilities: CSRF and IDOR.  
> Because our application uses cookies, it could be vulnerable to Cross-Site Request Forgery. To solve this, we implemented a **Double-Submit HMAC CSRF defense**. Every state-changing request—POST, PUT, or DELETE—must include a signed `X-CSRF-Token` header. An attacker on a third-party website cannot forge this header due to the Same-Origin Policy.  
> Next, **IDOR—Insecure Direct Object Reference**. In many naive hospital portals, if Patient John Doe has record #1, he can simply change the URL to record #3 to view Jane Smith's private diagnosis. In SHMS, our backend middleware `requireRecordAccess` enforces object-level authorization: it verifies that the requesting user's identity matches the record owner in the database. If not, access is denied with HTTP 403 and logged immediately."*

> **[4:00 - 5:30] Live Demonstration: Advanced Features (SOC, 2FA, WAF)**  
> *"Here on screen is our **Security Demonstration Center**, built directly into the application for this presentation.  
> As you can see in the terminal, we can trigger live tests against the running Express backend:  
> - When we inject `' OR '1'='1` into the query runner, the server returns 0 matched rows because the input is safely parameterized.  
> - When we test IDOR access for Patient 1 trying to access Record 3, the server returns `OBJECT_ACCESS_DENIED`.  
> - In our **Web Application Firewall (WAF) Simulator**, incoming requests are inspected by an in-line regex engine before reaching application routes, detecting SQLi, XSS, and Path Traversal with configurable BLOCK and DETECT_ONLY modes.  
> - In our **Two-Factor Authentication (2FA)** system, we implement RFC 6238 TOTP with AES-256-GCM encrypted secrets at rest and single-use hashed recovery codes. An account with 2FA enabled receives a temporary token and cannot access any endpoints until the OTP is verified.  
> - In our **Active Session & Device Registry**, users can monitor every device logged into their account, view browser and OS telemetry, and remotely revoke sessions instantly.  
> - Finally, in our **Security Command Center (SOC)**, administrators get real-time situational awareness with live threat analytics, SVG attack timelines, and instant forensic trace analysis—all backed by real database audit logs with zero synthetic data."*

> **[5:30 - 6:30] Automated Testing & Conclusion**  
> *"To prove that our controls are robust and verifiable, we created a comprehensive automated security test suite comprising 4 suites and **57 automated tests** using Vitest and Supertest. All 57 tests pass with a 100% success rate, covering core authentication, RBAC, IDOR, SQLi, XSS, CSRF, rate limiting, 2FA enrollment, session revocation, WAF rule enforcement, and SOC analytics.  
> In conclusion, the Secure Hospital Management System demonstrates that secure web development is about defense-in-depth: combining transport security, secure cookies, parameterized database queries, strict server-side authorization, multi-factor authentication, active session revocation, in-line WAF inspection, and immutable auditing.  
> Thank you, and I am now ready for any questions."*

---

## 5. Potential Viva Questions & Answers

1. **Q: Why use bcrypt over SHA-256 for passwords?**  
   *A: SHA-256 is designed to be fast (gigahashes/sec), which makes it easy for attackers to brute-force with GPUs. Bcrypt is an adaptive key-derivation function that includes a configurable work factor (we use 12) and salt to resist hardware attacks.*

2. **Q: How does your Two-Factor Authentication (2FA) protect against secret leakage in the database?**  
   *A: Rather than saving the raw Base32 TOTP secret in the database, our system encrypts the secret using AES-256-GCM with an authenticated encryption key (`TWO_FACTOR_ENCRYPTION_KEY`) managed outside the database in the environment. Additionally, backup recovery codes are stored strictly as SHA-256 hashes and can only be used once.*

3. **Q: Why is server-side session management superior to stateless JWTs for hospital environments?**  
   *A: Stateless JWTs cannot be revoked immediately before expiration without maintaining a server-side blacklist—which negates their statelessness. With our server-side session registry, an administrator or physician who loses their mobile device can click 'Revoke Session', instantly terminating that session on the backend. Subsequent requests from that device fail with HTTP 401 immediately.*

4. **Q: How does the application-level WAF differ from parameterized queries?**  
   *A: Parameterized queries ensure the database engine never interprets user input as SQL code (preventing injection at the persistence layer). The WAF inspects incoming requests at the earliest middleware layer, detecting malicious patterns (SQLi, XSS, path traversal) across headers, query parameters, and JSON payloads. This provides defense-in-depth, allows immediate blocking or alerting, and catches automated scanners before requests reach application logic.*

5. **Q: Why are Angular route guards not enough for security?**  
   *A: Client-side route guards only control UI display in the browser. Anyone using Postman, curl, or browser DevTools can bypass client guards. The true security boundary must always be enforced on the backend API.*

6. **Q: How does Double-Submit CSRF work?**  
   *A: The server sets a signed token in a cookie and returns it to the client. On state-changing calls, the client reads the token and sends it in the `X-CSRF-Token` header. Because third-party sites cannot read cookies or set custom headers on cross-origin requests, forged requests cannot provide the token.*

7. **Q: What is the difference between vertical and horizontal privilege escalation?**  
   *A: Vertical escalation occurs when a lower-privileged role (Patient) accesses higher-privileged endpoints (Admin user management). Horizontal escalation (IDOR) occurs when a user accesses another user's resources at the same privilege level (Patient A accessing Patient B's records).*
