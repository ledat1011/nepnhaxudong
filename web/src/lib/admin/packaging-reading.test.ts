import { describe, expect, it } from "vitest";
import { priceReading, priceWarning, weightReading, weightWarning } from "./packaging-reading";

describe("weightReading", () => {
  it("reads grams the way the public site writes them", () => {
    expect(weightReading("2000")).toBe("= 2 kg");
    expect(weightReading("1500")).toBe("= 1,5 kg");
    expect(weightReading("500")).toBe("= 500 g");
    expect(weightReading(" 2 ")).toBe("= 2 g");
  });

  it("is null for an empty box or a value that is not a whole number above 0", () => {
    for (const text of ["", "  ", "0", "-5", "1.5", "abc"]) expect(weightReading(text)).toBeNull();
  });
});

describe("weightWarning", () => {
  it("warns under 100 g and says what to type for kilograms", () => {
    expect(weightWarning("2")).toBe("Ô này tính bằng gam. Nếu là 2 kg, hãy gõ 2000.");
    expect(weightWarning("99")).toBe("Ô này tính bằng gam. Nếu là 99 kg, hãy gõ 99000.");
  });

  it("is silent from 100 g, and for an empty or wrong box (the form checks those)", () => {
    for (const text of ["100", "2000", "", "0", "abc"]) expect(weightWarning(text)).toBeNull();
  });
});

describe("priceReading", () => {
  it("writes the price with a dot every three digits and đ", () => {
    expect(priceReading("150000")).toBe("= 150.000 đ");
    expect(priceReading("0")).toBe("= 0 đ");
  });

  it("is null for an empty box or a value that is not a whole number", () => {
    for (const text of ["", "-1", "1.5", "abc"]) expect(priceReading(text)).toBeNull();
  });
});

describe("priceWarning", () => {
  it("warns under 1.000 đ and says what to type for thousands", () => {
    expect(priceWarning("150")).toBe("Giá dưới 1.000 đ. Nếu là 150.000 đ, hãy gõ 150000.");
  });

  it("says that 0 shows as 0 đ and an empty box shows Giá liên hệ", () => {
    expect(priceWarning("0")).toBe("Trang web sẽ ghi 0 đ. Để trống ô này nếu muốn ghi “Giá liên hệ”.");
  });

  it("is silent from 1.000 đ and for an empty or wrong box", () => {
    for (const text of ["1000", "150000", "", "abc"]) expect(priceWarning(text)).toBeNull();
  });
});
