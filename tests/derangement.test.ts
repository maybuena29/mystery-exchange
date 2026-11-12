import { describe, expect, it } from 'vitest';
import {
  generateDerangement,
  secureRandomInt,
  verifyDerangement,
} from '../netlify/functions/lib/derangement';

describe('CSPRNG Derangement Algorithm', () => {
  it('generates valid derangements with no self-assignments for 3, 5, 10, and 50 participants', () => {
    const sizes = [3, 5, 10, 50];

    for (const size of sizes) {
      const participants = Array.from({ length: size }, (_, i) => `p_${i + 1}`);

      for (let run = 0; run < 25; run++) {
        const recipients = generateDerangement(participants);
        expect(recipients).toHaveLength(size);
        expect(verifyDerangement(participants, recipients)).toBe(true);

        for (let i = 0; i < size; i++) {
          expect(recipients[i]).not.toBe(participants[i]);
        }
      }
    }
  });

  it('throws if fewer than 2 items are provided', () => {
    expect(() => generateDerangement(['only_one'])).toThrow();
    expect(() => generateDerangement([])).toThrow();
  });

  it('rejects invalid derangements in verifyDerangement', () => {
    expect(verifyDerangement(['a', 'b', 'c'], ['a', 'c', 'b'])).toBe(false); // self-assignment
    expect(verifyDerangement(['a', 'b', 'c'], ['b', 'b', 'a'])).toBe(false); // duplicate recipient
    expect(verifyDerangement(['a', 'b', 'c'], ['b', 'a'])).toBe(false); // length mismatch
  });

  it('produces integers within [0, maxExclusive)', () => {
    for (let i = 0; i < 200; i++) {
      const val = secureRandomInt(17);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(17);
    }
  });
});
