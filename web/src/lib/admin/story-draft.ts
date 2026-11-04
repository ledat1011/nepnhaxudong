/**
 * The story being written is kept in the browser (localStorage), so it survives a reload, a flat battery or a
 * sign-in again. One draft per story ("new" for a story that is not saved yet), and only for the user who wrote it.
 * Every access is in try/catch: a full or blocked storage means "no draft", never an error on the page.
 */

const PREFIX = "nepnha:story-draft:";

export type StoryDraft<T> = {
  version: 1;
  /** The family member who wrote it. Another user on the same phone never sees it. */
  userId: number;
  /** When it was written, in milliseconds since 1970. */
  savedAt: number;
  /** The saved version of the story the draft started from. */
  base: T;
  /** The text in the form. */
  state: T;
};

// Set by a sign-out, until the next sign-in. An editor that is still closing must not write the text back.
let blocked = false;

export function draftKey(storyId: number | undefined): string {
  return `${PREFIX}${storyId ?? "new"}`;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The draft of `key` written by `userId`, or null. A draft that cannot be read is removed. */
export function readDraft<T>(key: string, userId: number, isState: (value: unknown) => value is T): StoryDraft<T> | null {
  try {
    const raw = storage()?.getItem(key);
    if (raw === null || raw === undefined) return null;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      clearDraft(key);
      return null;
    }
    const draft = value as Partial<StoryDraft<unknown>>;
    const valid =
      draft !== null &&
      typeof draft === "object" &&
      draft.version === 1 &&
      typeof draft.userId === "number" &&
      typeof draft.savedAt === "number" &&
      isState(draft.base) &&
      isState(draft.state);
    if (!valid) {
      clearDraft(key);
      return null;
    }
    return draft.userId === userId ? (draft as StoryDraft<T>) : null;
  } catch {
    return null;
  }
}

/** True when the draft was written. False when writes are blocked or the storage is full or not available. */
export function writeDraft<T>(key: string, draft: StoryDraft<T>): boolean {
  if (blocked) return false;
  try {
    const store = storage();
    if (store === null) return false;
    store.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing to do: a storage that cannot be used holds no draft that this page wrote.
  }
}

/** On sign-out: removes every story draft, and blocks writes until `allowDraftWrites`. */
export function clearAllDrafts(): void {
  blocked = true;
  try {
    const store = storage();
    if (store === null) return;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // See clearDraft.
  }
}

/** On sign-in: drafts may be written again. */
export function allowDraftWrites(): void {
  blocked = false;
}
