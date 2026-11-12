import { webcrypto } from 'node:crypto';

/**
 * Returns a uniformly distributed integer in [0, maxExclusive)
 * using crypto.getRandomValues() with rejection sampling to eliminate modulo bias.
 */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error(`maxExclusive must be a positive integer, got ${maxExclusive}`);
  }
  if (maxExclusive === 1) return 0;

  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const buf = new Uint32Array(1);

  while (true) {
    webcrypto.getRandomValues(buf);
    const value = buf[0];
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

/**
 * Generates a uniformly random derangement (a permutation with no fixed points)
 * of the input array using CSPRNG Fisher-Yates with rejection sampling.
 * Falls back to Sattolo's algorithm if rejection sampling exceeds maxAttempts.
 */
export function generateDerangement<T>(items: readonly T[], maxAttempts = 128): T[] {
  const n = items.length;
  if (n < 2) {
    throw new Error('At least 2 items are required to generate a derangement.');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = [...items];
    for (let i = n - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      const tmp = candidate[i];
      candidate[i] = candidate[j];
      candidate[j] = tmp;
    }

    let hasFixedPoint = false;
    for (let i = 0; i < n; i++) {
      if (candidate[i] === items[i]) {
        hasFixedPoint = true;
        break;
      }
    }

    if (!hasFixedPoint) {
      return candidate;
    }
  }

  // Fallback: Sattolo's algorithm guarantees a single-cycle derangement in O(n)
  const sattolo = [...items];
  for (let i = n - 1; i > 0; i--) {
    const j = secureRandomInt(i); // strictly < i
    const tmp = sattolo[i];
    sattolo[i] = sattolo[j];
    sattolo[j] = tmp;
  }
  return sattolo;
}

/**
 * Verifies that `recipients` is a valid derangement of `givers`:
 * - same length
 * - every giver receives exactly one recipient
 * - every recipient is assigned exactly once
 * - no giver is assigned to themselves
 */
export function verifyDerangement<T>(givers: readonly T[], recipients: readonly T[]): boolean {
  if (givers.length !== recipients.length || givers.length < 2) {
    return false;
  }

  const giverSet = new Set(givers);
  const recipientSet = new Set(recipients);
  if (giverSet.size !== givers.length || recipientSet.size !== recipients.length) {
    return false;
  }

  for (let i = 0; i < givers.length; i++) {
    if (givers[i] === recipients[i]) {
      return false;
    }
    if (!giverSet.has(recipients[i])) {
      return false;
    }
  }

  return true;
}
