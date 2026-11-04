import { createHash, timingSafeEqual } from "node:crypto";
import { TAG_HOME, TAG_STORIES, storyTag } from "@/lib/content/tags";

const MAX_TAGS = 50;
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const STORY_PREFIX = storyTag("");

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isValidSecret(
  given: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || given === null) return false;
  // Hashing gives both buffers the same length, as timingSafeEqual requires.
  return timingSafeEqual(sha256(given), sha256(expected));
}

function isAllowedTag(tag: unknown): tag is string {
  if (typeof tag !== "string") return false;
  if (tag === TAG_HOME || tag === TAG_STORIES) return true;
  return (
    tag.startsWith(STORY_PREFIX) &&
    SLUG_PATTERN.test(tag.slice(STORY_PREFIX.length))
  );
}

export function parseRevalidateTags(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const tags = (body as { tags?: unknown }).tags;
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > MAX_TAGS) {
    return null;
  }
  if (!tags.every(isAllowedTag)) return null;
  return [...new Set(tags)];
}
