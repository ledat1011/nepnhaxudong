import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, GENERIC_ERROR_MESSAGE, isSessionExpired } from "./errors";
import { adminFetch, adminUpload } from "./api";
import { resetCsrfToken } from "./csrf";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function problem(status: number, code: string | null, detail: string, title?: string): Response {
  const body = { status, detail, ...(code ? { code } : {}), ...(title ? { title } : {}) };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function csrf(token: string): Response {
  return json({ headerName: "X-XSRF-TOKEN", token });
}

function headersOf(call: number): Headers {
  return new Headers(fetchMock.mock.calls[call][1]?.headers);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch", () => {
  it("prefixes /api, sends no CSRF header for GET and parses JSON", async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: 1 }]));
    const result = await adminFetch<{ id: number }[]>("/admin/products");
    expect(result).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/products");
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("same-origin");
    expect(headersOf(0).has("X-XSRF-TOKEN")).toBe(false);
  });

  it("sends the CSRF token on POST and fetches it only once for two requests", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("tok-1"))
      .mockResolvedValueOnce(json({ id: 1 }))
      .mockResolvedValueOnce(json({ id: 2 }));
    await adminFetch("/admin/products", { method: "POST", body: { a: 1 } });
    await adminFetch("/admin/products/1", { method: "PUT", body: { a: 2 } });

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/auth/csrf",
      "/api/admin/products",
      "/api/admin/products/1",
    ]);
    expect(headersOf(1).get("X-XSRF-TOKEN")).toBe("tok-1");
    expect(headersOf(2).get("X-XSRF-TOKEN")).toBe("tok-1");
    expect(headersOf(1).get("Content-Type")).toBe("application/json");
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("refreshes the token and retries exactly once on 403 csrf-invalid", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("old"))
      .mockResolvedValueOnce(problem(403, "csrf-invalid", "Phiên đã hết hạn."))
      .mockResolvedValueOnce(csrf("new"))
      .mockResolvedValueOnce(json({ ok: true }));
    const result = await adminFetch("/admin/products/1", { method: "DELETE" });
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(headersOf(1).get("X-XSRF-TOKEN")).toBe("old");
    expect(headersOf(3).get("X-XSRF-TOKEN")).toBe("new");
  });

  it("does not retry a second time when the retry is also csrf-invalid", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("a"))
      .mockResolvedValueOnce(problem(403, "csrf-invalid", "Lỗi."))
      .mockResolvedValueOnce(csrf("b"))
      .mockResolvedValueOnce(problem(403, "csrf-invalid", "Lỗi."));
    await expect(adminFetch("/admin/x", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 403,
      code: "csrf-invalid",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not retry a 403 with another code", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("a"))
      .mockResolvedValueOnce(problem(403, "forbidden", "Không có quyền."));
    await expect(adminFetch("/admin/x", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("turns a problem+json body into AdminApiError with detail, code and title", async () => {
    fetchMock.mockResolvedValueOnce(
      problem(422, "x-code", "Tên không được để trống.", "Dữ liệu không hợp lệ"),
    );
    const error = await adminFetch("/admin/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({
      status: 422,
      detail: "Tên không được để trống.",
      code: "x-code",
      title: "Dữ liệu không hợp lệ",
    });
  });

  it("uses the fixed message for a plain-text 413", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("t"))
      .mockResolvedValueOnce(new Response("request body too large", { status: 413 }));
    await expect(adminFetch("/admin/media", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 413,
      detail: "Ảnh quá lớn. Tối đa 15 MB.",
    });
  });

  it("reports a network failure as status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const error = await adminFetch("/admin/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({
      status: 0,
      detail: "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.",
    });
  });

  it("uses the generic message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(adminFetch("/admin/products")).rejects.toMatchObject({
      status: 502,
      detail: "Đã có lỗi xảy ra. Hãy thử lại sau.",
      code: null,
    });
  });

  it("returns undefined for 204", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("t"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(adminFetch("/admin/products/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("passes the abort signal through and rethrows an abort unchanged", async () => {
    const controller = new AbortController();
    const abort = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValueOnce(abort);
    controller.abort();
    await expect(adminFetch("/admin/products", { signal: controller.signal })).rejects.toBe(abort);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("fetches a new token after resetCsrfToken", async () => {
    fetchMock
      .mockResolvedValueOnce(csrf("one"))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(csrf("two"))
      .mockResolvedValueOnce(json({}));
    await adminFetch("/admin/x", { method: "POST", body: {} });
    resetCsrfToken();
    await adminFetch("/admin/x", { method: "POST", body: {} });
    expect(headersOf(3).get("X-XSRF-TOKEN")).toBe("two");
  });
});

describe("adminFetch with a successful response that cannot be parsed", () => {
  it("throws AdminApiError, not SyntaxError, when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>ok</html>", { status: 200 }));
    const error = await adminFetch("/admin/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 200, detail: GENERIC_ERROR_MESSAGE });
  });

  it("throws AdminApiError when the body cannot be read", async () => {
    const broken = new Response("{}", { status: 200 });
    vi.spyOn(broken, "json").mockRejectedValue(new TypeError("body stream failed"));
    fetchMock.mockResolvedValueOnce(broken);
    const error = await adminFetch("/admin/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 200, detail: GENERIC_ERROR_MESSAGE });
  });
});

describe("adminUpload", () => {
  it("sends the form with the CSRF token and without a Content-Type", async () => {
    const form = new FormData();
    form.append("file", new Blob(["x"], { type: "image/png" }), "a.png");
    fetchMock.mockResolvedValueOnce(csrf("up")).mockResolvedValueOnce(json({ id: 9 }));
    const result = await adminUpload<{ id: number }>("/admin/media", form);
    expect(result).toEqual({ id: 9 });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/media");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1][1]?.body).toBe(form);
    expect(headersOf(1).has("Content-Type")).toBe(false);
    expect(headersOf(1).get("X-XSRF-TOKEN")).toBe("up");
  });
});

describe("isSessionExpired", () => {
  it("is true only for 401 with code session-expired", () => {
    expect(isSessionExpired(new AdminApiError(401, "x", "session-expired"))).toBe(true);
  });

  it("is false for 401 with invalid-credentials", () => {
    expect(isSessionExpired(new AdminApiError(401, "x", "invalid-credentials"))).toBe(false);
  });

  it("is false for 401 with no code", () => {
    expect(isSessionExpired(new AdminApiError(401, "x", null))).toBe(false);
  });

  it("is false for another status or a non-error", () => {
    expect(isSessionExpired(new AdminApiError(403, "x", "session-expired"))).toBe(false);
    expect(isSessionExpired(new Error("x"))).toBe(false);
    expect(isSessionExpired(undefined)).toBe(false);
  });
});
