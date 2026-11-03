import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

function request(acceptLanguage?: string): NextRequest {
  return new NextRequest("http://localhost:3000/", {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
  });
}

describe("proxy", () => {
  it("only matches the root path", () => {
    expect(config.matcher).toEqual(["/"]);
  });

  it("redirects / to /en for an English browser", () => {
    const response = proxy(request("en-US,en;q=0.9"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/en");
  });

  it("redirects / to /vi when there is no Accept-Language", () => {
    const response = proxy(request());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/vi");
  });

  it("tells shared caches that the redirect depends on Accept-Language", () => {
    expect(proxy(request("en")).headers.get("vary")).toBe("Accept-Language");
    expect(proxy(request()).headers.get("vary")).toBe("Accept-Language");
  });
});
