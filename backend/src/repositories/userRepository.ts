import { db } from '../config/database.js';
import { User, SafeUser } from '../types/index.js';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await db.execute<User[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [rows] = await db.execute<User[]>(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username.trim()]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await db.execute<User[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findAllSafe(): Promise<SafeUser[]> {
    const [rows] = await db.execute<SafeUser[]>(
      'SELECT id, uuid, username, email, role, full_name, phone, is_active, last_login_at, created_at, updated_at FROM users ORDER BY id ASC'
    );
    return rows;
  }

  async create(user: {
    uuid: string;
    username: string;
    email: string;
    passwordHash: string;
    role: 'patient' | 'doctor' | 'admin';
    fullName: string;
    phone?: string | null;
  }): Promise<number> {
    const [result] = await db.execute(
      `INSERT INTO users (uuid, username, email, password_hash, role, full_name, phone, is_active, failed_login_attempts) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        user.uuid,
        user.username.trim(),
        user.email.toLowerCase().trim(),
        user.passwordHash,
        user.role,
        user.fullName.trim(),
        user.phone || null
      ]
    );
    return result.insertId;
  }

  async recordFailedAttempt(userId: number, attempts: number, lockUntil: string | null): Promise<void> {
    await db.execute(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockUntil, userId]
    );
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    await db.execute(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  async updatePassword(userId: number, newPasswordHash: string): Promise<void> {
    await db.execute(
      'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );
  }

  async setActiveStatus(userId: number, isActive: number): Promise<void> {
    await db.execute(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive, userId]
    );
  }

  async updateProfile(userId: number, fullName: string, phone?: string | null): Promise<void> {
    await db.execute(
      'UPDATE users SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName.trim(), phone || null, userId]
    );
  }
}

export const userRepository = new UserRepository();
