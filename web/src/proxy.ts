import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LANG } from "@/lib/i18n/langs";
import { classifyPath } from "@/lib/i18n/path-guard";
import { isIndexingOff } from "@/lib/seo/metadata";

/** The 404 page of the whole app (`global-not-found`), which Next serves here with status 404. */
export const NOT_FOUND_PATH = "/_not-found";

export function proxy(request: NextRequest) {
  switch (classifyPath(request.nextUrl.pathname)) {
    case "redirect-root":
      // Always Vietnamese, whatever the browser's language: most buyers are Vietnamese, and many of
      // them use a phone set to English. The language switch on every page leads to /en.
      return NextResponse.redirect(new URL(`/${DEFAULT_LANG}`, request.url), 307);
    case "not-found":
      return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    case "pass": {
      const response = NextResponse.next();
      // A preview copy lets crawlers read pages (link previews need that), so this header is what
      // keeps its pages and generated images out of search results.
      if (isIndexingOff()) response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
  }
}

// Next internals and the API are never pages, so the proxy does not need to see them.
export const config = {
  matcher: ["/((?!_next/|api/).*)"],
};
