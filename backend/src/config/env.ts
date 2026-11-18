import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from current directory or parent directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:4200'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('shms_db'),
  USE_IN_MEMORY_DB: z.string().default('auto'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters for secure hashing'),
  CSRF_SECRET: z.string().min(16, 'CSRF_SECRET must be at least 16 characters'),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(16, 'TWO_FACTOR_ENCRYPTION_KEY must be at least 16 characters').default('shms_2fa_aes256_encryption_master_key_2026!'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().default(10)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid application environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
