import { afterEach, describe, expect, it, vi } from "vitest";
import { TEMP_PASSWORD_ALPHABET, TEMP_PASSWORD_LENGTH, TEMP_PASSWORD_MIN_LENGTH, generateTempPassword } from "./temp-password";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateTempPassword", () => {
  it("is 16 characters and never has a look-alike character, over 1000 calls", () => {
    for (let i = 0; i < 1000; i += 1) {
      const password = generateTempPassword();
      expect(password).toHaveLength(16);
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });

  it("is long enough for the API rule", () => {
    expect(TEMP_PASSWORD_LENGTH).toBeGreaterThanOrEqual(TEMP_PASSWORD_MIN_LENGTH);
    expect(TEMP_PASSWORD_MIN_LENGTH).toBe(12);
  });

  it("uses only characters of the alphabet, which has none of 0 O 1 l I", () => {
    expect(TEMP_PASSWORD_ALPHABET).not.toMatch(/[0O1lI]/);
    expect(new Set(TEMP_PASSWORD_ALPHABET).size).toBe(TEMP_PASSWORD_ALPHABET.length);
    expect(generateTempPassword().split("").every((c) => TEMP_PASSWORD_ALPHABET.includes(c))).toBe(true);
  });

  it("changes between calls", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });

  it("drops random bytes above the largest multiple of the alphabet size instead of using modulo", () => {
    const size = TEMP_PASSWORD_ALPHABET.length;
    const limit = Math.floor(256 / size) * size;
    // Bytes at or above `limit` would favour the first characters if they were taken modulo `size`.
    const script = [255, 254, limit, limit + 1, ...Array.from({ length: 64 }, (_, i) => i)];
    let next = 0;
    vi.spyOn(crypto, "getRandomValues").mockImplementation(((array: Uint8Array) => {
      for (let i = 0; i < array.length; i += 1) array[i] = script[next++ % script.length];
      return array;
    }) as typeof crypto.getRandomValues);
    const password = generateTempPassword();
    expect(password).toBe(TEMP_PASSWORD_ALPHABET.slice(0, TEMP_PASSWORD_LENGTH));
  });

  it("asks the crypto generator and never Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const spy = vi.spyOn(crypto, "getRandomValues");
    generateTempPassword();
    expect(spy).toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });
});
