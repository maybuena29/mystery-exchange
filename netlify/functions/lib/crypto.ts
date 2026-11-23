import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function readLocalEnv(keyName: string): string | undefined {
  try {
    const envFiles = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.local'),
    ];
    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            if (key === keyName) {
              let val = trimmed.slice(eqIdx + 1).trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.slice(1, -1);
              }
              if (val.length > 0) return val;
            }
          }
        }
      }
    }
  } catch {
    // Ignore errors reading local files
  }
  return undefined;
}

function getPepper(): string {
  try {
    const netlifyGlobal = (globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } }).Netlify;
    const val = netlifyGlobal?.env?.get?.('TOKEN_HASH_PEPPER');
    if (val && val.trim().length > 0) return val.trim();
  } catch {
    // Ignore when not running inside Netlify runtime
  }
  const procVal = process.env.TOKEN_HASH_PEPPER;
  if (procVal && procVal.trim().length > 0) {
    let cleaned = procVal.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  }
  return readLocalEnv('TOKEN_HASH_PEPPER') ?? '';
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

export function getSuperAdminKey(): string {
  try {
    const netlifyGlobal = (globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } }).Netlify;
    const val = netlifyGlobal?.env?.get?.('SUPER_ADMIN_KEY');
    if (val && val.trim().length > 0) return val.trim();
  } catch {
    // Ignore
  }
  const procVal = process.env.SUPER_ADMIN_KEY;
  if (procVal && procVal.trim().length > 0) {
    let cleaned = procVal.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  }
  const localVal = readLocalEnv('SUPER_ADMIN_KEY');
  if (localVal && localVal.trim().length > 0) {
    return localVal.trim();
  }
  return 'dev-local-admin-key-2026';
}

export function verifySuperAdminToken(providedToken?: string | null): boolean {
  if (!providedToken) return false;
  const masterKey = getSuperAdminKey();
  if (!masterKey) return false;

  let candidate = providedToken.trim();
  if (candidate.startsWith('sa_')) {
    candidate = candidate.slice(3);
  }
  if (
    (candidate.startsWith('"') && candidate.endsWith('"')) ||
    (candidate.startsWith("'") && candidate.endsWith("'"))
  ) {
    candidate = candidate.slice(1, -1);
  }

  if (candidate.length !== masterKey.length) {
    return false;
  }
  const bufA = Buffer.from(candidate, 'utf8');
  const bufB = Buffer.from(masterKey, 'utf8');
  return timingSafeEqual(bufA, bufB);
}
