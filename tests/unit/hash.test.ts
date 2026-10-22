import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Sha256, sha256Hex, toHex, utf8 } from '@/lib/utils/hash';

describe('sha256', () => {
  it('stimmt mit Testvektoren und node:crypto überein', () => {
    expect(sha256Hex(utf8(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex(utf8('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    for (const size of [1, 55, 56, 63, 64, 65, 119, 120, 1000, 150_000]) {
      const data = randomBytes(size);
      expect(sha256Hex(new Uint8Array(data))).toBe(createHash('sha256').update(data).digest('hex'));
    }
  });

  it('inkrementell (update in beliebigen Stücken) ergibt denselben Hash', () => {
    const data = new Uint8Array(randomBytes(10_000));
    const expected = createHash('sha256').update(data).digest('hex');
    for (const step of [1, 3, 63, 64, 65, 127, 4096]) {
      const hash = new Sha256();
      for (let i = 0; i < data.length; i += step) hash.update(data.subarray(i, i + step));
      expect(toHex(hash.digest()), `Stückgröße ${step}`).toBe(expected);
    }
    const empty = new Sha256().update(new Uint8Array(0)).update(utf8('abc')).update(new Uint8Array(0));
    expect(toHex(empty.digest())).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('verbietet update/digest nach digest', () => {
    const hash = new Sha256();
    hash.digest();
    expect(() => hash.update(utf8('x'))).toThrow();
    expect(() => hash.digest()).toThrow();
  });

  it('hasht große Eingaben (27 MiB, so groß wie die Indizes von 192×384×192) korrekt', () => {
    const data = new Uint8Array(randomBytes(27 * 1024 * 1024 + 5));
    const expected = createHash('sha256').update(data).digest('hex');
    const start = performance.now();
    const actual = sha256Hex(data);
    const ms = performance.now() - start;
    expect(actual).toBe(expected);
    // Generous bound; the measured speed is ~190 MiB/s (see tests/integration/largeModels.test.ts).
    expect(ms).toBeLessThan(10_000);
  });
});
