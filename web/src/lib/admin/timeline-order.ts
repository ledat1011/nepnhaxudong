/** The public site shows the timeline in the order kept in the admin, so a wrong order is what visitors see. */
type Dated = { year: number };

/** The first two neighbours where a later year stands before an earlier one, or null when the order follows the years. */
export function yearOrderBreak<T extends Dated>(events: T[]): { earlier: T; later: T } | null {
  for (let i = 0; i + 1 < events.length; i += 1) {
    if (events[i].year > events[i + 1].year) return { earlier: events[i], later: events[i + 1] };
  }
  return null;
}

/** A copy sorted by year. Events of the same year keep the order they had (the sort is stable). */
export function sortedByYear<T extends Dated>(events: T[]): T[] {
  return [...events].sort((a, b) => a.year - b.year);
}
