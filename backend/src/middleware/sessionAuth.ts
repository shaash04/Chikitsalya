import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { db } from '../config/database.js';
import { SessionData, UserRole } from '../types/index.js';
import { generateSessionId } from '../utils/security.js';

export const SESSION_COOKIE_NAME = 'shms_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      sessionUser?: SessionData;
      correlationId?: string;
    }
  }
}

// In-memory active session cache for sub-millisecond lookup
const activeSessions = new Map<string, SessionData>();

/**
 * Sign session ID with HMAC to prevent cookie tampering
 */
export function signSessionId(sessionId: string): string {
  const hmac = crypto.createHmac('sha256', env.SESSION_SECRET).update(sessionId).digest('hex');
  return `${sessionId}.${hmac}`;
}

/**
 * Verify and unsign session cookie
 */
export function unsignSessionId(signedValue: string): string | null {
  if (!signedValue || typeof signedValue !== 'string') return null;
  const parts = signedValue.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', env.SESSION_SECRET).update(sessionId).digest('hex');
  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    return valid ? sessionId : null;
  } catch {
    return null;
  }
}

/**
 * Create a new server-side session and set secure HttpOnly cookie
 */
export async function createSession(
  res: Response,
  user: { id: number; username: string; email: string; role: UserRole; fullName: string },
  req?: Request
): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_MAX_AGE_MS);

  const sessionData: SessionData = {
    sessionId,
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    createdAt: now,
    lastActiveAt: now
  };

  // Cache in memory
  activeSessions.set(sessionId, sessionData);

  // Persist to database
  const ip = req?.ip || '127.0.0.1';
  const ua = req?.headers['user-agent'] || 'Unknown';
  try {
    await db.execute(
      `INSERT INTO sessions (session_id, user_id, data, ip_address, user_agent, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, user.id, JSON.stringify(sessionData), ip, ua, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );
  } catch (err: any) {
    console.error('Session DB persist warning:', err.message);
  }

  // Set secure cookie
  const signedCookie = signSessionId(sessionId);
  res.cookie(SESSION_COOKIE_NAME, signedCookie, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS
  });

  return sessionId;
}

/**
 * Invalidate session on logout or security violation
 */
export async function destroySession(sessionId: string, res?: Response): Promise<void> {
  activeSessions.delete(sessionId);
  try {
    await db.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
  } catch (err: any) {
    console.error('Session DB destroy warning:', err.message);
  }

  if (res) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }
}

/**
 * Session verification middleware
 */
export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookieValue = req.cookies?.[SESSION_COOKIE_NAME];
  if (!cookieValue) {
    return next();
  }

  const rawSessionId = unsignSessionId(cookieValue);
  if (!rawSessionId) {
    res.clearCookie(SESSION_COOKIE_NAME);
    return next();
  }

  // Check cache or database
  let session = activeSessions.get(rawSessionId);

  if (!session) {
    try {
      const [rows] = await db.execute<any[]>(
        'SELECT data, expires_at FROM sessions WHERE session_id = ? LIMIT 1',
        [rawSessionId]
      );
      if (rows && rows.length > 0) {
        const expiresAt = new Date(rows[0].expires_at).getTime();
        if (expiresAt > Date.now()) {
          session = JSON.parse(rows[0].data);
          if (session) {
            activeSessions.set(rawSessionId, session);
          }
        } else {
          // Expired in database
          await destroySession(rawSessionId, res);
        }
      }
    } catch (e: any) {
      console.error('Session lookup error:', e.message);
    }
  }

  if (session) {
    const now = Date.now();
    // Idle timeout check
    if (now - session.lastActiveAt > SESSION_IDLE_TIMEOUT_MS) {
      await destroySession(rawSessionId, res);
      return next();
    }

    // Refresh last active timestamp
    session.lastActiveAt = now;
    req.sessionId = rawSessionId;
    req.sessionUser = session;
  }

  next();
}
