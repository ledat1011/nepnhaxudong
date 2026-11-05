const MAX_LENGTH = 80;

function trimDashes(text: string): string {
  return text.replace(/^-+|-+$/g, "");
}

/**
 * The readable part of a web address made from a title. It is the same rule as `SlugGenerator.slugify` of the API:
 * marks removed (NFD), `đ` as `d`, only a-z, 0-9 and single dashes, no dash at either end, at most 80 characters.
 * It is empty when the text has no letter or digit.
 */
export function slugify(text: string): string {
  const plain = text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
  const slug = trimDashes(plain.replace(/[^a-z0-9]+/g, "-"));
  return slug.length > MAX_LENGTH ? trimDashes(slug.slice(0, MAX_LENGTH)) : slug;
}
