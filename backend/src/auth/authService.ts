import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '@em/shared';
import * as store from './userStore';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 10;

export interface AuthResult {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

export interface AuthError {
  error: string;
  code: string;
}

export function isAuthError(val: unknown): val is AuthError {
  return typeof val === 'object' && val !== null && 'code' in val && 'error' in val;
}

// ── Email registration ────────────────────────────────────────────────────────

export async function registerWithEmail(
  email: string,
  password: string,
  role: UserRole = 'buyer',
  phone?: string,
  name?: string,
  businessName?: string
): Promise<AuthResult | AuthError> {
  if (!email || !password) {
    return { error: 'Email and password are required', code: 'MISSING_FIELDS' };
  }

  if (store.findByEmail(email)) {
    return { error: 'Email already registered', code: 'DUPLICATE_EMAIL' };
  }

  if (phone && store.findByPhone(phone)) {
    return { error: 'Phone number already registered', code: 'DUPLICATE_PHONE' };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  const user: User = {
    id: uuidv4(),
    email,
    ...(phone && { phone }),
    ...(name && { name }),
    ...(businessName && { businessName }),
    role,
    passwordHash,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  store.save(user);
  return buildResult(user);
}

// ── Email login ───────────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult | AuthError> {
  const user = store.findByEmail(email);
  if (!user || !user.passwordHash) {
    return { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
  }

  return buildResult(user);
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function buildResult(user: User): AuthResult {
  const { passwordHash: _, ...safeUser } = user;
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { token, user: safeUser };
}

export function verifyToken(token: string): { sub: string; role: UserRole } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; role: UserRole };
  } catch {
    return null;
  }
}
