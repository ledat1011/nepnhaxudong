import { afterEach, describe, expect, it, vi } from "vitest";
import { TEMP_PASSWORD_MIN_LENGTH, TEMP_PASSWORD_WORDS, generateTempPassword, randomBelow } from "./temp-password";

afterEach(() => {
  vi.restoreAllMocks();
});

const SHAPE = /^([a-z]+)-([a-z]+)-([a-z]+)-([a-z]+)-(\d{2})$/;

describe("generateTempPassword", () => {
  it("is four words and a two-digit number joined by dashes, long enough for the API, over 1000 calls", () => {
    for (let i = 0; i < 1000; i += 1) {
      const password = generateTempPassword();
      const parts = SHAPE.exec(password);
      expect(parts, password).not.toBeNull();
      expect(parts!.slice(1, 5).every((word) => TEMP_PASSWORD_WORDS.includes(word))).toBe(true);
      expect(Number(parts![5])).toBeGreaterThanOrEqual(10);
      expect(password.length).toBeGreaterThanOrEqual(TEMP_PASSWORD_MIN_LENGTH);
    }
    expect(TEMP_PASSWORD_MIN_LENGTH).toBe(12);
  });

  it("picks from 128 different plain words (no accents, easy to type on any keyboard)", () => {
    expect(TEMP_PASSWORD_WORDS).toHaveLength(128);
    expect(new Set(TEMP_PASSWORD_WORDS).size).toBe(128);
    expect(TEMP_PASSWORD_WORDS.every((word) => /^[a-z]{2,6}$/.test(word))).toBe(true);
  });

  it("changes between calls", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });

  it("asks the crypto generator and never Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const spy = vi.spyOn(crypto, "getRandomValues");
    generateTempPassword();
    expect(spy).toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });
});

describe("randomBelow", () => {
  it("drops random values above the largest multiple of n instead of using modulo", () => {
    const limit = Math.floor(2 ** 32 / 90) * 90;
    const script = [2 ** 32 - 1, limit, 7];
    let next = 0;
    vi.spyOn(crypto, "getRandomValues").mockImplementation(((array: Uint32Array) => {
      array[0] = script[next++];
      return array;
    }) as typeof crypto.getRandomValues);
    expect(randomBelow(90)).toBe(7);
    expect(next).toBe(3);
  });
});
