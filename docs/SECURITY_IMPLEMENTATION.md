# Security Implementation Specification

**System**: Secure Hospital Management System (SHMS)  
**Course Code**: 21CSE438T - Web Security  
**Authors**: Senior Application Security & Full-Stack Engineering Team  
**Date**: October 2026

---

## Executive Summary

The Secure Hospital Management System (SHMS) is designed from first principles using the **Defense-in-Depth** and **Least Privilege** paradigms. In a healthcare environment, software vulnerabilities don't just compromise data; they can expose confidential diagnostic records, enable prescription fraud, or tamper with critical medical interventions.

This document details the 12 core security controls implemented in functional code across the application stack.

---

## Security Feature 1: Password Hashing

### The Threat
Offline dictionary attacks, credential dumping, and rainbow table lookups resulting from database exfiltration or insider threats.

### Why It Matters in Healthcare
Hospital staff and patients often reuse passwords across personal and work services. If an attacker breaches the hospital database and obtains plaintext passwords or fast cryptographic hashes (e.g. MD5 or SHA-1), every user account across external services is compromised, and attackers can impersonate physicians to alter prescriptions.

### Security Control Used
- **Algorithm**: `bcrypt` (Blowfish-based key derivation function) with cost factor **12** (4,096 iterations of key expansion).
- **Salt**: 128-bit cryptographically secure pseudorandom salt generated uniquely per password.

### Implementation Files
- `backend/src/utils/security.ts` (`hashPassword`, `verifyPassword`, `validatePasswordStrength`)
- `backend/src/services/authService.ts`
- `backend/src/database/seedRunner.ts`

### How the Control Works
1. When a user registers or changes their password, `validatePasswordStrength` checks that the input contains at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.
2. `bcrypt.hash(password, 12)` derives a 60-character string formatted as `$2a$12$[22 salt chars][31 hash chars]`.
3. During login, `verifyPassword` uses constant-time comparison to evaluate the input against the stored hash, preventing timing side-channel attacks.
4. If a user is not found, the system still runs a dummy bcrypt comparison against a dummy hash to prevent timing-based user enumeration.
5. Password hashes are strictly omitted from all API responses and sanitized out of logs.

### Limitations
Bcrypt is memory-light compared to Argon2id. In massive GPU cracking clusters, Argon2id provides superior memory hardness. However, cost 12 bcrypt remains computationally expensive and an accepted industry standard.

---

## Security Feature 2: Authentication & Secure Sessions

### The Threat
Session hijacking, session fixation, session sidejacking, and token theft via Cross-Site Scripting (XSS).

### Why It Matters in Healthcare
If tokens are stored in browser `localStorage`, any XSS flaw allows JavaScript to steal the token and maintain unauthorized access to patient medical records without the patient's knowledge.

