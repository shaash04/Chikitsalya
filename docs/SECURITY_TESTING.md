# Security Testing Report & Verification Matrix

**System**: Secure Hospital Management System (SHMS)  
**Academic Course**: 21CSE438T - Web Security  
**Test Framework**: Vitest v3.0.7 & Supertest v7.0.0  
**Status**: 21 / 21 Tests Passed (100% Pass Rate)

---

## 1. Automated Test Execution Summary

The automated security test suite exercises all 12 core controls in isolation against realistic threat vectors.

### Test Command
```powershell
npm test
# Or from backend directory:
cd backend
npx vitest run
```

### Verified Test Run Output
```text
 RUN  v3.2.7 C:/Users/tshal/Downloads/CHIKITSALYA/backend

 ✓ tests/security.test.ts (21 tests) 2421ms
   ✓ should successfully authenticate with valid credentials and return httpOnly session cookie
   ✓ should reject invalid credentials with generic error message (anti-account enumeration)
   ✓ should reject nonexistent email with identical generic error to prevent account discovery
   ✓ should reject unauthenticated requests to protected endpoints with 401
   ✓ should invalidate session and clear cookie upon logout
   ✓ should prevent patient from accessing administrator APIs (HTTP 403)
   ✓ should prevent doctor from accessing administrator user management APIs (HTTP 403)
   ✓ should allow administrator to access admin user management APIs (HTTP 200)
   ✓ should allow Patient 1 (John Doe) to view their own medical record #1
   ✓ should DENY Patient 1 (John Doe) from accessing Patient 2 (Jane Smith) record #3 (IDOR Prevented)
   ✓ should reject SQL injection payload in login without altering SQL query structure
   ✓ should safely execute parameterized query via security demo without altering SQL syntax
   ✓ should issue a cryptographically signed CSRF token with cookie and JSON
   ✓ should reject state-changing request (POST appointment) when X-CSRF-Token header is missing
   ✓ should accept state-changing request when valid X-CSRF-Token header is attached
   ✓ should attach expected Helmet security headers to all responses
   ✓ should escape dangerous HTML tags in input via security demo test
   ✓ should reject malformed patient registration data with 400 Bad Request
   ✓ should reject invalid appointment ID with 400 validation error and suppress stack traces
   ✓ should throttle requests and return HTTP 429 when rate limit threshold is exceeded
   ✓ should record audit events in database and allow admin inspection

 Test Files  1 passed (1)
      Tests  21 passed (21)
   Duration  4.61s
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
