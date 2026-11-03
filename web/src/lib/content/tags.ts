export const TAG_HOME = "home";
export const TAG_STORIES = "stories";

export const STORIES_PAGE_SIZE = 12;

export function storyTag(slug: string): string {
  return `story:${slug}`;
}
