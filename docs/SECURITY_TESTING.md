# Security Testing Report & Verification Matrix

**System**: Secure Hospital Management System (SHMS)  
**Academic Course**: 21CSE438T - Web Security  
**Test Framework**: Vitest v3.2.7 & Supertest v7.0.0  
**Status**: 57 / 57 Tests Passed (100% Pass Rate)

---

## 1. Automated Test Execution Summary

The automated security test suite comprises 4 comprehensive test suites exercising all 16 defense-in-depth controls in isolation against realistic threat vectors.

### Test Command
```powershell
npm test
# Or from backend directory:
cd backend
npx vitest run
```

### Verified Test Run Output
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

## 2. Test Cases Specification

### Suite 1: Authentication & Password Security
- **TC-AUTH-01 (Valid Login)**:
  - Input: `admin@hospital.local` / `Admin@Secure2026!`
  - Expected: HTTP 200, sets signed `shms_session` cookie with `HttpOnly` and `SameSite=Strict`. Password hash is NOT exposed in the payload.
  - Result: **PASSED**
- **TC-AUTH-02 (Invalid Credentials)**:
  - Input: `admin@hospital.local` / `WrongPassword999!`
  - Expected: HTTP 401 with generic message `Invalid email address or password provided.`
  - Result: **PASSED**
- **TC-AUTH-03 (Account Enumeration Defense)**:
  - Input: Nonexistent email `nonexistent.user@hospital.local`
  - Expected: HTTP 401 with identical error message and constant-time bcrypt execution.
  - Result: **PASSED**
- **TC-AUTH-04 (Protected Resource Access)**:
  - Input: Request without session cookie to `/api/appointments`
  - Expected: HTTP 401 `UNAUTHENTICATED`.
  - Result: **PASSED**
- **TC-AUTH-05 (Session Invalidation on Logout)**:
  - Input: Call `/api/auth/logout`, then reuse old session cookie on `/api/appointments`.
  - Expected: Logout clears cookie and deletes server session; subsequent call returns HTTP 401.
  - Result: **PASSED**

### Suite 2: Role-Based Access Control (RBAC)
- **TC-RBAC-01 (Vertical Escalation Prevention)**:
  - Actor: Patient (`john.doe@patient.local`)
  - Target: `GET /api/admin/users`
  - Expected: HTTP 403 Forbidden with `FORBIDDEN` error and audit log entry.
  - Result: **PASSED**
- **TC-RBAC-02 (Doctor Restricted from Admin)**:
  - Actor: Doctor (`dr.sharma@hospital.local`)
  - Target: `GET /api/admin/users`
  - Expected: HTTP 403 Forbidden.
  - Result: **PASSED**
- **TC-RBAC-03 (Authorized Admin Access)**:
  - Actor: Administrator (`admin@hospital.local`)
  - Target: `GET /api/admin/users`
  - Expected: HTTP 200 with list of safe user objects.
  - Result: **PASSED**

