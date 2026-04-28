/**
 * In-memory OTP store.
 * Each phone can have one active OTP at a time.
 */
import { OTPRecord } from '@em/shared';

const otps: Map<string, OTPRecord> = new Map();

export function save(record: OTPRecord): void {
  otps.set(record.phone, record);
}

export function find(phone: string): OTPRecord | undefined {
  return otps.get(phone);
}

export function markUsed(phone: string): void {
  const record = otps.get(phone);
  if (record) otps.set(phone, { ...record, used: true });
}

/** For testing only */
export function _reset(): void {
  otps.clear();
}
