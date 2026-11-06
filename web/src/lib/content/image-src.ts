/** API images: the web server in front of Next (Caddy) serves them, not Next itself. */
const MEDIA_PREFIX = "/media/";

/**
 * Turns a content image URL into the `src` for next/image. An API image under /media is loaded by
 * its full address on SITE_URL. Any other root-relative path is a file in `web/public` (the sample
 * content uses some), which next/image reads from Next itself, so it stays as it is.
 */
export function toImageSrc(url: string, siteUrl = process.env.SITE_URL): string {
  if (!url.startsWith(MEDIA_PREFIX)) return url;
  if (!siteUrl) {
    throw new Error("SITE_URL is required to load images with a relative URL");
  }
  return `${siteUrl.replace(/\/$/, "")}${url}`;
}
