import { v4 as uuidv4 } from 'uuid';
import { OTPRecord, UserRole } from '@em/shared';
import * as otpStore from './otpStore';
import * as userStore from './userStore';
import { buildResult, AuthResult, AuthError } from './authService';
import { User } from '@em/shared';
import https from 'https';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── SMS via Afromessage ───────────────────────────────────────────────────────
// Set AFROMESSAGE_API_KEY and AFROMESSAGE_IDENTIFIER in your .env to enable real SMS.
// Sign up at https://afromessage.com to get credentials.

async function sendSMS(phone: string, code: string): Promise<void> {
  const apiKey = process.env.AFROMESSAGE_API_KEY;
  const identifierId = process.env.AFROMESSAGE_IDENTIFIER_ID;   // the numeric/hash ID from dashboard
  const senderName = process.env.AFROMESSAGE_SENDER_NAME ?? 'DG Market'; // display name

  if (!apiKey || !identifierId) {
    console.log(`[OTP] Dev mode — code for ${phone}: ${code}`);
    return;
  }

  const message = `Your DG Market verification code is: ${code}. Valid for 5 minutes. Do not share it.`;
  const params = new URLSearchParams({
    from: identifierId,
    sender: senderName,
    to: phone,
    message,
    callback: '',
  });

  const url = `https://api.afromessage.com/api/send?${params.toString()}`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.acknowledge === 'success') {
            console.log(`[OTP] SMS sent to ${phone}`);
          } else {
            console.error(`[OTP] Afromessage error:`, json);
          }
        } catch { /* ignore parse errors */ }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error(`[OTP] SMS send failed:`, e.message);
      resolve(); // never block — OTP is already stored
    });
  });
}

// ── Generate & store OTP ──────────────────────────────────────────────────────

export interface SendOTPResult {
  phone: string;
  /** Exposed for testing; in production this would be sent via SMS only */
  code: string;
  expiresAt: string;
}

export async function sendOTP(phone: string): Promise<SendOTPResult> {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const record: OTPRecord = { phone, code, expiresAt, used: false };
  otpStore.save(record);

  await sendSMS(phone, code);

  return { phone, code, expiresAt };
}

// ── Verify OTP & issue token ──────────────────────────────────────────────────

export function verifyOTP(
  phone: string,
  code: string,
  role: UserRole = 'buyer'
): AuthResult | AuthError {
  const record = otpStore.find(phone);

  if (!record) {
    return { error: 'OTP not found for this phone number', code: 'OTP_NOT_FOUND' };
  }

  if (record.used) {
    return { error: 'OTP has already been used', code: 'OTP_USED' };
  }

  if (new Date() > new Date(record.expiresAt)) {
    return { error: 'OTP has expired', code: 'OTP_EXPIRED' };
  }

  if (record.code !== code) {
    return { error: 'Incorrect OTP', code: 'OTP_MISMATCH' };
  }

  otpStore.markUsed(phone);

  // Create user if first time, otherwise fetch existing
  let user = userStore.findByPhone(phone);
  if (!user) {
    const now = new Date().toISOString();
    user = {
      id: uuidv4(),
      phone,
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as User;
    userStore.save(user);
  }

  return buildResult(user);
}

// ── Verify OTP code only (no user creation) ───────────────────────────────────

export function verifyOTPCode(phone: string, code: string): { success: true } | AuthError {
  const record = otpStore.find(phone);
  if (!record) return { error: 'OTP not found for this phone number', code: 'OTP_NOT_FOUND' };
  if (record.used) return { error: 'OTP has already been used', code: 'OTP_USED' };
  if (new Date() > new Date(record.expiresAt)) return { error: 'OTP has expired', code: 'OTP_EXPIRED' };
  if (record.code !== code) return { error: 'Incorrect OTP', code: 'OTP_MISMATCH' };
  otpStore.markUsed(phone);
  return { success: true };
}
