import { sanitizeLogInput } from './security.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'csrf',
  'session',
  'secret',
  'authorization',
  'cookie'
]);

function maskSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }
  const masked: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      masked[key] = '[REDACTED_SENSITIVE]';
    } else if (typeof val === 'object' && val !== null) {
      masked[key] = maskSensitiveData(val);
    } else {
      masked[key] = val;
    }
  }
  return masked;
}

export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const cleanMsg = sanitizeLogInput(message);
    const cleanMeta = meta ? JSON.stringify(maskSensitiveData(meta)) : '';
    console.log(`[${timestamp}] [INFO] ${cleanMsg} ${cleanMeta}`);
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const cleanMsg = sanitizeLogInput(message);
    const cleanMeta = meta ? JSON.stringify(maskSensitiveData(meta)) : '';
    console.warn(`[${timestamp}] [WARN] ${cleanMsg} ${cleanMeta}`);
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const cleanMsg = sanitizeLogInput(message);
    const errInfo = error instanceof Error ? `${error.message}` : JSON.stringify(maskSensitiveData(error));
    console.error(`[${timestamp}] [ERROR] ${cleanMsg} - ${errInfo}`);
  },
  audit: (event: string, meta: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [AUDIT_EVENT] [${event}] ${JSON.stringify(maskSensitiveData(meta))}`);
  }
};
