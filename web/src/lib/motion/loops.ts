/** Anything that can be played and paused. A GSAP tween or timeline fits. */
export type Loop = { play: () => unknown; pause: () => unknown };

export type LoopEntry = {
  /** Tells the controller whether the loop's scene is on screen. */
  setVisible: (visible: boolean) => void;
  /** Pauses the loop and forgets it. */
  remove: () => void;
};

export type LoopController = {
  /** A new loop is not visible yet, so it starts paused. */
  add: (loop: Loop) => LoopEntry;
  /** Saves the choice in the storage, when there is one. */
  setPaused: (paused: boolean) => void;
  isPaused: () => boolean;
  subscribe: (listener: (paused: boolean) => void) => () => void;
};

export const PAUSED_STORAGE_KEY = "nepnha:motion-paused";

type Storage2 = Pick<Storage, "getItem" | "setItem">;

/**
 * Keeps all looping motion of the page under one switch. A loop runs only while it is
 * visible and the user has not paused the motion. Storage errors are ignored: then the
 * choice lives only until the page closes.
 */
export function createLoopController(storage: Storage2 | null): LoopController {
  let paused = false;
  try {
    paused = storage?.getItem(PAUSED_STORAGE_KEY) === "1";
  } catch {
    paused = false;
  }

  type Item = { loop: Loop; visible: boolean };
  const items = new Set<Item>();
  const listeners = new Set<(paused: boolean) => void>();

  const sync = (item: Item) => {
    if (item.visible && !paused) item.loop.play();
    else item.loop.pause();
  };

  return {
    add(loop) {
      const item: Item = { loop, visible: false };
      items.add(item);
      sync(item);
      return {
        setVisible(visible) {
          if (!items.has(item) || item.visible === visible) return;
          item.visible = visible;
          sync(item);
        },
        remove() {
          if (!items.delete(item)) return;
          item.loop.pause();
        },
      };
    },
    setPaused(next) {
      paused = next;
      try {
        storage?.setItem(PAUSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // The choice stays in memory only.
      }
      items.forEach(sync);
      listeners.forEach((listener) => listener(next));
    },
    isPaused: () => paused,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let instance: LoopController | null = null;

/** One controller for the whole page. Call it only in the browser, after the page has loaded. */
export function getLoopController(): LoopController {
  if (instance === null) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    instance = createLoopController(storage);
  }
  return instance;
}
