import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initializeDatabase } from '../src/config/database.js';
import { generateTotpCode } from '../src/utils/totp.js';

describe('Feature 2 & 3: Two-Factor Authentication (2FA) and Active Session Management Suite', () => {
  let app: any;
  let adminCookie: string[];
  let csrfToken: string;
  let patientCookie: string[];
  let patientCsrfToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_IN_MEMORY_DB = 'true';
    await initializeDatabase();
    app = createApp();

    // Fetch initial CSRF token
    const csrfRes = await request(app).get('/api/csrf-token');
    csrfToken = csrfRes.body.csrfToken;

    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hospital.local', password: 'Admin@Secure2026!' });
    adminCookie = adminRes.headers['set-cookie'];

    // Login Patient
    const patRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
    patientCookie = patRes.headers['set-cookie'];

    const patCsrfRes = await request(app)
      .get('/api/csrf-token')
      .set('Cookie', patientCookie);
    patientCsrfToken = patCsrfRes.body.csrfToken;
  });

  describe('Two-Factor Authentication (2FA) Security Tests', () => {
    let generatedSecret: string;
    let recoveryCodes: string[];
    let hashedRecoveryCodes: any[];

    it('should reject unauthenticated 2FA setup request with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('X-CSRF-Token', csrfToken);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow authenticated user to initiate 2FA setup and return secret, QR code & recovery codes', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Cookie', patientCookie)
        .set('X-CSRF-Token', patientCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(Array.isArray(res.body.data.recoveryCodes)).toBe(true);
      expect(res.body.data.recoveryCodes.length).toBe(8);

      generatedSecret = res.body.data.secret;
      recoveryCodes = res.body.data.recoveryCodes;
      hashedRecoveryCodes = res.body.data.hashedRecoveryCodes;
    });

    it('should reject 2FA activation with invalid 6-digit OTP code', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Cookie', patientCookie)
        .set('X-CSRF-Token', patientCsrfToken)
        .send({
          secret: generatedSecret,
          code: '000000',
          recoveryCodes: hashedRecoveryCodes
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_2FA_CODE');
    });

    it('should successfully enable 2FA with valid 6-digit TOTP code', async () => {
      const currentCounter = Math.floor(Date.now() / 1000 / 30);
      const validCode = generateTotpCode(generatedSecret, currentCounter);

      const res = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Cookie', patientCookie)
        .set('X-CSRF-Token', patientCsrfToken)
        .send({
          secret: generatedSecret,
          code: validCode,
          recoveryCodes: hashedRecoveryCodes
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify status is enabled
      const statusRes = await request(app)
        .get('/api/auth/2fa/status')
        .set('Cookie', patientCookie);
      expect(statusRes.body.data.enabled).toBe(true);
      expect(statusRes.body.data.hasRecoveryCodes).toBe(true);
    });

    it('should challenge user for 2FA on login and not issue full session cookie immediately', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });

      expect(res.status).toBe(200);
      expect(res.body.data.requires2FA).toBe(true);
      expect(res.body.data.tempToken).toBeDefined();

      // Ensure full session cookie was NOT issued
      const cookies = res.headers['set-cookie'];
      const sessionCookie = cookies ? cookies.find((c: string) => c.startsWith('shms_session=')) : null;
      expect(sessionCookie).toBeFalsy();
    });

    it('should reject invalid TOTP verification during login', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });

      const tempToken = loginRes.body.data.tempToken;

      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken, code: '999999' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_2FA_CODE');
    });

    it('should successfully complete 2FA login with valid TOTP code and issue session cookie', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });

      const tempToken = loginRes.body.data.tempToken;
      const currentCounter = Math.floor(Date.now() / 1000 / 30);
      const validCode = generateTotpCode(generatedSecret, currentCounter);

      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken, code: validCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john.doe@patient.local');

      // HttpOnly session cookie must now be present
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c: string) => c.startsWith('shms_session='));
      expect(sessionCookie).toBeDefined();
    });

    it('should permit login via single-use backup recovery code and reject reuse of same code', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });

      const tempToken = loginRes.body.data.tempToken;
      const singleUseCode = recoveryCodes[0];

      // 1. First use should succeed
      const res1 = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken, code: singleUseCode, isRecoveryCode: true });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      // 2. Second attempt with the SAME recovery code must be rejected
      const loginRes2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });
      const tempToken2 = loginRes2.body.data.tempToken;

      const res2 = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: tempToken2, code: singleUseCode, isRecoveryCode: true });

      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe('INVALID_RECOVERY_CODE');
    });

    it('should disable 2FA only when valid password and TOTP code are provided', async () => {
      // Login to get fresh session
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@patient.local', password: 'Patient@Secure2026!' });

      const currentCounter = Math.floor(Date.now() / 1000 / 30);
      const validCode = generateTotpCode(generatedSecret, currentCounter);

      const verifyRes = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: loginRes.body.data.tempToken, code: validCode });

      const activeCookie = verifyRes.headers['set-cookie'];
      const csrf = (await request(app).get('/api/csrf-token').set('Cookie', activeCookie)).body.csrfToken;

      // Disable 2FA
      const disableRes = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Cookie', activeCookie)
        .set('X-CSRF-Token', csrf)
        .send({
          password: 'Patient@Secure2026!',
          code: generateTotpCode(generatedSecret, Math.floor(Date.now() / 1000 / 30))
        });

      expect(disableRes.status).toBe(200);
      expect(disableRes.body.success).toBe(true);

      // Verify status is now disabled
      const statusRes = await request(app)
        .get('/api/auth/2fa/status')
        .set('Cookie', activeCookie);
      expect(statusRes.body.data.enabled).toBe(false);
    });
  });

  describe('Active Session & Device Management Security Tests', () => {
    let sessionCookie1: string[];
    let sessionCookie2: string[];
    let session1Id: string;
    let session2Id: string;

    beforeAll(async () => {
      // Create session 1 (simulate Chrome on Windows)
      const res1 = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36')
        .send({ email: 'dr.patel@hospital.local', password: 'Doctor@Secure2026!' });
      sessionCookie1 = res1.headers['set-cookie'];

      // Create session 2 (simulate Safari on iPhone)
      const res2 = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1')
        .send({ email: 'dr.patel@hospital.local', password: 'Doctor@Secure2026!' });
      sessionCookie2 = res2.headers['set-cookie'];
    });

    it('should list all active sessions with parsed device, OS, IP, and current session badge', async () => {
      const res = await request(app)
        .get('/api/auth/sessions')
        .set('Cookie', sessionCookie1);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const current = res.body.data.find((s: any) => s.isCurrent === true);
      expect(current).toBeDefined();
      expect(current.deviceInfo).toBeDefined();
      expect(current.createdAt).toBeDefined();

      session1Id = current.sessionId;
      const other = res.body.data.find((s: any) => s.isCurrent === false);
      expect(other).toBeDefined();
      session2Id = other.sessionId;
    });

    it('should allow user to revoke an individual specific session', async () => {
      const csrf = (await request(app).get('/api/csrf-token').set('Cookie', sessionCookie1)).body.csrfToken;

      const res = await request(app)
        .delete(`/api/auth/sessions/${session2Id}`)
        .set('Cookie', sessionCookie1)
        .set('X-CSRF-Token', csrf);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject API requests made using the revoked session (stale session invalidation)', async () => {
      const res = await request(app)
        .get('/api/auth/session')
        .set('Cookie', sessionCookie2);

      // Session revoked on server registry => authenticated must be false
      expect(res.body.authenticated).toBe(false);
      expect(res.body.user).toBeNull();
    });

    it('should allow user to revoke all other sessions in a single operation', async () => {
      // Create session 3
      const res3 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dr.patel@hospital.local', password: 'Doctor@Secure2026!' });
      const sessionCookie3 = res3.headers['set-cookie'];

      const csrf = (await request(app).get('/api/csrf-token').set('Cookie', sessionCookie1)).body.csrfToken;

      const revokeAllRes = await request(app)
        .post('/api/auth/sessions/revoke-others')
        .set('Cookie', sessionCookie1)
        .set('X-CSRF-Token', csrf);

      expect(revokeAllRes.status).toBe(200);
      expect(revokeAllRes.body.success).toBe(true);

      // Verify session 3 is now invalidated
      const checkRes = await request(app)
        .get('/api/auth/session')
        .set('Cookie', sessionCookie3);
      expect(checkRes.body.authenticated).toBe(false);

      // Verify current session 1 is still valid
      const currentCheck = await request(app)
        .get('/api/auth/session')
        .set('Cookie', sessionCookie1);
      expect(currentCheck.body.authenticated).toBe(true);
    });
  });
});
