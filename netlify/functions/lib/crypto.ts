import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function getPepper(): string {
  try {
    const netlifyGlobal = (globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } }).Netlify;
    const val = netlifyGlobal?.env?.get?.('TOKEN_HASH_PEPPER');
    if (val) return val;
  } catch {
    // Ignore when not running inside Netlify runtime
  }
  return process.env.TOKEN_HASH_PEPPER ?? '';
}

export function generateUrlSafeId(byteLength = 8): string {
  return randomBytes(byteLength).toString('base64url');
}

export function generateSecretToken(prefix: 'org' | 'prt'): string {
  const raw = randomBytes(32).toString('base64url');
  return `${prefix}_${raw}`;
}

export function hashToken(token: string): string {
  const pepper = getPepper();
  return createHash('sha256')
    .update(pepper ? `${pepper}:${token}` : token, 'utf8')
    .digest('hex');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
