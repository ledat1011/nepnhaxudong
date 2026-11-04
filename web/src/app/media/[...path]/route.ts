import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

/**
 * Local development only: serves the images that the API wrote into MEDIA_DEV_DIR, so the
 * admin and the public pages show uploaded images without a web server in front.
 * Production serves /media from the web server (Caddy), never from this route.
 */

// The folder and the environment are read per request.
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "X-Content-Type-Options": "nosniff" } });
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** True when `target` is `root` itself or lies inside it. */
function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const dir = process.env.MEDIA_DEV_DIR;
  if (process.env.NODE_ENV === "production" || !dir) return notFound();

  const segments = (await context.params).path.map(decode);
  // Each segment is one name: no separators of either kind, no dot segments, no NUL, nothing empty.
  if (
    segments.some(
      (s) => s === null || s === "" || s === "." || s === ".." || /[\\/\0]/.test(s) || path.isAbsolute(s),
    )
  ) {
    return notFound();
  }

  const contentType = CONTENT_TYPES[path.extname(segments[segments.length - 1] as string).toLowerCase()];
  if (!contentType) return notFound();

  try {
    const root = await realpath(path.resolve(dir));
    // realpath follows symlinks, so a link that leaves the folder is caught here.
    const file = await realpath(path.join(root, ...(segments as string[])));
    if (!isInside(root, file)) return notFound();
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": contentType, "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    // Missing file, a folder, no permission: all look the same from outside.
    return notFound();
  }
}
