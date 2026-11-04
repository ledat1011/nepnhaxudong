import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client";
import { ContentUnavailableError } from "./client";

type NextInit = RequestInit & { next?: { tags?: string[] } };

function setup(response: Response | Error) {
  const fetchFn = vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const client = createApiClient("https://api.test", fetchFn);
  const call = () => {
    const [url, init] = fetchFn.mock.calls[0];
    return { url: String(url), init: init as NextInit };
  };
  return { client, call };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("createApiClient", () => {
  it("getHome calls the home URL with cache options and the home tag", async () => {
    const { client, call } = setup(json({ lang: "en" }));
    await client.getHome("en");
    const { url, init } = call();
    expect(url).toBe("https://api.test/api/public/en/home");
    expect(init.next?.tags).toEqual(["home"]);
    expect(init.cache).toBe("force-cache");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("getStories passes the page and uses the stories tag", async () => {
    const { client, call } = setup(json([]));
    await client.getStories("vi", 0);
    const { url, init } = call();
    expect(url).toBe("https://api.test/api/public/vi/stories?page=0");
    expect(init.next?.tags).toEqual(["stories"]);
  });

  it("getStory encodes the slug and tags the list and the story", async () => {
    const { client, call } = setup(json({ slug: "a b" }));
    await client.getStory("vi", "a b");
    const { url, init } = call();
    expect(url).toBe("https://api.test/api/public/vi/stories/a%20b");
    expect(init.next?.tags).toEqual(["stories", "story:a b"]);
  });

  it("ignores trailing slashes in the base URL", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json({ lang: "vi" }));
    await createApiClient("https://api.test//", fetchFn).getHome("vi");
    expect(String(fetchFn.mock.calls[0][0])).toBe(
      "https://api.test/api/public/vi/home",
    );
  });

  it("names the requested URL in the error message", async () => {
    const { client } = setup(new Response(null, { status: 500 }));
    await expect(client.getHome("vi")).rejects.toThrow(
      "https://api.test/api/public/vi/home",
    );
  });

  it("getStory returns null on 404", async () => {
    const { client } = setup(new Response(null, { status: 404 }));
    expect(await client.getStory("vi", "x")).toBeNull();
  });

  it("maps a 500 to ContentUnavailableError", async () => {
    const { client } = setup(new Response(null, { status: 500 }));
    await expect(client.getStory("vi", "x")).rejects.toBeInstanceOf(
      ContentUnavailableError,
    );
  });

  it("maps a timeout to ContentUnavailableError", async () => {
    const timeout = new DOMException("The operation timed out.", "TimeoutError");
    const { client } = setup(timeout);
    await expect(client.getHome("vi")).rejects.toBeInstanceOf(
      ContentUnavailableError,
    );
  });

  it("maps a network error to ContentUnavailableError", async () => {
    const { client } = setup(new TypeError("fetch failed"));
    await expect(client.getStories("vi", 1)).rejects.toBeInstanceOf(
      ContentUnavailableError,
    );
  });

  it("maps a 404 on home to ContentUnavailableError", async () => {
    const { client } = setup(new Response(null, { status: 404 }));
    await expect(client.getHome("vi")).rejects.toBeInstanceOf(
      ContentUnavailableError,
    );
  });
});
