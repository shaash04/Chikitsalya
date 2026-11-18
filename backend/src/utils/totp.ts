import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env.js';

// Base32 alphabet for RFC 3548 / RFC 6238
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode raw buffer to Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode Base32 string to Buffer
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue; // skip invalid characters

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a cryptographically secure 20-byte Base32 secret for TOTP
 */
export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Derive 256-bit AES encryption key from configured master secret
 */
function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(env.TWO_FACTOR_ENCRYPTION_KEY).digest();
}

/**
 * Encrypt TOTP secret at rest using AES-256-GCM
 * Returns formatted string: "iv:authTag:encryptedData"
 */
export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt TOTP secret at rest using AES-256-GCM
 */
export function decryptTotpSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('INVALID_ENCRYPTED_SECRET_FORMAT');
  }

  const [ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generate 6-digit TOTP code for a specific counter step (RFC 6238)
 */
export function generateTotpCode(secret: string, timeStepCounter: number): string {
  const secretBytes = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStepCounter), 0);

  const hmac = crypto.createHmac('sha1', secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify TOTP code with time drift window tolerance (±1 step, i.e. ±30s)
 * Uses constant-time string comparison to prevent timing side channels
 */
export function verifyTotpCode(secret: string, token: string, windowSteps: number = 1): boolean {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(nowSec / 30);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const expected = generateTotpCode(secret, currentCounter + i);
    const tokenBuffer = Buffer.from(cleanToken, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (tokenBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
      return true;
    }
  }

  return false;
}

/**
 * Format otpauth URL for enrollment in Google/Microsoft Authenticator
 */
export function getTotpUri(email: string, secret: string, issuer: string = 'CHIKITSALYA'): string {
  const cleanEmail = encodeURIComponent(email);
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code data URI from otpauth URL
 */
export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
}

export interface StoredRecoveryCode {
  hash: string;
  used: boolean;
  usedAt: string | null;
}

/**
 * Generate 8 cryptographically secure single-use recovery codes (XXXX-XXXX format)
 * Returns both plaintext codes (to display once) and hashed objects (to store in DB)
 */
export function generateRecoveryCodes(count: number = 8): {
  plainCodes: string[];
  hashedCodes: StoredRecoveryCode[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: StoredRecoveryCode[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}`;

    const hash = crypto.createHash('sha256').update(code.replace(/[-\s]/g, '').toUpperCase()).digest('hex');

    plainCodes.push(code);
    hashedCodes.push({
      hash,
      used: false,
      usedAt: null
    });
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verify and consume a recovery code from the stored list.
 * If valid and unused, marks it as used and returns true with updated list.
 */
export function consumeRecoveryCode(
  inputCode: string,
  storedCodes: StoredRecoveryCode[]
): { valid: boolean; updatedCodes: StoredRecoveryCode[] } {
  if (!inputCode || typeof inputCode !== 'string') {
    return { valid: false, updatedCodes: storedCodes };
  }

  const cleanInput = inputCode.replace(/[-\s]/g, '').toUpperCase();
  const inputHash = crypto.createHash('sha256').update(cleanInput).digest('hex');

  let foundIndex = -1;
  for (let i = 0; i < storedCodes.length; i++) {
    const c = storedCodes[i];
    if (!c.used) {
      const hashBuf = Buffer.from(c.hash, 'hex');
      const inputBuf = Buffer.from(inputHash, 'hex');
      if (hashBuf.length === inputBuf.length && crypto.timingSafeEqual(hashBuf, inputBuf)) {
        foundIndex = i;
        break;
      }
    }
  }

  if (foundIndex === -1) {
    return { valid: false, updatedCodes: storedCodes };
  }

  // Clone and mark as used
  const updatedCodes = storedCodes.map((c, idx) => {
    if (idx === foundIndex) {
      return {
        ...c,
        used: true,
        usedAt: new Date().toISOString()
      };
    }
    return c;
  });

  return { valid: true, updatedCodes };
}