### Security Control Used
- Server-managed stateful sessions with cryptographically signed cookies (`shms_session`).
- Cookie flags: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` (in production).
- Database-backed session table (`sessions`) with in-memory caching.
- Dynamic session regeneration upon authentication.
- 30-minute idle session timeout and 24-hour absolute session expiration.

### Implementation Files
- `backend/src/middleware/sessionAuth.ts`
- `backend/src/services/authService.ts`

### How the Control Works
1. Upon successful login, `authService` calls `createSession`.
2. A new 256-bit random session identifier is generated using `crypto.randomBytes(32).toString('hex')`.
3. The session ID is signed using an HMAC-SHA256 signature generated with `SESSION_SECRET`.
4. The signed token is dispatched to the client in an `HttpOnly` cookie.
5. On every request, `sessionMiddleware` verifies the HMAC signature. If tampered, the cookie is rejected immediately.
6. The session's `lastActiveAt` timestamp is evaluated. If the user was idle for more than 30 minutes, the session is purged from the database and the cookie cleared.
7. Upon `/api/auth/logout`, the server deletes the session record from both memory and the database.

### Limitations
Stateful sessions require database queries or in-memory caches. In multi-region distributed clusters, sticky sessions or Redis cache replication is necessary.

---

## Security Feature 3: Role-Based Access Control (RBAC)

### The Threat
Vertical privilege escalation, where ordinary users (patients) invoke administrative APIs or doctor clinical actions.

### Why It Matters in Healthcare
Allowing a patient to invoke administrative functions would let them create doctor accounts, approve their own disability certificates, or deactivate system auditing.

### Security Control Used
- Server-side middleware `requireAuthentication` and `requireRole('admin' | 'doctor' | 'patient')`.
- Explicit separation of clinical privilege vs system administrative privilege.

### Implementation Files
- `backend/src/middleware/rbac.ts`
- `backend/src/routes/index.ts`

### How the Control Works
1. The route definition specifies the minimum role required (e.g. `apiRouter.get('/admin/users', requireAuthentication, requireRole('admin'), ...)`).
2. The middleware inspects `req.sessionUser.role`.
3. If the role does not match, the request is terminated with HTTP `403 Forbidden`.
4. A security audit record with event `ACCESS_DENIED_RBAC` and outcome `DENIED` is logged with the user's IP and correlation ID.
5. Angular client-side route guards (`roleGuard`) provide UI convenience, but the server is the authoritative trust boundary.

### Limitations
Static role enums do not account for dynamic contextual delegation (e.g. temporary coverage for a doctor on leave). In enterprise hospitals, Attribute-Based Access Control (ABAC) is used for dynamic delegations.

---

## Security Feature 4: SQL Injection Prevention

### The Threat
SQL Injection (SQLi) via raw string concatenation in SQL queries, enabling authentication bypass, table dumping, and data destruction.

### Why It Matters in Healthcare
A single SQL injection vulnerability in an appointment search bar or login field can allow an attacker to dump the entire hospital database, exposing diagnoses, HIV status, psychiatric notes, and psychiatric evaluations.

### Security Control Used
- 100% Prepared Statements and Parameterized Queries via `mysql2/promise`.
- Strict input typing and enum validation via Zod.
- Allowlisted column sorting.

### Implementation Files
- `backend/src/repositories/userRepository.ts`
- `backend/src/repositories/patientRepository.ts`
- `backend/src/repositories/doctorRepository.ts`
- `backend/src/repositories/appointmentRepository.ts`
- `backend/src/repositories/medicalRecordRepository.ts`
- `backend/src/repositories/auditLogRepository.ts`

### How the Control Works
1. All queries use placeholder syntax: `SELECT * FROM users WHERE email = ? LIMIT 1`.
2. The database driver sends the query template to the database engine to be compiled and parsed into an Abstract Syntax Tree (AST).
3. The user values are transmitted separately as raw literal data bytes.
4. Input strings containing malicious SQL keywords (such as `' OR '1'='1` or `admin' --`) are treated as literal characters within the search string, never as executable SQL tokens.

### Limitations
Does not prevent logical errors where valid parameters are used inappropriately (which is handled by RBAC and IDOR checks).

---

## Security Feature 5: Cross-Site Scripting (XSS) Prevention

### The Threat
Stored and Reflected Cross-Site Scripting (XSS), where malicious HTML or JavaScript is injected into text fields and executed in the victim's browser.

### Why It Matters in Healthcare
An attacker could submit a prescription note containing `<script src="evil.com/hook.js"></script>`. When an attending doctor views the medical chart, the script executes, exfiltrating patient data or approving unauthorized medication orders.

### Security Control Used
- Content Security Policy (CSP) headers configured via Helmet.
- Context-aware HTML sanitization and entity escaping (`escapeHtml`).
- Angular contextual template escaping (Angular escapes `{{ }}` by default).
- Avoidance of `innerHTML` or `bypassSecurityTrust*` calls.

### Implementation Files
- `backend/src/middleware/securityHeaders.ts`
- `backend/src/utils/security.ts`
- Frontend Angular templates (`features/*`)

### How the Control Works
1. The server emits a strict Content-Security-Policy header:
   ```text
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; object-src 'none'; frame-ancestors 'none'
   ```
2. Any inline script or unauthorized third-party script injected into the DOM is blocked by the browser engine.
3. Server-side inputs are defensively escaped before storage or logging.
4. The Angular compiler automatically encodes HTML entities when rendering strings in templates.

### Limitations
Reflected XSS can still occur if third-party libraries deliberately inject raw DOM nodes using bypass methods. Development code must be audited against `bypassSecurityTrustHtml`.

---

## Security Feature 6: Cross-Site Request Forgery (CSRF) Protection

### The Threat
Cross-Site Request Forgery (CSRF), where an attacker tricks an authenticated browser into submitting unauthorized requests to the target application.

### Why It Matters in Healthcare
Because the application uses cookie-based authentication, an authenticated patient visiting a malicious website could have a hidden form auto-submitted to `/api/appointments` or `/api/appointments/1/cancel`, cancelling their surgery without their knowledge.

