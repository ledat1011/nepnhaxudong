import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pickLang } from "@/lib/i18n/pick-lang";

export function proxy(request: NextRequest) {
  const lang = pickLang(request.headers.get("accept-language"));
  const response = NextResponse.redirect(new URL(`/${lang}`, request.url), 307);
  // The target depends on this header, so shared caches must keep one copy per value.
  response.headers.set("Vary", "Accept-Language");
  return response;
}

export const config = {
  matcher: ["/"],
};
