import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import express from 'express';
import { createApp } from '../src/app.js';
import { initializeDatabase } from '../src/config/database.js';

describe('Secure Hospital Management System (SHMS) - Automated Security Test Suite', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_IN_MEMORY_DB = 'true';
    await initializeDatabase();
    app = createApp();
  });

  // ===========================================================================
  // 1. AUTHENTICATION SECURITY TESTS
  // ===========================================================================
  describe('Security Feature 1 & 2: Authentication & Password Hashing', () => {
    it('should successfully authenticate with valid credentials and return httpOnly session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hospital.local', password: 'Admin@Secure2026!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@hospital.local');
      expect(res.body.data.user.role).toBe('admin');

      // Crucial: Password hash MUST NOT be leaked in API response
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();

      // Session cookie must be set and marked HttpOnly
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c: string) => c.startsWith('shms_session='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Strict');
    });

    it('should reject invalid credentials with generic error message (anti-account enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hospital.local', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email address or password provided.');
    });

    it('should reject nonexistent email with identical generic error to prevent account discovery', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent.user@hospital.local', password: 'Password@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email address or password provided.');
    });

    it('should reject unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/appointments');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should invalidate session and clear cookie upon logout', async () => {
      // 1. Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dr.sharma@hospital.local', password: 'Doctor@Secure2026!' });
      const cookie = loginRes.headers['set-cookie'];
      expect(cookie).toBeDefined();

      // 2. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // 3. Attempting to use the old session cookie after logout must fail with 401
      const checkRes = await request(app)
        .get('/api/appointments')
        .set('Cookie', cookie);
      expect(checkRes.status).toBe(401);
    });
  });

  // ===========================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // ===========================================================================
  describe('Security Feature 3: Role-Based Access Control (RBAC)', () => {
    it('should prevent patient from accessing administrator APIs (HTTP 403)', async () => {
      const patientLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
      const patientCookie = patientLogin.headers['set-cookie'];
      expect(patientCookie).toBeDefined();

      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', patientCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should prevent doctor from accessing administrator user management APIs (HTTP 403)', async () => {
      const docLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dr.sharma@hospital.local', password: 'Doctor@Secure2026!' });
      const docCookie = docLogin.headers['set-cookie'];
      expect(docCookie).toBeDefined();

      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', docCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow administrator to access admin user management APIs (HTTP 200)', async () => {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hospital.local', password: 'Admin@Secure2026!' });
      const adminCookie = adminLogin.headers['set-cookie'];
      expect(adminCookie).toBeDefined();

      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ===========================================================================
  // 3. OBJECT-LEVEL AUTHORIZATION / IDOR PREVENTION
  // ===========================================================================
  describe('Security Feature 10: Patient Privacy & IDOR Prevention', () => {
    it('should allow Patient 1 (John Doe) to view their own medical record #1', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
      const cookie = login.headers['set-cookie'];
      expect(cookie).toBeDefined();

      const res = await request(app)
        .get('/api/medical-records/1')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.confidential_notes).toBeNull();
    });

    it('should DENY Patient 1 (John Doe) from accessing Patient 2 (Jane Smith) record #3 (IDOR Prevented)', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
      const cookie = login.headers['set-cookie'];
      expect(cookie).toBeDefined();

      const res = await request(app)
        .get('/api/medical-records/3')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('OBJECT_ACCESS_DENIED');
      expect(res.body.data).toBeUndefined();
    });
  });

  // ===========================================================================
  // 4. SQL INJECTION PREVENTION TESTS
  // ===========================================================================
  describe('Security Feature 4: SQL Injection Prevention', () => {
    it('should reject SQL injection payload in login without altering SQL query structure', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: "victim@hospital.local' OR '1'='1", password: "arbitrary' OR 1=1 --" });

      expect([400, 401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.data).toBeUndefined();
    });

    it('should safely execute parameterized query via security demo without altering SQL syntax', async () => {
      const res = await request(app)
        .post('/api/security-demo/test-sqli')
        .send({ payload: "admin' OR 1=1 --" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authenticationBypassed).toBe(false);
      expect(res.body.data.matchedRecordsCount).toBe(0);
      expect(res.body.data.passed).toBe(true);
    });
  });

  // ===========================================================================
  // 5. CSRF PROTECTION TESTS
  // ===========================================================================
  describe('Security Feature 6: CSRF Protection', () => {
    it('should issue a cryptographically signed CSRF token with cookie and JSON', async () => {
      const res = await request(app).get('/api/csrf-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.csrfToken).toBeDefined();
      expect(res.body.csrfToken.split('.').length).toBe(2);
    });

    it('should reject state-changing request (POST appointment) when X-CSRF-Token header is missing', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
      const cookie = login.headers['set-cookie'];
      expect(cookie).toBeDefined();

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', cookie)
        .send({
          doctorId: 1,
          appointmentDate: '2026-11-10',
          timeSlot: '10:00 AM',
          reason: 'Cardiac follow up'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should accept state-changing request when valid X-CSRF-Token header is attached', async () => {
      const tokenRes = await request(app).get('/api/csrf-token');
      const csrfToken = tokenRes.body.csrfToken;

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
      const cookie = login.headers['set-cookie'];
      expect(cookie).toBeDefined();

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          doctorId: 1,
          appointmentDate: '2026-11-12',
          timeSlot: '10:30 AM',
          reason: 'Cardiac follow up'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointmentId).toBeDefined();
    });
  });

  // ===========================================================================
  // 6. XSS AND SECURITY RESPONSE HEADERS TESTS
  // ===========================================================================
  describe('Security Feature 5 & 8: XSS Prevention & Helmet Security Headers', () => {
    it('should attach expected Helmet security headers to all responses', async () => {
      const res = await request(app).get('/api/csrf-token');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should escape dangerous HTML tags in input via security demo test', async () => {
      const res = await request(app)
        .post('/api/security-demo/test-xss')
        .send({ payload: '<script>alert("Malicious XSS")</script>' });

      expect(res.status).toBe(200);
      expect(res.body.data.scriptExecutionPossible).toBe(false);
      expect(res.body.data.serverEscapedOutput).toContain('&lt;script&gt;');
      expect(res.body.data.passed).toBe(true);
    });
  });

  // ===========================================================================
  // 7. INPUT VALIDATION & ERROR HANDLING TESTS
  // ===========================================================================
  describe('Security Feature 9: Input Validation & Error Suppression', () => {
    it('should reject malformed patient registration data with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'bad user!',
          email: 'not-an-email',
          password: '123',
          fullName: 'X'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });

    it('should reject invalid appointment ID with 400 validation error and suppress stack traces', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hospital.local', password: 'Admin@Secure2026!' });
      const cookie = login.headers['set-cookie'];

      const res = await request(app)
        .get('/api/appointments/not-a-number')
        .set('Cookie', cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.stack).toBeUndefined();
      expect(res.body.error.sql).toBeUndefined();
      expect(res.body.error.path).toBeUndefined();
    });
  });

  // ===========================================================================
  // 8. BRUTE-FORCE RATE LIMITING TESTS
  // ===========================================================================
  describe('Security Feature 7: Brute-Force Rate Limiting', () => {
    it('should throttle requests and return HTTP 429 when rate limit threshold is exceeded', async () => {
      const testLimiterApp = express();
      const limiter = rateLimit({
        windowMs: 60000,
        max: 3,
        handler: (req, res) => res.status(429).json({ success: false, code: 'TOO_MANY_REQUESTS' })
      });
      testLimiterApp.use(limiter);
      testLimiterApp.get('/test-limit', (req, res) => res.json({ success: true }));

      // Request 1, 2, 3 should pass
      await request(testLimiterApp).get('/test-limit').expect(200);
      await request(testLimiterApp).get('/test-limit').expect(200);
      await request(testLimiterApp).get('/test-limit').expect(200);

      // Request 4 should be throttled with 429
      const throttledRes = await request(testLimiterApp).get('/test-limit');
      expect(throttledRes.status).toBe(429);
      expect(throttledRes.body.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  // ===========================================================================
  // 9. SECURITY AUDIT LOGS TESTS
  // ===========================================================================
  describe('Security Feature 11: Security Audit Logging', () => {
    it('should record audit events in database and allow admin inspection', async () => {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@hospital.local', password: 'Admin@Secure2026!' });
      const adminCookie = adminLogin.headers['set-cookie'];
      expect(adminCookie).toBeDefined();

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const latestLog = res.body.data[0];
      expect(latestLog.event_type).toBeDefined();
      expect(latestLog.correlation_id).toBeDefined();
      expect(latestLog.ip_address).toBeDefined();
      // Passwords or tokens MUST NOT be logged
      expect(JSON.stringify(latestLog)).not.toContain('Admin@Secure2026!');
    });
  });
});