### Suite 3: Object-Level Authorization (IDOR Prevention)
- **TC-IDOR-01 (Permitted Patient Record View)**:
  - Actor: Patient 1 (John Doe, ID 4)
  - Target: `GET /api/medical-records/1` (John Doe's record)
  - Expected: HTTP 200. Internal doctor `confidential_notes` are redacted (null).
  - Result: **PASSED**
- **TC-IDOR-02 (Horizontal Privilege Escalation Denied)**:
  - Actor: Patient 1 (John Doe, ID 4)
  - Target: `GET /api/medical-records/3` (Jane Smith's record)
  - Expected: HTTP 403 Forbidden (`OBJECT_ACCESS_DENIED`). Zero clinical information disclosed.
  - Result: **PASSED**

### Suite 4: SQL Injection Prevention
- **TC-SQLI-01 (Login Query Injection)**:
  - Input: Email `"victim@hospital.local' OR '1'='1"`, Password `"arbitrary' OR 1=1 --"`
  - Expected: Handled as literal string parameters; 0 records match, authentication fails safely.
  - Result: **PASSED**
- **TC-SQLI-02 (Demo Parameterized Query Execution)**:
  - Input: `admin' OR 1=1 --`
  - Expected: Returned `matchedRecordsCount: 0`, `authenticationBypassed: false`.
  - Result: **PASSED**

### Suite 5: CSRF Protection
- **TC-CSRF-01 (Token Issuance)**:
  - Target: `GET /api/csrf-token`
  - Expected: HTTP 200 with 2-part cryptographic HMAC-SHA256 token in cookie and body.
  - Result: **PASSED**
- **TC-CSRF-02 (Missing Header Rejection)**:
  - Action: POST to `/api/appointments` without `X-CSRF-Token` header.
  - Expected: HTTP 403 Forbidden (`CSRF_TOKEN_MISSING`).
  - Result: **PASSED**
- **TC-CSRF-03 (Valid Token Acceptance)**:
  - Action: POST to `/api/appointments` with valid `X-CSRF-Token`.
  - Expected: HTTP 201 Created.
  - Result: **PASSED**

### Suite 6: Security Response Headers
- **TC-HDR-01 (Header Verification)**:
  - Target: `GET /api/csrf-token`
  - Expected:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Content-Security-Policy: default-src 'self' ...`
  - Result: **PASSED**

### Suite 7: Input Validation & Error Handling
- **TC-VAL-01 (Malformed Input Rejection)**:
  - Input: Invalid username with special symbols, invalid email syntax, 3-char password.
  - Expected: HTTP 400 Bad Request with Zod schema validation errors.
  - Result: **PASSED**
- **TC-VAL-02 (Stack Trace Suppression)**:
  - Input: `GET /api/appointments/not-a-number`
  - Expected: HTTP 400 without `stack`, `sql`, or filesystem paths.
  - Result: **PASSED**

### Suite 8: Rate Limiting
- **TC-RATE-01 (Throttling)**:
  - Action: Exceed configured request quota from single IP.
  - Expected: HTTP 429 Too Many Requests.
  - Result: **PASSED**

### Suite 9: Security Audit Logging
- **TC-LOG-01 (Audit Trail Inspection)**:
  - Action: Query `GET /api/audit-logs` as administrator.
  - Expected: HTTP 200 with immutable database log entries containing IP, actor, correlation ID, and sanitized metadata without passwords.
  - Result: **PASSED**

### Suite 10: Security Command Center & Threat Analytics (11 Tests)
- **TC-SOC-01 (RBAC Protection)**:
  - Action: Unauthenticated or non-admin request to `/api/admin/security/overview`.
  - Expected: HTTP 401 / 403 Forbidden.
  - Result: **PASSED**
- **TC-SOC-02 (Admin Access Allowed)**:
  - Action: Authenticated administrator requests `/api/admin/security/overview`.
  - Expected: HTTP 200 with 6 real KPI metrics calculated from database.
  - Result: **PASSED**
- **TC-SOC-03 (Threat Analytics)**:
  - Action: Query `/api/admin/security/analytics`.
  - Expected: HTTP 200 with 24h timeline points, threat categories distribution, severity breakdown, and login ratio.
  - Result: **PASSED**
- **TC-SOC-04 (Live Event Filtering)**:
  - Action: Query `/api/admin/security/events?severity=CRITICAL` and `?category=SQL_INJECTION`.
  - Expected: Events correctly filtered and paginated from database audit table.
  - Result: **PASSED**
- **TC-SOC-05 (Actionable Security Alerts)**:
  - Action: Query `/api/admin/security/alerts`.
  - Expected: Returns structured active alerts for repeated auth failures, unauthorized record access, and high-severity attacks.
  - Result: **PASSED**

### Suite 11: Two-Factor Authentication (2FA / TOTP) (8 Tests)
- **TC-2FA-01 (Setup Secret & QR Generation)**:
  - Action: `POST /api/auth/2fa/setup` as authenticated user.
  - Expected: HTTP 200 returning Base32 secret string and valid `data:image/png;base64,...` QR code.
  - Result: **PASSED**
- **TC-2FA-02 (Invalid Code Rejection)**:
  - Action: `POST /api/auth/2fa/enable` with invalid 6-digit code.
  - Expected: HTTP 400 Bad Request (`INVALID_2FA_CODE`).
  - Result: **PASSED**
- **TC-2FA-03 (Valid Enable & Recovery Code Generation)**:
  - Action: `POST /api/auth/2fa/enable` with valid TOTP code.
  - Expected: HTTP 200 returning 8 single-use recovery codes; secret encrypted with AES-256-GCM in database.
  - Result: **PASSED**
- **TC-2FA-04 (Login Flow with 2FA Interception)**:
  - Action: `POST /api/auth/login` for user with 2FA enabled.
  - Expected: HTTP 200 with `{ requires2FA: true, tempToken: "..." }`; NO session cookie set.
  - Result: **PASSED**
- **TC-2FA-05 (2FA Login Verification with TOTP)**:
  - Action: `POST /api/auth/login/2fa` with valid temporary token and TOTP code.
  - Expected: HTTP 200 with signed `shms_session` cookie issued.
  - Result: **PASSED**
- **TC-2FA-06 (Single-Use Recovery Code & Reuse Rejection)**:
  - Action: Verify login using recovery code; attempt second login using identical code.
  - Expected: First login succeeds (200); second login fails (400 `INVALID_2FA_CODE`).
  - Result: **PASSED**
- **TC-2FA-07 (Secure Disable)**:
  - Action: `POST /api/auth/2fa/disable` requiring both current password and valid OTP.
  - Expected: 2FA disabled in database and recovery codes purged.
  - Result: **PASSED**

### Suite 12: Active Session & Device Management (5 Tests)
- **TC-SES-01 (Session Registry Listing)**:
  - Action: `GET /api/auth/sessions`.
  - Expected: HTTP 200 with active session records, parsed OS/browser (`Windows`, `Chrome`), IP address, and `isCurrent: true` badge.
  - Result: **PASSED**
- **TC-SES-02 (Individual Session Revocation)**:
  - Action: `DELETE /api/auth/sessions/:sessionId` targeting a secondary session.
  - Expected: HTTP 200; targeted session removed from database registry.
  - Result: **PASSED**
- **TC-SES-03 (Revoked Session Rejection Enforcement)**:
  - Action: Subsequent API request presenting the revoked session cookie.
  - Expected: HTTP 401 Unauthorized (`SESSION_INVALID_OR_REVOKED`).
  - Result: **PASSED**
- **TC-SES-04 (Revoke All Other Sessions)**:
  - Action: `DELETE /api/auth/sessions/other`.
  - Expected: HTTP 200; all sessions except current device destroyed.
  - Result: **PASSED**

### Suite 13: Web Application Firewall (WAF) Simulator (12 Tests)
- **TC-WAF-01 (SQL Injection Detection & Block)**:
  - Action: GET `/api/doctors?search=' UNION SELECT username, password FROM users --`.
  - Expected: HTTP 403 Forbidden (`WAF_REQUEST_BLOCKED`) with rule `WAF-SQLI-001`.
  - Result: **PASSED**
- **TC-WAF-02 (XSS Payload Detection & Block)**:
  - Action: POST request containing `<script>alert('XSS')</script>`.
  - Expected: HTTP 403 Forbidden with rule `WAF-XSS-002`.
  - Result: **PASSED**
- **TC-WAF-03 (Path Traversal Detection & Block)**:
  - Action: GET request with parameter `../../../../etc/passwd` or `..\..\win.ini`.
  - Expected: HTTP 403 Forbidden with rule `WAF-PATH-003`.
  - Result: **PASSED**
- **TC-WAF-04 (False-Positive Handling on Benign Medical Text)**:
  - Action: POST clinical record with text: `"Patient denies chest pain; scheduled follow-up in 2 weeks. Prescribe Amoxicillin 500mg."`.
  - Expected: WAF permits request without blocking (200 / 201).
  - Result: **PASSED**
- **TC-WAF-05 (Admin Role Restriction on Rule Updates)**:
  - Action: Non-admin or unauthenticated PATCH to `/api/admin/waf/rules/WAF-SQLI-001`.
  - Expected: HTTP 401 / 403 Forbidden.
  - Result: **PASSED**
- **TC-WAF-06 (Dynamic Mode Toggle - DETECT_ONLY)**:
  - Action: Admin updates rule to `DETECT_ONLY`; resubmits attack payload.
  - Expected: WAF logs incident to `audit_logs` but allows request through (does not block).
  - Result: **PASSED**
- **TC-WAF-07 (Attack Simulation Endpoint)**:
  - Action: POST `/api/security-demo/test-waf` with attack string.
  - Expected: HTTP 200 returning inspection diagnosis, matched rule ID, pattern, and defense explanation.
  - Result: **PASSED**