### Security Control Used
- Double-Submit Cookie / Header CSRF pattern with HMAC signatures.
- Safe HTTP methods (GET, HEAD, OPTIONS) are read-only and exempted.
- State-changing HTTP methods (POST, PUT, PATCH, DELETE) require a cryptographically valid `X-CSRF-Token` header.

### Implementation Files
- `backend/src/middleware/csrf.ts`
- `backend/src/utils/security.ts` (`generateCsrfToken`, `verifyCsrfToken`)
- `frontend/src/app/core/interceptors/csrf.interceptor.ts`

### How the Control Works
1. Upon application load, the frontend calls `GET /api/csrf-token`.
2. The server generates a random nonce, signs it with `CSRF_SECRET` via HMAC-SHA256, and returns it in both a readable cookie (`XSRF-TOKEN`) and JSON.
3. The Angular `csrfInterceptor` intercepts all outgoing POST, PUT, PATCH, and DELETE requests and attaches the `X-CSRF-Token` header.
4. On incoming state-changing requests, `csrfProtection` middleware extracts the header, recomputes the HMAC signature using `crypto.timingSafeEqual`, and rejects missing or tampered tokens with `403 Forbidden (CSRF_TOKEN_MISSING / CSRF_TOKEN_INVALID)`.
5. Third-party sites cannot read the CSRF cookie or set custom headers due to the browser's Same-Origin Policy (SOP).

### Limitations
Subdomain takeover on the same top-level domain can theoretically allow an attacker to overwrite cookies if SameSite is not configured to `Strict`.

---

## Security Feature 7: Brute-Force & Rate Limiting

### The Threat
Credential stuffing, automated password brute-forcing, and resource exhaustion DoS attacks on authentication endpoints.

### Why It Matters in Healthcare
Automated botnets attempt thousands of common passwords against doctor portals to gain access to prescription systems.

### Security Control Used
- IP-based rate limiting via `express-rate-limit`.
- Threshold: **5 login attempts per 15-minute window**.
- Database-backed account lockout: 5 consecutive failed attempts lock the specific account for 15 minutes.
- HTTP `429 Too Many Requests` status code with standardized JSON response.

### Implementation Files
- `backend/src/middleware/rateLimiter.ts`
- `backend/src/services/authService.ts`
- `backend/src/repositories/userRepository.ts`

### How the Control Works
1. Every login request passes through `loginRateLimiter`.
2. If more than 5 requests originate from the same IP within 15 minutes, the limiter returns `429 Too Many Requests` and logs a `RATE_LIMIT_EXCEEDED` audit entry.
3. Inside `authService.login`, if the password check fails, `failed_login_attempts` is incremented.
4. Once `failed_login_attempts >= 5`, `locked_until` is set to `CURRENT_TIMESTAMP + 15 minutes`.
5. Subsequent login attempts for that user are denied before password evaluation.

### Limitations
In corporate networks where all clinic computers share a single NAT egress IP, multiple legitimate staff members could trigger IP rate limits. In production, rate limits should combine IP address and username.

---

## Security Feature 8: Security Response Headers & HTTPS

### The Threat
Clickjacking (UI redressing), MIME-type confusion attacks, protocol downgrade attacks, and cross-origin information leakage.

### Why It Matters in Healthcare
Attackers can frame the hospital appointment scheduling page inside an invisible iframe (`clickjacking`), tricking a logged-in user into clicking buttons they did not intend.

### Security Control Used
- Helmet HTTP security header suite.
- Anti-clickjacking: `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`.
- Anti-MIME sniffing: `X-Content-Type-Options: nosniff`.
- Referrer policy: `strict-origin-when-cross-origin`.
- Anti-caching: `Cache-Control: no-store, no-cache, must-revalidate` for sensitive medical endpoints.

### Implementation Files
- `backend/src/middleware/securityHeaders.ts`
- `backend/src/app.ts`

### How the Control Works
1. Every HTTP response is intercepted by `helmetMiddleware` and `customSecurityHeaders`.
2. The headers prevent the browser from rendering the application in an iframe, prevent the browser from sniffing MIME types, and ensure that cached copies of medical records are not left in shared web proxies.

---

## Security Feature 9: Input Validation & Safe Error Handling

### The Threat
Malformed payloads, buffer overflows, type juggling, and information disclosure through stack traces and SQL error messages.

### Why It Matters in Healthcare
Detailed database errors (e.g. `Table 'shms_db.patients' column 'diagnosis' failed foreign key constraint`) reveal schema structures, table names, and system paths, providing attackers with the exact blueprints needed for exploitation.

