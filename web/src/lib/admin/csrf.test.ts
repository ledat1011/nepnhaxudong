import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCsrfToken, resetCsrfToken } from "./csrf";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "./errors";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCsrfToken", () => {
  it("returns the token and caches it", async () => {
    fetchMock.mockResolvedValueOnce(json({ headerName: "X-XSRF-TOKEN", token: "tok-1" }));
    expect(await getCsrfToken()).toBe("tok-1");
    expect(await getCsrfToken()).toBe("tok-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing", {}],
    ["empty", { token: "" }],
    ["not a string", { token: 5 }],
  ])("throws AdminApiError and does not cache when the token is %s", async (_name, body) => {
    fetchMock.mockResolvedValueOnce(json(body));
    const error = await getCsrfToken().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ detail: GENERIC_ERROR_MESSAGE });

    fetchMock.mockResolvedValueOnce(json({ token: "tok-2" }));
    expect(await getCsrfToken()).toBe("tok-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws AdminApiError when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 200 }));
    await expect(getCsrfToken()).rejects.toBeInstanceOf(AdminApiError);
  });
});
