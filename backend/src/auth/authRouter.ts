import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { registerWithEmail, loginWithEmail, isAuthError, verifyToken } from './authService';
import { sendOTP, verifyOTP, verifyOTPCode } from './otpService';
import { findById, save as saveUser, findByEmail } from './userStore';
import { saveToken, findToken, deleteToken } from './resetTokenStore';
import { sendPasswordResetEmail } from './emailService';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, role, phone, name, businessName } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    phone?: string;
    name?: string;
    businessName?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required', code: 'MISSING_FIELDS' });
    return;
  }

  if (role === 'seller' && !businessName) {
    res.status(400).json({ error: 'Business/store name is required for sellers', code: 'MISSING_FIELDS' });
    return;
  }

  const result = await registerWithEmail(email, password, (role as 'buyer' | 'seller') ?? 'buyer', phone, name, businessName);
  if (isAuthError(result)) {
    res.status(409).json(result);
    return;
  }
  res.status(201).json(result);
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required', code: 'MISSING_FIELDS' });
    return;
  }

  const result = await loginWithEmail(email, password);
  if (isAuthError(result)) {
    res.status(401).json(result);
    return;
  }
  res.json(result);
});

// POST /api/auth/change-password
router.post('/change-password', async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' }); return;
  }

  const user = findById(payload.sub);
  if (!user || !user.passwordHash) { res.status(404).json({ error: 'User not found' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

  const newHash = await bcrypt.hash(newPassword, 10);
  saveUser({ ...user, passwordHash: newHash, updatedAt: new Date().toISOString() });
  res.json({ success: true });
});

// POST /api/auth/otp/send
router.post('/otp/send', async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: 'phone is required', code: 'MISSING_FIELDS' });
    return;
  }

  const result = await sendOTP(phone);
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    phone: result.phone,
    expiresAt: result.expiresAt,
    ...(isDev && { code: result.code }),
  });
});

// POST /api/auth/otp/verify
router.post('/otp/verify', (req: Request, res: Response) => {
  const { phone, code, role } = req.body as {
    phone?: string;
    code?: string;
    role?: string;
  };

  if (!phone || !code) {
    res.status(400).json({ error: 'phone and code are required', code: 'MISSING_FIELDS' });
    return;
  }

  const result = verifyOTP(phone, code, (role as 'buyer' | 'seller') ?? 'buyer');
  if ('error' in result) {
    res.status(401).json(result);
    return;
  }
  res.json(result);
});

// POST /api/auth/fan-otp/send  — simulate sending OTP to phone linked to FAN
router.post('/fan-otp/send', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = verifyToken(authHeader.replace('Bearer ', ''));
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }

  const { fanNumber } = req.body as { fanNumber?: string };
  if (!fanNumber) { res.status(400).json({ error: 'fanNumber is required' }); return; }

  const user = findById(payload.sub);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const phone = user.phone ?? fanNumber;
  const result = await sendOTP(phone);
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    message: `OTP sent to phone linked to FAN ${fanNumber}`,
    expiresAt: result.expiresAt,
    ...(isDev && { devCode: result.code }),
  });
});

// POST /api/auth/fan-otp/verify
router.post('/fan-otp/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = verifyToken(authHeader.replace('Bearer ', ''));
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }

  const { fanNumber, code } = req.body as { fanNumber?: string; code?: string };
  if (!fanNumber || !code) { res.status(400).json({ error: 'fanNumber and code are required' }); return; }

  const user = findById(payload.sub);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const phone = user.phone ?? fanNumber;
  const record = verifyOTPCode(phone, code);
  if ('error' in record) { res.status(401).json(record); return; }

  // Mark FAN as OTP-verified on the user record (temp flag, cleared after full submission)
  saveUser({ ...user, fanNumber, fanOtpVerified: true, updatedAt: new Date().toISOString() });
  res.json({ success: true, message: 'FAN verified successfully' });
});

// POST /api/auth/verify-identity
router.post('/verify-identity', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = verifyToken(authHeader.replace('Bearer ', ''));
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }

  const { idType, idNumber, idImageFront, idImageBack, fanNumber } = req.body as {
    idType?: string; idNumber?: string; idImageFront?: string; idImageBack?: string; fanNumber?: string;
  };

  if (!idType || !idNumber || !idImageFront || !idImageBack || !fanNumber) {
    res.status(400).json({ error: 'idType, idNumber, idImageFront, idImageBack and fanNumber are required' }); return;
  }

  const user = findById(payload.sub);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!user.fanOtpVerified) {
    res.status(400).json({ error: 'FAN OTP verification required before submitting documents' }); return;
  }

  saveUser({
    ...user,
    verificationStatus: 'pending',
    verificationIdType: idType as 'national_id' | 'passport',
    verificationIdNumber: idNumber,
    verificationIdImage: idImageFront,
    verificationIdImageBack: idImageBack,
    fanNumber,
    fanOtpVerified: false, // reset after use
    verificationSubmittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  res.json({ success: true, verificationStatus: 'pending' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

  const user = findByEmail(email);
  // Always respond with success to prevent email enumeration
  if (!user) { res.json({ success: true }); return; }

  const token = uuidv4();
  saveToken(email, token);

  try {
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error('[forgot-password] Failed to send email:', err);
    // Still return success — token is saved, user can try again
    // But log the reset link so admin can manually share it in dev
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    console.log(`[forgot-password] Reset link: ${frontendUrl}/reset-password?token=${token}`);
  }

  res.json({ success: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) { res.status(400).json({ error: 'token and password are required' }); return; }
  if (password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }

  const record = findToken(token);
  if (!record) { res.status(400).json({ error: 'Reset link is invalid or has expired' }); return; }

  const user = findByEmail(record.email);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  saveUser({ ...user, passwordHash, updatedAt: new Date().toISOString() });
  deleteToken(token);
  res.json({ success: true });
});

export default router;
