import { STORY_CARD_CLASS, STORY_CARD_TEXT } from "./StoryCard";
import { STORY_GRID_CLASS } from "./StoryList";

// One row on a wide screen. A full page has more cards; they arrive below the first screen.
const CARD_COUNT = 3;

/**
 * Lines of each text of `StoryCard`, as the sample stories show them at three columns: a
 * one-line date, a two-line title, two lines of excerpt and the one-line "Read more". The last
 * line of a text is shorter, as real text ends.
 */
const LINES: Record<keyof typeof STORY_CARD_TEXT, string[]> = {
  date: ["w-32"],
  title: ["w-full", "w-1/2"],
  excerpt: ["w-full", "w-2/3"],
  readMore: ["w-24"],
};

/**
 * One placeholder text: the same text classes as the real text, and one box per line. A box is
 * `1lh` high, one line of those classes, so the card has the height of a real one. The shape
 * inside is a little lower than the line, with a gap between lines, as text has.
 */
function SkeletonText({ part }: { part: keyof typeof STORY_CARD_TEXT }) {
  return (
    <div data-skeleton-text={part} className={STORY_CARD_TEXT[part]}>
      {LINES[part].map((width, index) => (
        <div key={index} className="flex h-[1lh] items-center">
          <div className={`h-[0.75lh] rounded bg-straw ${width}`} />
        </div>
      ))}
    </div>
  );
}

/**
 * Shown while the story list loads, with the frame, cover and text lines of `StoryCard`. The
 * shapes are hidden from screen readers; the status text below says what is loading, where the
 * page links appear later. Nothing moves.
 */
export function StoryListSkeleton({ label }: { label: string }) {
  return (
    <>
      <ul aria-hidden="true" className={STORY_GRID_CLASS}>
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li key={index}>
            <div data-story-skeleton className={STORY_CARD_CLASS}>
              <div className="aspect-[16/9] bg-straw" />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <SkeletonText part="date" />
                <SkeletonText part="title" />
                <SkeletonText part="excerpt" />
                <SkeletonText part="readMore" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-10 font-bold text-coat">
        {label}
      </p>
    </>
  );
}