### Security Control Used
- Schema validation on every incoming request using `zod`.
- Whitelisting of accepted fields (Mass Assignment prevention).
- Centralized error handler suppressing stack traces and system paths.

### Implementation Files
- `backend/src/validators/index.ts`
- `backend/src/middleware/errorHandler.ts`

### How the Control Works
1. Request bodies and URL parameters are validated against strict Zod schemas before reaching controllers.
2. If invalid, the request is rejected with `400 Bad Request` and field-level validation errors.
3. If an unhandled exception occurs, the full error stack is logged internally with a correlation ID, while the client receives only a safe message: `"An unexpected internal error occurred. For security reasons, details are suppressed."`

---

## Security Feature 10: Patient Privacy & IDOR Prevention

### The Threat
Insecure Direct Object Reference (IDOR), where a user changes an ID parameter in a URL (e.g. `GET /api/medical-records/3` instead of `/api/medical-records/1`) to view another user's private data.

### Why It Matters in Healthcare
This is the single most critical privacy vulnerability in healthcare software. An IDOR flaw allows Patient A to read Patient B's diagnosis, psychiatric notes, and lab reports simply by guessing consecutive integer IDs.

### Security Control Used
- Object-level authorization middleware `requireRecordAccess`.
- Dynamic ownership verification against the database.
- Principle of Least Privilege: Confidential physician notes are automatically redacted from patient responses.

### Implementation Files
- `backend/src/middleware/rbac.ts` (`requireRecordAccess`)
- `backend/src/services/medicalRecordService.ts`
- `backend/src/services/appointmentService.ts`

### How the Control Works
1. When requesting `/api/medical-records/:id`, `requireRecordAccess` queries the record from the database.
2. If the user's role is `patient`, the middleware verifies that `patient.user_id === req.sessionUser.userId`.
3. If the record belongs to another patient, the request is immediately rejected with `403 Forbidden (OBJECT_ACCESS_DENIED)`.
4. An `IDOR_PREVENTED` security event is written to `audit_logs` with the actor's ID and attempted target ID.
5. If the user is an authorized patient viewing their own record, `medicalRecordService` nullifies `confidential_notes` before returning the JSON payload.

---

## Security Feature 11: Security Audit Logging

### The Threat
Undetected security breaches, internal fraud, lack of accountability, and repudiation of sensitive administrative actions.

### Why It Matters in Healthcare
Medical staff might inappropriately view the records of high-profile patients or family members. An immutable audit log ensures every view, update, and access denial is permanently recorded for regulatory accountability.

### Security Control Used
- Dedicated database audit table `audit_logs`.
- Logs actor ID, username, role, event type, target resource, outcome (`SUCCESS`, `FAILURE`, `DENIED`), IP address, user agent, correlation ID, and sanitized metadata.
- Read-only access restricted strictly to administrators.
- Passwords, hashes, and session secrets are strictly excluded from logs.

### Implementation Files
- `backend/src/repositories/auditLogRepository.ts`
- `backend/src/middleware/auditLogger.ts`
- `backend/src/controllers/auditLogController.ts`
- `frontend/src/app/features/audit-logs/audit-log-viewer/`

### How the Control Works
1. Every critical operation (logins, failed attempts, record creations, cancellations, status changes, access denials) invokes `auditLogRepository.record(...)`.
2. Metadata is sanitized using `sanitizeLogInput` to prevent Log Injection (CRLF) attacks.
3. Administrators can filter the audit trail by event type, outcome, and timestamp.

---

## Security Feature 12: Secure Configuration & Secrets Management

### The Threat
Hardcoded secrets, exposed database credentials in Git repositories, and runtime crashes due to unconfigured services.

### Why It Matters in Healthcare
Committing database passwords or session secrets to a repository allows attackers to forge session cookies or directly connect to the hospital database.

### Security Control Used
- Environment variables managed through `.env`.
- Strict startup validation using Zod.
- `.env` excluded from version control via `.gitignore`.
- `.env.example` provided with safe placeholder documentation.

### Implementation Files
- `backend/src/config/env.ts`
- `.env.example`
- `.gitignore`

### How the Control Works
1. At application boot, `backend/src/config/env.ts` reads environment variables and executes `envSchema.safeParse`.
2. If any secret (e.g. `SESSION_SECRET`, `CSRF_SECRET`) is missing or shorter than 16 characters, the application aborts immediately with a clear diagnostic error.
3. Secrets are never exposed to the frontend build or API responses.
