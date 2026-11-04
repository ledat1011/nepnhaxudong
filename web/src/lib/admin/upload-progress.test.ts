import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "./csrf";
import { AdminApiError, NETWORK_ERROR_MESSAGE, PAYLOAD_TOO_LARGE_MESSAGE } from "./errors";
import { UPLOAD_TIMEOUT_MESSAGE, uploadWithProgress } from "./upload-progress";

/** A stand-in for XMLHttpRequest: each instance waits until the test answers it. */
class FakeXhr {
  static all: FakeXhr[] = [];
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown = null;
  status = 0;
  responseText = "";
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  timeout = 0;
  aborted = false;

  constructor() {
    FakeXhr.all.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  answer(status: number, body: unknown) {
    this.status = status;
    this.responseText = typeof body === "string" ? body : JSON.stringify(body);
    this.onload?.();
  }
}

const fetchMock = vi.fn<typeof fetch>();

async function sent(index: number): Promise<FakeXhr> {
  await vi.waitFor(() => expect(FakeXhr.all.length).toBeGreaterThan(index));
  return FakeXhr.all[index];
}

beforeEach(() => {
  FakeXhr.all = [];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ token: "tok-1" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  resetCsrfToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadWithProgress", () => {
  it("posts the form to /api with the CSRF token, reports progress and returns the JSON", async () => {
    const form = new FormData();
    const progress = vi.fn();
    const result = uploadWithProgress<{ id: number }>("/admin/media", form, { onProgress: progress });
    const xhr = await sent(0);
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/admin/media");
    expect(xhr.headers["X-XSRF-TOKEN"]).toBe("tok-1");
    expect(xhr.headers.Accept).toBe("application/json");
    expect(xhr.body).toBe(form);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 });
    expect(progress).toHaveBeenLastCalledWith(0.25);
    xhr.answer(201, { id: 9 });
    await expect(result).resolves.toEqual({ id: 9 });
  });

  it("gives the problem detail of the API, for example the HEIC message", async () => {
    const result = uploadWithProgress("/admin/media", new FormData());
    (await sent(0)).answer(415, { status: 415, detail: "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG." });
    await expect(result).rejects.toMatchObject({ status: 415, detail: "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG." });
  });

  it("turns a plain-text 413 of the proxy into the size message", async () => {
    const result = uploadWithProgress("/admin/media", new FormData());
    (await sent(0)).answer(413, "Request Entity Too Large");
    await expect(result).rejects.toMatchObject({ status: 413, detail: PAYLOAD_TOO_LARGE_MESSAGE });
  });

  it("gets a new CSRF token and sends once more when the token is old", async () => {
    const result = uploadWithProgress<{ id: number }>("/admin/media", new FormData());
    (await sent(0)).answer(403, { status: 403, code: "csrf-invalid", detail: "x" });
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ token: "tok-2" }), { status: 200 }));
    const second = await sent(1);
    expect(second.headers["X-XSRF-TOKEN"]).toBe("tok-2");
    second.answer(201, { id: 3 });
    await expect(result).resolves.toEqual({ id: 3 });
  });

  it("reports a network failure with the network message", async () => {
    const result = uploadWithProgress("/admin/media", new FormData());
    (await sent(0)).onerror?.();
    const error = await result.catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(AdminApiError);
    expect((error as AdminApiError).detail).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("stops the request when the signal aborts", async () => {
    const controller = new AbortController();
    const result = uploadWithProgress("/admin/media", new FormData(), { signal: controller.signal });
    const xhr = await sent(0);
    controller.abort();
    expect(xhr.aborted).toBe(true);
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("gives up after two minutes, so a stalled phone connection does not hold the queue", async () => {
    const result = uploadWithProgress("/admin/media", new FormData());
    const xhr = await sent(0);
    expect(xhr.timeout).toBe(120_000);
    xhr.ontimeout?.();
    await expect(result).rejects.toMatchObject({ status: 0, detail: UPLOAD_TIMEOUT_MESSAGE });
  });
});
