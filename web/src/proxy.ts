import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { classifyPath } from "@/lib/i18n/path-guard";
import { pickLang } from "@/lib/i18n/pick-lang";

/** The 404 page of the whole app (`global-not-found`), which Next serves here with status 404. */
export const NOT_FOUND_PATH = "/_not-found";

export function proxy(request: NextRequest) {
  switch (classifyPath(request.nextUrl.pathname)) {
    case "redirect-root": {
      const lang = pickLang(request.headers.get("accept-language"));
      const response = NextResponse.redirect(new URL(`/${lang}`, request.url), 307);
      // The target depends on this header, so shared caches must keep one copy per value.
      response.headers.set("Vary", "Accept-Language");
      return response;
    }
    case "not-found":
      return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    case "pass":
      return NextResponse.next();
  }
}

// Next internals and the API are never pages, so the proxy does not need to see them.
export const config = {
  matcher: ["/((?!_next/|api/).*)"],
};
