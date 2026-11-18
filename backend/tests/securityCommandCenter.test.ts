import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initializeDatabase } from '../src/config/database.js';

describe('Feature 1: Security Command Center & Threat Analytics Test Suite', () => {
  let app: any;
  let adminCookie: string[];
  let doctorCookie: string[];
  let patientCookie: string[];

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

  describe('1. Role-Based Access Control (RBAC) Enforcement', () => {
    it('should reject unauthenticated request to /api/admin/security/overview with 401', async () => {
      const res = await request(app).get('/api/admin/security/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject patient access to /api/admin/security/overview with 403', async () => {
      const res = await request(app)
        .get('/api/admin/security/overview')
        .set('Cookie', patientCookie);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject doctor access to /api/admin/security/overview with 403', async () => {
      const res = await request(app)
        .get('/api/admin/security/overview')
        .set('Cookie', doctorCookie);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should grant administrator access to /api/admin/security/overview with 200', async () => {
      const res = await request(app)
        .get('/api/admin/security/overview')
        .set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('2. Security Overview Metrics Integrity', () => {
    it('should return real aggregated KPI metrics from audit logs and session store', async () => {
      const res = await request(app)
        .get('/api/admin/security/overview')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const metrics = res.body.data;

      expect(typeof metrics.totalRequestsAnalyzed).toBe('number');
      expect(metrics.totalRequestsAnalyzed).toBeGreaterThan(0);

      expect(typeof metrics.suspiciousRequestsDetected).toBe('number');
      expect(typeof metrics.blockedAttacks).toBe('number');
      expect(typeof metrics.failedLoginAttempts).toBe('number');
      expect(typeof metrics.activeUserSessions).toBe('number');
      expect(metrics.activeUserSessions).toBeGreaterThanOrEqual(1);

      expect(typeof metrics.criticalSecurityAlerts).toBe('number');
      expect(['OPTIMAL', 'ELEVATED', 'CRITICAL']).toContain(metrics.systemStatus);
    });
  });

  describe('3. Threat Analytics Calculations', () => {
    it('should return timeline, category distribution, severity breakdown, and login stats', async () => {
      const res = await request(app)
        .get('/api/admin/security/analytics')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const analytics = res.body.data;

      // Timeline verification
      expect(Array.isArray(analytics.timeline)).toBe(true);
      expect(analytics.timeline.length).toBe(6);
      analytics.timeline.forEach((pt: any) => {
        expect(pt.timeLabel).toBeDefined();
        expect(typeof pt.totalEvents).toBe('number');
        expect(typeof pt.blockedAttacks).toBe('number');
      });

      // Category breakdown
      expect(Array.isArray(analytics.categories)).toBe(true);
      expect(analytics.categories.length).toBeGreaterThan(0);
      analytics.categories.forEach((cat: any) => {
        expect(cat.category).toBeDefined();
        expect(cat.label).toBeDefined();
        expect(typeof cat.count).toBe('number');
        expect(typeof cat.percentage).toBe('number');
      });

      // Severities
      expect(Array.isArray(analytics.severities)).toBe(true);
      expect(analytics.severities.length).toBe(4); // LOW, MEDIUM, HIGH, CRITICAL

      // Login statistics
      expect(analytics.loginStats).toBeDefined();
      expect(typeof analytics.loginStats.totalAttempts).toBe('number');
      expect(typeof analytics.loginStats.successfulLogins).toBe('number');
      expect(typeof analytics.loginStats.failedLogins).toBe('number');
      expect(typeof analytics.loginStats.failureRatePercentage).toBe('number');
    });
  });

  describe('4. Live Security Event Monitor & Filtering', () => {
    it('should return list of events with classified severity and action taken', async () => {
      const res = await request(app)
        .get('/api/admin/security/events')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const firstEvent = res.body.data[0];
      expect(firstEvent.id).toBeDefined();
      expect(firstEvent.timestamp).toBeDefined();
      expect(firstEvent.eventType).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(firstEvent.severity);
      expect(['ALLOWED', 'BLOCKED', 'REJECTED']).toContain(firstEvent.actionTaken);
      expect(firstEvent.details).toBeDefined();
    });

    it('should accurately filter security events by severity', async () => {
      const res = await request(app)
        .get('/api/admin/security/events?severity=CRITICAL')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      res.body.data.forEach((evt: any) => {
        expect(evt.severity).toBe('CRITICAL');
      });
    });

    it('should accurately filter security events by category', async () => {
      const res = await request(app)
        .get('/api/admin/security/events?category=ACCESS_CONTROL')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      res.body.data.forEach((evt: any) => {
        expect(evt.category).toBe('ACCESS_CONTROL');
      });
    });

    it('should search events by keyword (username, IP, or event type)', async () => {
      const res = await request(app)
        .get('/api/admin/security/events?search=johndoe')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      res.body.data.forEach((evt: any) => {
        const matches =
          evt.actorUsername.toLowerCase().includes('johndoe') ||
          evt.eventType.toLowerCase().includes('johndoe') ||
          evt.details.toLowerCase().includes('johndoe');
        expect(matches).toBe(true);
      });
    });
  });

  describe('5. Actionable Security Alerts', () => {
    it('should generate prioritized security alerts with actionable recommendations', async () => {
      const res = await request(app)
        .get('/api/admin/security/alerts')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const alert = res.body.data[0];
        expect(alert.id).toBeDefined();
        expect(alert.title).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.description).toBeDefined();
        expect(alert.recommendation).toBeDefined();
      }
    });
  });
});
