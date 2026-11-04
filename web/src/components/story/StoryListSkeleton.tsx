import { STORY_CARD_CLASS } from "./StoryCard";
import { STORY_GRID_CLASS } from "./StoryList";

// One row on a wide screen. A full page has more cards; they arrive below the first screen.
const CARD_COUNT = 3;
const SHAPE = "rounded bg-straw";

/**
 * Shown while the story list loads. Each shape has the size of the line it stands for in
 * `StoryCard`: the 16:9 cover, the date (text-sm), the title (text-xl, snug), three lines of
 * excerpt (relaxed) and "Read more". The shapes are hidden from screen readers; the status
 * text below says what is loading, where the page links appear later. Nothing moves.
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
                <div className={`h-5 w-32 ${SHAPE}`} />
                <div className={`h-7 w-4/5 ${SHAPE}`} />
                <div className="space-y-1.5 py-0.5">
                  <div className={`h-5 w-full ${SHAPE}`} />
                  <div className={`h-5 w-full ${SHAPE}`} />
                  <div className={`h-5 w-2/3 ${SHAPE}`} />
                </div>
                <div className="mt-auto pt-2">
                  <div className={`h-6 w-24 ${SHAPE}`} />
                </div>
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
