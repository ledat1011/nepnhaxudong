import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pickLang } from "@/lib/i18n/pick-lang";

export function proxy(request: NextRequest) {
  const lang = pickLang(request.headers.get("accept-language"));
  return NextResponse.redirect(new URL(`/${lang}`, request.url), 307);
}

export const config = {
  matcher: ["/"],
};
