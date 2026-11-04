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
  it("uses the user id and the story id in the key, or 'new' for a story that is not saved yet", () => {
    expect(draftKey(1, 5)).toBe("nepnha:story-draft:1:5");
    expect(draftKey(1, undefined)).toBe("nepnha:story-draft:1:new");
    // Two family members on one phone never share a key, so one cannot remove the other's draft.
    expect(draftKey(2, 5)).not.toBe(draftKey(1, 5));
  });

  it("writes a draft and reads it back for the same user only", () => {
    expect(writeDraft(draftKey(1, 5), draft())).toBe("written");
    expect(readDraft(draftKey(1, 5), 1, isState)).toEqual(draft());
    expect(readDraft(draftKey(1, 5), 2, isState)).toBeNull();
  });

  it("drops a draft that is not readable", () => {
    localStorage.setItem(draftKey(1, 5), "{not json");
    expect(readDraft(draftKey(1, 5), 1, isState)).toBeNull();
    expect(localStorage.getItem(draftKey(1, 5))).toBeNull();
    localStorage.setItem(draftKey(1, 5), JSON.stringify({ ...draft(), state: { body: 1 } }));
    expect(readDraft(draftKey(1, 5), 1, isState)).toBeNull();
  });

  it("answers failed, without throwing, when the storage is full or blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(writeDraft(draftKey(1, 5), draft())).toBe("failed");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(readDraft(draftKey(1, 5), 1, isState)).toBeNull();
    expect(() => clearDraft(draftKey(1, 5))).not.toThrow();
  });

  it("clears every draft on sign-out and writes none until the next sign-in", () => {
    writeDraft(draftKey(1, 5), draft());
    writeDraft(draftKey(2, undefined), draft({ userId: 2 }));
    localStorage.setItem("other-key", "kept");
    clearAllDrafts();
    expect(localStorage.getItem(draftKey(1, 5))).toBeNull();
    expect(localStorage.getItem(draftKey(2, undefined))).toBeNull();
    expect(localStorage.getItem("other-key")).toBe("kept");
    // A timer of an editor that is still closing must not write the text back.
    expect(writeDraft(draftKey(1, 5), draft())).toBe("blocked");
    expect(localStorage.getItem(draftKey(1, 5))).toBeNull();
    allowDraftWrites();
    expect(writeDraft(draftKey(1, 5), draft())).toBe("written");
  });

  it("writes nothing after a sign-out in another tab of the same browser", () => {
    // Another tab signs out: this tab's module flag is not set, but the shared storage holds the mark.
    clearAllDrafts();
    const otherTabMark = Object.keys(localStorage).filter((key) => !key.startsWith("nepnha:story-draft:"));
    expect(otherTabMark).toHaveLength(1);
    const mark = otherTabMark[0];
    const value = localStorage.getItem(mark)!;
    allowDraftWrites();
    localStorage.setItem(mark, value);
    expect(writeDraft(draftKey(1, 5), draft())).toBe("blocked");
    expect(localStorage.getItem(draftKey(1, 5))).toBeNull();
  });
});
