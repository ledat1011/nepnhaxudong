import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allowDraftWrites, clearAllDrafts, clearDraft, draftKey, readDraft, writeDraft, type StoryDraft } from "./story-draft";

type State = { title: string };
const isState = (value: unknown): value is State =>
  typeof value === "object" && value !== null && typeof (value as State).title === "string";

function draft(overrides: Partial<StoryDraft<State>> = {}): StoryDraft<State> {
  return { version: 1, userId: 1, savedAt: 1_000, base: { title: "Cũ" }, state: { title: "Mới" }, ...overrides };
}

beforeEach(() => {
  localStorage.clear();
  allowDraftWrites();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("story drafts in the browser", () => {
  it("uses the story id in the key, or 'new' for a story that is not saved yet", () => {
    expect(draftKey(5)).toBe("nepnha:story-draft:5");
    expect(draftKey(undefined)).toBe("nepnha:story-draft:new");
  });

  it("writes a draft and reads it back for the same user only", () => {
    expect(writeDraft(draftKey(5), draft())).toBe(true);
    expect(readDraft(draftKey(5), 1, isState)).toEqual(draft());
    expect(readDraft(draftKey(5), 2, isState)).toBeNull();
  });

  it("drops a draft that is not readable", () => {
    localStorage.setItem(draftKey(5), "{not json");
    expect(readDraft(draftKey(5), 1, isState)).toBeNull();
    expect(localStorage.getItem(draftKey(5))).toBeNull();
    localStorage.setItem(draftKey(5), JSON.stringify({ ...draft(), state: { body: 1 } }));
    expect(readDraft(draftKey(5), 1, isState)).toBeNull();
  });

  it("answers false, without throwing, when the storage is full or blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(writeDraft(draftKey(5), draft())).toBe(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(readDraft(draftKey(5), 1, isState)).toBeNull();
    expect(() => clearDraft(draftKey(5))).not.toThrow();
  });

  it("clears every draft on sign-out and writes none until the next sign-in", () => {
    writeDraft(draftKey(5), draft());
    writeDraft(draftKey(undefined), draft());
    localStorage.setItem("other-key", "kept");
    clearAllDrafts();
    expect(localStorage.getItem(draftKey(5))).toBeNull();
    expect(localStorage.getItem(draftKey(undefined))).toBeNull();
    expect(localStorage.getItem("other-key")).toBe("kept");
    // A timer of an editor that is still closing must not write the text back.
    expect(writeDraft(draftKey(5), draft())).toBe(false);
    expect(localStorage.getItem(draftKey(5))).toBeNull();
    allowDraftWrites();
    expect(writeDraft(draftKey(5), draft())).toBe(true);
  });
});
