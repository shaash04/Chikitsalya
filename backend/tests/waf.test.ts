import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initializeDatabase } from '../src/config/database.js';

describe('Feature 4: Web Application Firewall (WAF) Simulator Test Suite', () => {
  let app: any;
  let adminCookie: string[];
  let doctorCookie: string[];
  let patientCookie: string[];
  let csrfToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_IN_MEMORY_DB = 'true';
    await initializeDatabase();
    app = createApp();

    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hospital.local', password: 'Admin@Secure2026!' });
    adminCookie = adminRes.headers['set-cookie'];

    const csrfRes = await request(app).get('/api/csrf-token').set('Cookie', adminCookie);
    csrfToken = csrfRes.body.csrfToken;

    // Login Doctor
    const docRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.sharma@hospital.local', password: 'Doctor@Secure2026!' });
    doctorCookie = docRes.headers['set-cookie'];

    // Login Patient
    const patRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
    patientCookie = patRes.headers['set-cookie'];
  });

  describe('1. WAF Attack Pattern Detection & Blocking (HTTP 403)', () => {
    it('should detect and block classic SQL injection payload in query params', async () => {
      const res = await request(app)
        .get("/api/doctors?specialization=' OR '1'='1")
        .set('Cookie', doctorCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WAF_REQUEST_BLOCKED');
      expect(res.body.error.waf.ruleId).toBe('WAF-SQLI-001');
      expect(res.body.error.waf.category).toBe('SQLI');
    });

    it('should detect and block UNION SELECT SQL injection in POST body', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          doctorId: 1,
          appointmentDate: '2026-11-20',
          timeSlot: '10:00 AM',
          reason: "Checkup' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12 --"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WAF_REQUEST_BLOCKED');
      expect(res.body.error.waf.category).toBe('SQLI');
    });

    it('should detect and block Cross-Site Scripting (XSS) script tag payload', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          doctorId: 1,
          appointmentDate: '2026-11-20',
          timeSlot: '10:00 AM',
          reason: "<script>alert('Malicious XSS')</script>"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WAF_REQUEST_BLOCKED');
      expect(res.body.error.waf.ruleId).toBe('WAF-XSS-002');
      expect(res.body.error.waf.category).toBe('XSS');
    });

    it('should detect and block XSS img onerror payload', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          doctorId: 1,
          appointmentDate: '2026-11-20',
          timeSlot: '10:00 AM',
          reason: "<img src=x onerror=alert(document.cookie)>"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WAF_REQUEST_BLOCKED');
    });

    it('should detect and block path traversal directory climbing pattern', async () => {
      const res = await request(app)
        .get('/api/medical-records/..%2f..%2fetc%2fpasswd')
        .set('Cookie', doctorCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WAF_REQUEST_BLOCKED');
      expect(res.body.error.waf.category).toBe('PATH_TRAVERSAL');
    });
  });

  describe('2. WAF False-Positive Prevention (Normal Hospital Clinical Payloads)', () => {
    it('should NOT block legitimate medical notes containing numbers, slashes, punctuation, or doses', async () => {
      const res = await request(app)
        .post('/api/security-demo/test-waf')
        .send({
          payload: 'Patient vitals BP 120/80 mmHg, pulse 72 bpm. Prescribed Amlodipine 5mg orally once daily. Blood group: O+.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.blocked).toBe(false);
      expect(res.body.data.detected).toBe(false);
    });

    it('should NOT block legitimate clinical text containing quotes or contractions', async () => {
      const res = await request(app)
        .post('/api/security-demo/test-waf')
        .send({
          payload: "Patient didn't complain of nausea or dizziness; follow-up in 2 weeks."
        });

      expect(res.status).toBe(200);
      expect(res.body.data.blocked).toBe(false);
      expect(res.body.data.detected).toBe(false);
    });
  });

  describe('3. WAF Rule Management & Access Control', () => {
    it('should reject unauthenticated request to /api/admin/waf/overview with 401', async () => {
      const res = await request(app).get('/api/admin/waf/overview');
      expect(res.status).toBe(401);
    });

    it('should reject doctor and patient access to WAF management with 403', async () => {
      const docRes = await request(app)
        .get('/api/admin/waf/overview')
        .set('Cookie', doctorCookie);
      expect(docRes.status).toBe(403);

      const patRes = await request(app)
        .get('/api/admin/waf/overview')
        .set('Cookie', patientCookie);
      expect(patRes.status).toBe(403);
    });

    it('should permit administrator to view WAF overview and rules', async () => {
      const res = await request(app)
        .get('/api/admin/waf/overview')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalInspectedRequests).toBe('number');
      expect(Array.isArray(res.body.data.rules)).toBe(true);
      expect(res.body.data.rules.length).toBeGreaterThanOrEqual(5);
    });

    it('should allow administrator to toggle rule configuration (e.g. DETECT_ONLY mode)', async () => {
      const updateRes = await request(app)
        .put('/api/admin/waf/rules/WAF-PATH-003')
        .set('Cookie', adminCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ mode: 'DETECT_ONLY' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.mode).toBe('DETECT_ONLY');

      // Restore to BLOCK mode
      const restoreRes = await request(app)
        .put('/api/admin/waf/rules/WAF-PATH-003')
        .set('Cookie', adminCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ mode: 'BLOCK' });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.mode).toBe('BLOCK');
    });
  });

  describe('4. Controlled Attack Simulation Endpoint', () => {
    it('should evaluate simulated SQL injection payloads without affecting live routes', async () => {
      const res = await request(app)
        .post('/api/security-demo/test-waf')
        .send({
          payload: "admin' OR 1=1 --",
          category: 'SQLI'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inspected).toBe(true);
      expect(res.body.data.blocked).toBe(true);
      expect(res.body.data.ruleMatched.id).toBe('WAF-SQLI-001');
      expect(res.body.data.defenseExplanation).toBeDefined();
    });
  });
});
