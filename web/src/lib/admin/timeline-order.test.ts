import { describe, expect, it } from "vitest";
import { sortedByYear, yearOrderBreak } from "./timeline-order";

const e = (id: number, year: number) => ({ id, year });

describe("yearOrderBreak", () => {
  it("is null for events in year order, same years in any order included", () => {
    expect(yearOrderBreak([])).toBeNull();
    expect(yearOrderBreak([e(1, 1990), e(2, 2000), e(3, 2000), e(4, 2010)])).toBeNull();
  });

  it("names the first pair where a later year stands before an earlier one", () => {
    const events = [e(1, 1990), e(2, 2005), e(3, 1995), e(4, 1980)];
    expect(yearOrderBreak(events)).toEqual({ earlier: events[1], later: events[2] });
  });
});

describe("sortedByYear", () => {
  it("sorts by year and keeps the order the family chose within one year", () => {
    const events = [e(1, 2005), e(2, 1990), e(3, 2000), e(4, 1990)];
    expect(sortedByYear(events).map((x) => x.id)).toEqual([2, 4, 3, 1]);
    expect(events.map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });
});
