let counter = 0;

/** A key for a list row that stays the same when rows move or others are removed. */
export function nextRowKey(): string {
  counter += 1;
  return `row-${counter}`;
}

/** A copy of `items` with the item at `index` moved by `delta` places. Out of range returns the same order. */
export function moved<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
