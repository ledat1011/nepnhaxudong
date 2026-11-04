/** Turns an API image URL into an absolute one; a relative URL is loaded from SITE_URL. */
export function toImageSrc(url: string, siteUrl = process.env.SITE_URL): string {
  if (!url.startsWith("/")) return url;
  if (!siteUrl) {
    throw new Error("SITE_URL is required to load images with a relative URL");
  }
  return `${siteUrl.replace(/\/$/, "")}${url}`;
}
