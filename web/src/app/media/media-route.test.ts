import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GET } from "./[...path]/route";

const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]);
let root: string;
let mediaDir: string;
let symlinkWorks = true;
let fileSymlinkWorks = true;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "media-route-"));
  mediaDir = join(root, "media");
  mkdirSync(join(mediaDir, "2026", "11"), { recursive: true });
  writeFileSync(join(mediaDir, "2026", "11", "a.webp"), WEBP);
  writeFileSync(join(mediaDir, "2026", "11", "b.JPG"), Buffer.from([1]));
  writeFileSync(join(mediaDir, "2026", "11", "c.png"), Buffer.from([2]));
  writeFileSync(join(mediaDir, "2026", "11", "notes.txt"), "text");
  writeFileSync(join(root, "secret.txt"), "secret");
  writeFileSync(join(root, "outside.png"), Buffer.from([3]));
  mkdirSync(join(root, "outsidedir"));
  writeFileSync(join(root, "outsidedir", "x.png"), Buffer.from([4]));
  try {
    // A junction needs no privilege on Windows; on Linux it is a normal directory symlink.
    symlinkSync(join(root, "outsidedir"), join(mediaDir, "linkdir"), "junction");
  } catch {
    symlinkWorks = false;
  }
  try {
    symlinkSync(join(root, "outside.png"), join(mediaDir, "link.png"), "file");
  } catch {
    // Creating a file symlink can need an administrator right on Windows.
    fileSymlinkWorks = false;
  }
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function call(path: string[]) {
  return GET(new Request("http://localhost/media/x"), { params: Promise.resolve({ path }) });
}

function useDevDir() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("MEDIA_DEV_DIR", mediaDir);
}

describe("GET /media/[...path]", () => {
  it("serves the file bytes with the right Content-Type", async () => {
    useDevDir();
    const response = await call(["2026", "11", "a.webp"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(WEBP);
  });

  it("maps .jpg (any case) and .png", async () => {
    useDevDir();
    expect((await call(["2026", "11", "b.JPG"])).headers.get("Content-Type")).toBe("image/jpeg");
    expect((await call(["2026", "11", "c.png"])).headers.get("Content-Type")).toBe("image/png");
  });

  it.each([
    [["..", "secret.txt"]],
    [["..%2fsecret.txt"]],
    [["..%2Fsecret.txt"]],
    [["2026", "..", "..", "secret.txt"]],
    [["%2e%2e", "secret.txt"]],
    [["2026\\..\\..\\secret.txt"]],
    [["/etc/passwd"]],
    [["C:\\Windows\\win.ini"]],
    [["2026", "11", "missing.webp"]],
    [["2026", "11"]],
    [["2026", "11", "a.webp\0.png"]],
  ])("answers 404 for %j", async (path) => {
    useDevDir();
    expect((await call(path)).status).toBe(404);
  });

  it("answers 404 for a file type that is not an image", async () => {
    useDevDir();
    expect((await call(["2026", "11", "notes.txt"])).status).toBe(404);
  });

  it("answers 404 for a file symlink that points outside the folder", async (ctx) => {
    if (!fileSymlinkWorks) ctx.skip();
    useDevDir();
    expect((await call(["link.png"])).status).toBe(404);
  });

  it("answers 404 for a folder link that points outside the folder", async (ctx) => {
    if (!symlinkWorks) ctx.skip();
    useDevDir();
    expect((await call(["linkdir", "x.png"])).status).toBe(404);
  });

  it("answers 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MEDIA_DEV_DIR", mediaDir);
    expect((await call(["2026", "11", "a.webp"])).status).toBe(404);
  });

  it("answers 404 when MEDIA_DEV_DIR is empty", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MEDIA_DEV_DIR", "");
    expect((await call(["2026", "11", "a.webp"])).status).toBe(404);
  });
});
