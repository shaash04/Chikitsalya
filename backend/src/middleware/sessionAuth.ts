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

/**
 * Sign temporary 2FA pending state token with 5-minute validity
 */
export function signTwoFactorPendingToken(userId: number, email: string): string {
  const payload = {
    userId,
    email,
    exp: Date.now() + 5 * 60 * 1000 // 5 minutes
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.SESSION_SECRET).update(str).digest('base64url');
  return `${str}.${sig}`;
}

/**
 * Verify temporary 2FA pending token
 */
export function verifyTwoFactorPendingToken(token: string): { userId: number; email: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [str, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', env.SESSION_SECRET).update(str).digest('base64url');

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(sig, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );
    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    if (!payload.userId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Robust User-Agent Parser for device / browser identity
 */
export function parseDeviceInfo(ua?: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Unknown Browser', os: 'Unknown OS', device: 'Desktop' };

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/curl|python|postman|insomnia/i.test(ua)) browser = 'API Client';

  let device = 'Desktop';
  if (/mobile|android|iphone|ipod/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  return { browser, os, device };
}

export interface ActiveSessionView {
  sessionId: string;
  ipAddress: string;
  userAgent: string | null;
  deviceInfo: { browser: string; os: string; device: string };
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

/**
 * List all active sessions for a user
 */
export async function getUserSessions(userId: number, currentSessionId?: string): Promise<ActiveSessionView[]> {
  const [rows] = await db.execute<any[]>(
    'SELECT session_id, ip_address, user_agent, created_at, updated_at, data FROM sessions WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );

  return (rows || []).map(r => {
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(r.data);
    } catch {}

    const lastActive = parsedData.lastActiveAt
      ? new Date(parsedData.lastActiveAt).toISOString()
      : r.updated_at || r.created_at;

    return {
      sessionId: r.session_id,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      deviceInfo: parseDeviceInfo(r.user_agent),
      createdAt: r.created_at,
      lastActiveAt: lastActive,
      isCurrent: r.session_id === currentSessionId
    };
  });
}

/**
 * Revoke specific session belonging to user
 */
export async function revokeUserSession(sessionId: string, userId: number, res?: Response): Promise<boolean> {
  activeSessions.delete(sessionId);
  const [result] = await db.execute(
    'DELETE FROM sessions WHERE session_id = ? AND user_id = ?',
    [sessionId, userId]
  );

  if (res) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }

  return Boolean(result && result.affectedRows > 0);
}

/**
 * Revoke all other active sessions for user except current
 */
export async function revokeOtherSessions(currentSessionId: string, userId: number): Promise<number> {
  for (const [sid, sess] of activeSessions.entries()) {
    if (sess.userId === userId && sid !== currentSessionId) {
      activeSessions.delete(sid);
    }
  }

  const [result] = await db.execute(
    'DELETE FROM sessions WHERE user_id = ? AND session_id != ?',
    [userId, currentSessionId]
  );

  return result ? result.affectedRows : 0;
}
