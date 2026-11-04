import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;

describe("buttonVariants", () => {
  it.each(VARIANTS)("keeps the %s hover style off a disabled button", (variant) => {
    const classes = buttonVariants({ variant }).split(/\s+/);
    const hover = classes.filter((name) => name.includes("hover:"));
    expect(hover.length).toBeGreaterThan(0);
    // On a phone the hover style stays after a tap; a disabled button must not look as if it reacts.
    for (const name of hover) expect(name).toMatch(/(^|:)not-disabled:hover:/);
  });
});
