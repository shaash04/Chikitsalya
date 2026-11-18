import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash password securely with bcrypt and salt work factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify plaintext password against stored bcrypt hash using constant-time comparison
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Password complexity validation:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

/**
 * Generate a cryptographically strong, random session identifier (256-bit entropy)
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a Double-Submit HMAC CSRF token
 * Token structure: <randomBytes>.<hmacSignature>
 */
export function generateCsrfToken(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const hmac = crypto.createHmac('sha256', env.CSRF_SECRET).update(nonce).digest('hex');
  return `${nonce}.${hmac}`;
}

/**
 * Verify Double-Submit HMAC CSRF token validity using timing-safe comparison
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [nonce, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', env.CSRF_SECRET).update(nonce).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Sanitize string for log output to prevent Log Injection (CRLF attacks)
 */
export function sanitizeLogInput(input: any): string {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  return str.replace(/[\r\n\t]/g, ' ').slice(0, 500);
}

/**
 * Escape HTML special characters for defensive output encoding
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
