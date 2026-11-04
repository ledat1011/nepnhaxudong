import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { revalidateTag } from "next/cache";
import { POST } from "./route";

const SECRET = "test-secret-value";

function call(body: string, secret: string | null = SECRET) {
  const headers = new Headers({ "content-type": "application/json" });
  if (secret !== null) headers.set("x-revalidate-secret", secret);
  return POST(
    new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers,
      body,
    }),
  );
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.stubEnv("REVALIDATE_SECRET", SECRET);
    vi.mocked(revalidateTag).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("expires every tag immediately when the secret is right", async () => {
    const res = await call(JSON.stringify({ tags: ["home", "stories"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ["home", "stories"] });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith("home", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("stories", { expire: 0 });
  });

  it("revalidates a duplicate tag once", async () => {
    const res = await call(
      JSON.stringify({ tags: ["story:mua-gat", "story:mua-gat"] }),
    );
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
  });

  it("answers 401 for a wrong secret", async () => {
    const res = await call(JSON.stringify({ tags: ["home"] }), "wrong");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 401 when the secret header is missing", async () => {
    const res = await call(JSON.stringify({ tags: ["home"] }), null);
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 401 when the server has no REVALIDATE_SECRET", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    const res = await call(JSON.stringify({ tags: ["home"] }), "");
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("checks the secret before reading the body", async () => {
    const res = await call("not json", "wrong");
    expect(res.status).toBe(401);
  });

  it("answers 400 when the body is not JSON", async () => {
    const res = await call("abc");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid tags" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 400 for an unknown tag", async () => {
    const res = await call(JSON.stringify({ tags: ["x"] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid tags" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates nothing when one tag in the list is invalid", async () => {
    const res = await call(JSON.stringify({ tags: ["home", "x"] }));
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
