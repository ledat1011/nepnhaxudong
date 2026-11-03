import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, NOT_FOUND_PATH, proxy } from "./proxy";

function request(path = "/", acceptLanguage?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
  });
}

describe("proxy", () => {
  it("runs on every path except Next internals and the API", () => {
    expect(config.matcher).toEqual(["/((?!_next/|api/).*)"]);
  });

  it("redirects / to /en for an English browser", () => {
    const response = proxy(request("/", "en-US,en;q=0.9"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/en");
  });

  it("redirects / to /vi when there is no Accept-Language", () => {
    const response = proxy(request());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/vi");
  });

  it("tells shared caches that the redirect depends on Accept-Language", () => {
    expect(proxy(request("/", "en")).headers.get("vary")).toBe("Accept-Language");
    expect(proxy(request()).headers.get("vary")).toBe("Accept-Language");
  });

  it("rewrites a path no page serves to the 404 page", () => {
    for (const path of ["/fr", "/wp-login.php", "/vi/stories", "/a/b/c/d"]) {
      const response = proxy(request(path));
      expect(response.headers.get("x-middleware-rewrite"), path).toBe(
        `http://localhost:3000${NOT_FOUND_PATH}`,
      );
      expect(response.headers.get("location"), path).toBeNull();
    }
  });

  it("does not rewrite the 404 page itself, so the rewrite cannot loop", () => {
    const response = proxy(request(NOT_FOUND_PATH));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("lets a path a page or file serves through", () => {
    for (const path of ["/vi", "/en/stories/x", "/robots.txt", "/sitemap.xml", "/icon.svg"]) {
      const response = proxy(request(path));
      expect(response.headers.get("x-middleware-rewrite"), path).toBeNull();
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
  });
});
