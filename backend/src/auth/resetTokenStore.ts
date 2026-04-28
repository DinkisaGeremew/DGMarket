// In-memory store for password reset tokens (TTL: 15 minutes)
interface ResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

const tokens = new Map<string, ResetToken>(); // token -> record

export function saveToken(email: string, token: string): void {
  tokens.set(token, { email, token, expiresAt: Date.now() + 15 * 60 * 1000 });
}

export function findToken(token: string): ResetToken | undefined {
  const record = tokens.get(token);
  if (!record) return undefined;
  if (Date.now() > record.expiresAt) { tokens.delete(token); return undefined; }
  return record;
}

export function deleteToken(token: string): void {
  tokens.delete(token);
}
