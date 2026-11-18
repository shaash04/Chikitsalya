import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { loginSchema, registerPatientSchema, changePasswordSchema } from '../validators/index.js';
import { userRepository } from '../repositories/userRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { env } from '../config/env.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated, req, res);
      return res.json({
        success: true,
        message: 'Authentication successful.',
        data: result
      });
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email address or password provided.'
          }
        });
      }
      if (err.message === 'ACCOUNT_INACTIVE') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Your account has been deactivated. Please contact the administrator.'
          }
        });
      }
      if (err.message.startsWith('ACCOUNT_TEMPORARILY_LOCKED')) {
        const mins = err.message.split(':')[1];
        return res.status(429).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Too many failed login attempts. This account is locked for ${mins} minutes.`
          }
        });
      }
      next(err);
    }
  }

  async registerPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerPatientSchema.parse(req.body);
      const result = await authService.registerPatient(validated, req);
      return res.status(201).json({
        success: true,
        message: 'Patient registered successfully. You may now log in.',
        data: result
      });
    } catch (err: any) {
      if (err.message === 'EMAIL_EXISTS') {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' }
        });
      }
      if (err.message === 'USERNAME_EXISTS') {
        return res.status(409).json({
          success: false,
          error: { code: 'USERNAME_EXISTS', message: 'This username is already taken.' }
        });
      }
      if (err.message.startsWith('WEAK_PASSWORD:')) {
        const reason = err.message.replace('WEAK_PASSWORD:', '');
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: reason }
        });
      }
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req, res);
      return res.json({
        success: true,
        message: 'Logged out successfully. Session destroyed.'
      });
    } catch (err) {
      next(err);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.sessionUser) {
        return res.json({
          success: true,
          authenticated: false,
          user: null
        });
      }

      // Fetch fresh profile info
      const user = await userRepository.findById(req.sessionUser.userId);
      if (!user || Number(user.is_active) !== 1) {
        return res.json({
          success: true,
          authenticated: false,
          user: null
        });
      }

      let profileData: any = null;
      if (user.role === 'patient') {
        profileData = await patientRepository.findByUserId(user.id);
      } else if (user.role === 'doctor') {
        profileData = await doctorRepository.findByUserId(user.id);
      }

      return res.json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
          phone: user.phone,
          profile: profileData
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.sessionUser) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' }
        });
      }
      const validated = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.sessionUser.userId, validated.currentPassword, validated.newPassword, req);
      return res.json({
        success: true,
        message: 'Password updated successfully.'
      });
    } catch (err: any) {
      if (err.message === 'INVALID_CURRENT_PASSWORD') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password provided is incorrect.' }
        });
      }
      if (err.message.startsWith('WEAK_PASSWORD:')) {
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: err.message.replace('WEAK_PASSWORD:', '') }
        });
      }
      next(err);
    }
  }

  async devResetDemoAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      if (env.NODE_ENV === 'production') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found.' }
        });
      }

      // Reset in-memory rate limiter keys for loopback
      try {
        if (req.ip) loginRateLimiter.resetKey(req.ip);
        loginRateLimiter.resetKey('127.0.0.1');
        loginRateLimiter.resetKey('::1');
        loginRateLimiter.resetKey('::ffff:127.0.0.1');
      } catch (_) {}

      const result = await authService.resetDevDemoAccounts(req);
      return res.json({
        success: true,
        message: 'Development demo accounts (admin, doctors, patients) successfully restored to active status and all lockouts cleared.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
