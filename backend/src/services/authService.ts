import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/security.js';
import { createSession, destroySession, signTwoFactorPendingToken, verifyTwoFactorPendingToken } from '../middleware/sessionAuth.js';
import {
  generateTotpSecret,
  encryptTotpSecret,
  decryptTotpSecret,
  verifyTotpCode,
  getTotpUri,
  generateQrCodeDataUrl,
  generateRecoveryCodes,
  consumeRecoveryCode,
  StoredRecoveryCode
} from '../utils/totp.js';
import { SafeUser } from '../types/index.js';
import { Response, Request } from 'express';
import { env } from '../config/env.js';
import { db } from '../config/database.js';

const MAX_FAILED_ATTEMPTS = env.LOGIN_RATE_LIMIT_MAX || 10;
const LOCKOUT_MINUTES = 15;

function parseLockDate(dateStr: string): number {
  if (!dateStr) return 0;
  const isoStr = (dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')) + (dateStr.endsWith('Z') ? '' : 'Z');
  return new Date(isoStr).getTime();
}

export class AuthService {
  /**
   * Secure Login Implementation:
   * - Parameterized query retrieval
   * - Brute-force account lockout tracking
   * - Constant-time bcrypt verification
   * - Session regeneration
   * - Generic error messaging (anti-account enumeration)
   */
  async login(
    credentials: { email: string; password: string },
    req: Request,
    res: Response
  ): Promise<{ user: SafeUser; requires2FA?: boolean; tempToken?: string }> {
    const correlationId = req.correlationId || uuidv4();
    const ip = req.ip || '127.0.0.1';
    const email = credentials.email.toLowerCase().trim();

    const user = await userRepository.findByEmail(email);

    // If user not found, perform dummy bcrypt compare to prevent timing side-channel attacks
    if (!user) {
      await verifyPassword(credentials.password, '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345');
      await auditLogRepository.record({
        actorUserId: null,
        actorUsername: email,
        actorRole: 'GUEST',
        eventType: 'AUTH_LOGIN_FAILURE',
        resourceType: 'USER',
        resourceId: null,
        outcome: 'FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { reason: 'User not found or credentials mismatch' }
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check account active status
    if (Number(user.is_active) !== 1) {
      await auditLogRepository.record({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        eventType: 'AUTH_LOGIN_LOCKED',
        resourceType: 'USER',
        resourceId: String(user.id),
        outcome: 'DENIED',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { reason: 'Account deactivated by administrator' }
      });
      throw new Error('ACCOUNT_INACTIVE');
    }

    // Check account lockout
    if (user.locked_until) {
      const lockTime = parseLockDate(String(user.locked_until));
      if (lockTime > Date.now()) {
        const remainingMinutes = Math.ceil((lockTime - Date.now()) / 60000);
        await auditLogRepository.record({
          actorUserId: user.id,
          actorUsername: user.username,
          actorRole: user.role,
          eventType: 'AUTH_LOGIN_THROTTLED',
          resourceType: 'USER',
          resourceId: String(user.id),
          outcome: 'DENIED',
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
          correlationId,
          metadata: { lockoutMinutesRemaining: remainingMinutes }
        });
        throw new Error(`ACCOUNT_TEMPORARILY_LOCKED:${remainingMinutes}`);
      } else {
        // Lockout expired: reset failed attempts counter automatically
        await userRepository.resetFailedAttempts(user.id);
        user.failed_login_attempts = 0;
        user.locked_until = null;
      }
    }

    // Verify bcrypt password hash
    const passwordValid = await verifyPassword(credentials.password, user.password_hash);

    if (!passwordValid) {
      const newFailedCount = (user.failed_login_attempts || 0) + 1;
      let lockUntil: string | null = null;

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        const lockDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        lockUntil = lockDate.toISOString();
      }

      await userRepository.recordFailedAttempt(user.id, newFailedCount, lockUntil);

      await auditLogRepository.record({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        eventType: 'AUTH_LOGIN_FAILURE',
        resourceType: 'USER',
        resourceId: String(user.id),
        outcome: 'FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { attemptCount: newFailedCount, locked: !!lockUntil }
      });

      throw new Error('INVALID_CREDENTIALS');
    }

    // Login successful: reset failed attempts
    await userRepository.resetFailedAttempts(user.id);

    // If 2FA is enabled for this account, issue temporary pending token and do NOT issue session cookie yet
    if (Number(user.two_factor_enabled) === 1) {
      const tempToken = signTwoFactorPendingToken(user.id, user.email);
      await auditLogRepository.record({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        eventType: 'AUTH_2FA_CHALLENGE',
        resourceType: 'USER',
        resourceId: String(user.id),
        outcome: 'SUCCESS',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { message: 'Primary credentials verified. Awaiting 2FA verification.' }
      });

      const safeUser: SafeUser = {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        fullName: user.full_name,
        phone: user.phone,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      return { user: safeUser, requires2FA: true, tempToken };
    }

    // Regenerate session identifier
    await createSession(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      req
    );

    await auditLogRepository.record({
      actorUserId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'USER',
      resourceId: String(user.id),
      outcome: 'SUCCESS',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      correlationId,
      metadata: { role: user.role }
    });

    const safeUser: SafeUser = {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      fullName: user.full_name,
      phone: user.phone,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return { user: safeUser };
  }

  /**
   * Patient Self-Registration:
   * Doctors & Admins CANNOT self-register (restricted admin provisioning only)
   */
  async registerPatient(data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    phone?: string | null;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    bloodGroup: string;
    emergencyContact: string;
    address: string;
    allergies?: string | null;
    medicalHistory?: string | null;
  }, req: Request): Promise<{ userId: number; patientCode: string }> {
    const correlationId = req.correlationId || uuidv4();
    const ip = req.ip || '127.0.0.1';

    // Validate password complexity
    const strength = validatePasswordStrength(data.password);
    if (!strength.valid) {
      throw new Error(`WEAK_PASSWORD:${strength.reason}`);
    }

    // Check unique username and email
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('EMAIL_EXISTS');
    }

    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new Error('USERNAME_EXISTS');
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(data.password);

    // Create user with strict 'patient' role
    const userUuid = uuidv4();
    const userId = await userRepository.create({
      uuid: userUuid,
      username: data.username,
      email: data.email,
      passwordHash,
      role: 'patient',
      fullName: data.fullName,
      phone: data.phone
    });

    // Create associated patient profile
    const patientCode = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
    await patientRepository.create({
      userId,
      patientCode,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      emergencyContact: data.emergencyContact,
      address: data.address,
      allergies: data.allergies,
      medicalHistory: data.medicalHistory
    });

    await auditLogRepository.record({
      actorUserId: userId,
      actorUsername: data.username,
      actorRole: 'patient',
      eventType: 'AUTH_PATIENT_REGISTER',
      resourceType: 'PATIENT',
      resourceId: String(userId),
      outcome: 'SUCCESS',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      correlationId,
      metadata: { patientCode }
    });

    return { userId, patientCode };
  }

  /**
   * Secure Logout:
   * Destroys server-side session and clears cookie
   */
  async logout(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId || uuidv4();
    const ip = req.ip || '127.0.0.1';

    if (req.sessionId) {
      await destroySession(req.sessionId, res);
    }

    if (req.sessionUser) {
      await auditLogRepository.record({
        actorUserId: req.sessionUser.userId,
        actorUsername: req.sessionUser.username,
        actorRole: req.sessionUser.role,
        eventType: 'AUTH_LOGOUT',
        resourceType: 'SESSION',
        resourceId: req.sessionId,
        outcome: 'SUCCESS',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { message: 'Session invalidated.' }
      });
    }
  }

  /**
   * Password Change with validation
   */
  async changePassword(userId: number, currentPass: string, newPass: string, req: Request): Promise<void> {
    const correlationId = req.correlationId || uuidv4();
    const ip = req.ip || '127.0.0.1';

    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const valid = await verifyPassword(currentPass, user.password_hash);
    if (!valid) {
      await auditLogRepository.record({
        actorUserId: userId,
        actorUsername: user.username,
        actorRole: user.role,
        eventType: 'AUTH_PASSWORD_CHANGE_FAILURE',
        resourceType: 'USER',
        resourceId: String(userId),
        outcome: 'FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { reason: 'Incorrect current password' }
      });
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    const strength = validatePasswordStrength(newPass);
    if (!strength.valid) {
      throw new Error(`WEAK_PASSWORD:${strength.reason}`);
    }

    const newHash = await hashPassword(newPass);
    await userRepository.updatePassword(userId, newHash);

    await auditLogRepository.record({
      actorUserId: userId,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'AUTH_PASSWORD_CHANGE_SUCCESS',
      resourceType: 'USER',
      resourceId: String(userId),
      outcome: 'SUCCESS',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      correlationId,
      metadata: { message: 'Password updated and hash refreshed.' }
    });
  }

  /**
   * Development-only method to restore demo accounts to active status and clear lockouts
   * Strictly guarded against production execution
   */
  async resetDevDemoAccounts(req: Request): Promise<{ resetCount: number; accounts: string[] }> {
    if (env.NODE_ENV === 'production') {
      throw new Error('DEV_ENDPOINT_FORBIDDEN_IN_PRODUCTION');
    }

    const demoEmails = [
      'admin@hospital.local',
      'dr.sharma@hospital.local',
      'dr.patel@hospital.local',
      'john.doe@patient.local',
      'jane.smith@patient.local'
    ];

    await db.execute(
      'UPDATE users SET is_active = 1, failed_login_attempts = 0, locked_until = NULL WHERE email IN (?, ?, ?, ?, ?)',
      demoEmails
    );

    for (const email of demoEmails) {
      const user = await userRepository.findByEmail(email);
      if (user) {
        await userRepository.setActiveStatus(user.id, 1);
        await userRepository.resetFailedAttempts(user.id);
      }
    }

    await auditLogRepository.record({
      actorUserId: null,
      actorUsername: 'DEV_SYSTEM',
      actorRole: 'SYSTEM',
      eventType: 'DEV_DEMO_ACCOUNTS_RESET',
      resourceType: 'USER',
      resourceId: 'ALL_DEMO',
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { reason: 'Development reset of demo accounts' }
    });

    return {
      resetCount: demoEmails.length,
      accounts: demoEmails
    };
  }

  /**
   * Verify TOTP code or recovery code for a pending 2FA login
   */
  async loginVerify2FA(
    data: { tempToken: string; code: string; isRecoveryCode?: boolean },
    req: Request,
    res: Response
  ): Promise<{ user: SafeUser }> {
    const tokenData = verifyTwoFactorPendingToken(data.tempToken);
    if (!tokenData) {
      throw new Error('INVALID_OR_EXPIRED_2FA_TOKEN');
    }

    const user = await userRepository.findById(tokenData.userId);
    if (!user || Number(user.is_active) !== 1) {
      throw new Error('ACCOUNT_INACTIVE');
    }

    const correlationId = req.correlationId || uuidv4();
    const ip = req.ip || '127.0.0.1';

    if (data.isRecoveryCode) {
      // Recovery code path
      const storedCodes: StoredRecoveryCode[] = user.recovery_codes ? JSON.parse(user.recovery_codes) : [];
      const result = consumeRecoveryCode(data.code, storedCodes);

      if (!result.valid) {
        await auditLogRepository.record({
          actorUserId: user.id,
          actorUsername: user.username,
          actorRole: user.role,
          eventType: 'AUTH_2FA_RECOVERY_FAILURE',
          resourceType: 'USER',
          resourceId: String(user.id),
          outcome: 'FAILURE',
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
          correlationId,
          metadata: { reason: 'Invalid or already consumed recovery code' }
        });
        throw new Error('INVALID_RECOVERY_CODE');
      }

      // Update remaining recovery codes atomically in DB
      await userRepository.updateRecoveryCodes(user.id, JSON.stringify(result.updatedCodes));

      await auditLogRepository.record({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        eventType: 'AUTH_2FA_RECOVERY_SUCCESS',
        resourceType: 'USER',
        resourceId: String(user.id),
        outcome: 'SUCCESS',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { message: 'Authenticated via single-use backup recovery code' }
      });
    } else {
      // Standard TOTP verification path
      if (!user.two_factor_secret) {
        throw new Error('2FA_NOT_CONFIGURED');
      }

      let plainSecret: string;
      try {
        plainSecret = decryptTotpSecret(user.two_factor_secret);
      } catch {
        throw new Error('2FA_SECRET_DECRYPT_FAILED');
      }

      const isValid = verifyTotpCode(plainSecret, data.code);
      if (!isValid) {
        await auditLogRepository.record({
          actorUserId: user.id,
          actorUsername: user.username,
          actorRole: user.role,
          eventType: 'AUTH_2FA_FAILURE',
          resourceType: 'USER',
          resourceId: String(user.id),
          outcome: 'FAILURE',
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
          correlationId,
          metadata: { reason: 'Invalid 6-digit TOTP code' }
        });
        throw new Error('INVALID_2FA_CODE');
      }

      await auditLogRepository.record({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        eventType: 'AUTH_2FA_SUCCESS',
        resourceType: 'USER',
        resourceId: String(user.id),
        outcome: 'SUCCESS',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        correlationId,
        metadata: { message: 'TOTP authentication verified successfully' }
      });
    }

    // Now establish full session
    await createSession(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      req
    );

    const safeUser: SafeUser = {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      fullName: user.full_name,
      phone: user.phone,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return { user: safeUser };
  }

  /**
   * Initiate 2FA enrollment: returns secret, recovery codes, and QR code Data URL
   */
  async setup2FA(userId: number, req: Request): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    recoveryCodes: string[];
    hashedRecoveryCodes: StoredRecoveryCode[];
  }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const secret = generateTotpSecret();
    const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
    const otpauthUrl = getTotpUri(user.email, secret, 'CHIKITSALYA');
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      recoveryCodes: plainCodes,
      hashedRecoveryCodes: hashedCodes
    };
  }

  /**
   * Complete 2FA enrollment by verifying the initial code
   */
  async enable2FA(
    userId: number,
    secret: string,
    code: string,
    recoveryCodes: StoredRecoveryCode[],
    req: Request
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      throw new Error('INVALID_2FA_CODE');
    }

    const encryptedSecret = encryptTotpSecret(secret);
    await userRepository.enableTwoFactor(userId, encryptedSecret, JSON.stringify(recoveryCodes));

    await auditLogRepository.record({
      actorUserId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'AUTH_2FA_ENABLED',
      resourceType: 'USER',
      resourceId: String(user.id),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { message: 'Two-factor authentication successfully enabled' }
    });
  }

  /**
   * Disable 2FA after password and OTP/recovery verification
   */
  async disable2FA(userId: number, password: string, code: string, req: Request): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      throw new Error('INVALID_PASSWORD');
    }

    // Verify code before disabling
    let codeValid = false;
    if (user.two_factor_secret) {
      try {
        const plainSecret = decryptTotpSecret(user.two_factor_secret);
        codeValid = verifyTotpCode(plainSecret, code);
      } catch {}
    }

    if (!codeValid && user.recovery_codes) {
      const stored: StoredRecoveryCode[] = JSON.parse(user.recovery_codes);
      const res = consumeRecoveryCode(code, stored);
      codeValid = res.valid;
    }

    if (!codeValid) {
      throw new Error('INVALID_2FA_CODE');
    }

    await userRepository.disableTwoFactor(userId);

    await auditLogRepository.record({
      actorUserId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      eventType: 'AUTH_2FA_DISABLED',
      resourceType: 'USER',
      resourceId: String(user.id),
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId || uuidv4(),
      metadata: { message: 'Two-factor authentication disabled by user' }
    });
  }

  /**
   * Check 2FA status for user
   */
  async get2FAStatus(userId: number): Promise<{ enabled: boolean; hasRecoveryCodes: boolean }> {
    const user = await userRepository.findById(userId);
    return {
      enabled: Number(user?.two_factor_enabled) === 1,
      hasRecoveryCodes: Boolean(user?.recovery_codes && user.recovery_codes.length > 5)
    };
  }
}

export const authService = new AuthService();
