import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import {
  registerWithEmail,
  loginWithEmail,
  isAuthError,
} from './authService';
import { sendOTP, verifyOTP } from './otpService';
import { _reset as resetUsers } from './userStore';
import { _reset as resetOTPs } from './otpStore';

beforeEach(() => {
  resetUsers();
  resetOTPs();
});

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbEmail = () =>
  fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }),
      fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' })
    )
    .map(([local, domain]) => `${local.replace(/[^a-z0-9]/gi, 'a')}@${domain.replace(/[^a-z0-9]/gi, 'b')}.com`);

const arbPassword = () => fc.string({ minLength: 8, maxLength: 40 });

const arbPhone = () =>
  fc.integer({ min: 900000000, max: 999999999 }).map((n) => `+251${n}`);

// ── Property 2: Email registration produces valid token ───────────────────────
// Feature: ethiopian-marketplace, Property 2: Email registration produces valid token
// Validates: Requirements 1.2

describe('Property 2: Email registration produces valid token', () => {
  it('for any valid email/password, registration returns a decodable JWT with user id and role', async () => {
    await fc.assert(
      fc.asyncProperty(arbEmail(), arbPassword(), async (email, password) => {
        resetUsers();
        const result = await registerWithEmail(email, password, 'buyer');
        expect(isAuthError(result)).toBe(false);
        if (!isAuthError(result)) {
          expect(typeof result.token).toBe('string');
          expect(result.token.length).toBeGreaterThan(0);
          const decoded = jwt.decode(result.token) as { sub: string; role: string };
          expect(decoded.sub).toBe(result.user.id);
          expect(decoded.role).toBe('buyer');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: Duplicate registration is rejected ───────────────────────────
// Feature: ethiopian-marketplace, Property 5: Duplicate registration is rejected
// Validates: Requirements 1.5

describe('Property 5: Duplicate registration is rejected', () => {
  it('for any email, registering twice returns DUPLICATE_EMAIL on second attempt', async () => {
    await fc.assert(
      fc.asyncProperty(arbEmail(), arbPassword(), async (email, password) => {
        resetUsers();
        await registerWithEmail(email, password, 'buyer');
        const second = await registerWithEmail(email, password, 'buyer');
        expect(isAuthError(second)).toBe(true);
        if (isAuthError(second)) {
          expect(second.code).toBe('DUPLICATE_EMAIL');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 1: OTP issuance on valid phone ───────────────────────────────────
// Feature: ethiopian-marketplace, Property 1: OTP issuance on valid phone
// Validates: Requirements 1.1

describe('Property 1: OTP issuance on valid phone', () => {
  it('for any phone number, sendOTP creates an OTP record with a future expiry', () => {
    fc.assert(
      fc.property(arbPhone(), (phone) => {
        resetOTPs();
        const result = sendOTP(phone);
        expect(result.phone).toBe(phone);
        expect(result.code).toMatch(/^\d{6}$/);
        expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: OTP round-trip authentication ─────────────────────────────────
// Feature: ethiopian-marketplace, Property 3: OTP round-trip authentication
// Validates: Requirements 1.3

describe('Property 3: OTP round-trip authentication', () => {
  it('for any phone, sending then verifying the correct OTP within expiry returns a valid token', () => {
    fc.assert(
      fc.property(arbPhone(), (phone) => {
        resetUsers();
        resetOTPs();
        const { code } = sendOTP(phone);
        const result = verifyOTP(phone, code, 'buyer');
        expect(isAuthError(result)).toBe(false);
        if (!isAuthError(result)) {
          expect(typeof result.token).toBe('string');
          expect(result.token.length).toBeGreaterThan(0);
          const decoded = jwt.decode(result.token) as { sub: string; role: string };
          expect(decoded.role).toBe('buyer');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Invalid OTP is rejected ──────────────────────────────────────
// Feature: ethiopian-marketplace, Property 4: Invalid OTP is rejected
// Validates: Requirements 1.4

describe('Property 4: Invalid OTP is rejected', () => {
  it('a mismatched OTP code is rejected and returns OTP_MISMATCH', () => {
    fc.assert(
      fc.property(arbPhone(), fc.string({ minLength: 6, maxLength: 6, unit: 'grapheme-ascii' }), (phone, wrongCode) => {
        resetOTPs();
        const { code } = sendOTP(phone);
        // Ensure the wrong code is actually different
        if (wrongCode === code) return; // skip this sample
        const result = verifyOTP(phone, wrongCode, 'buyer');
        expect(isAuthError(result)).toBe(true);
        if (isAuthError(result)) {
          expect(['OTP_MISMATCH', 'OTP_NOT_FOUND']).toContain(result.code);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('an expired OTP is rejected and returns OTP_EXPIRED', () => {
    fc.assert(
      fc.property(arbPhone(), (phone) => {
        resetOTPs();
        // Manually insert an already-expired OTP
        const { _reset: __, ...otpStore } = require('./otpStore');
        const expiredRecord = {
          phone,
          code: '123456',
          expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second in the past
          used: false,
        };
        otpStore.save(expiredRecord);
        const result = verifyOTP(phone, '123456', 'buyer');
        expect(isAuthError(result)).toBe(true);
        if (isAuthError(result)) {
          expect(result.code).toBe('OTP_EXPIRED');
        }
      }),
      { numRuns: 50 }
    );
  });
});
