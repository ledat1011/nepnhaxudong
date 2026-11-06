import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("redirects / to /vi, whatever the browser's language", () => {
    for (const acceptLanguage of [undefined, "en-US,en;q=0.9", "vi-VN,vi;q=0.9"]) {
      const response = proxy(request("/", acceptLanguage));
      expect(response.status, acceptLanguage).toBe(307);
      expect(response.headers.get("location"), acceptLanguage).toBe("http://localhost:3000/vi");
      expect(response.headers.get("vary"), acceptLanguage).toBeNull();
    }
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

  describe("X-Robots-Tag", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("marks every served path noindex on a preview copy (SITE_NOINDEX=1)", () => {
      vi.stubEnv("SITE_NOINDEX", "1");
      for (const path of ["/vi", "/en/stories/x", "/vi/opengraph-image/default"]) {
        expect(proxy(request(path)).headers.get("x-robots-tag"), path).toBe("noindex, nofollow");
      }
    });

    it("is not set on the real site", () => {
      vi.stubEnv("SITE_NOINDEX", "");
      expect(proxy(request("/vi")).headers.get("x-robots-tag")).toBeNull();
    });
  });
});
