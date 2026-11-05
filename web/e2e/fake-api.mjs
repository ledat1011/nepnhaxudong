// Test-only stand-in for the B1 public API. It answers with the same fixture
// files the mock content client uses, at the URLs of the real API.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { FAKE_API_PORT, HOST } from "./targets.mjs";

const LANGS = ["vi", "en"];
const PAGE_SIZE = 12;
const HOME_STORY_COUNT = 3;

const fixture = (name) =>
  JSON.parse(
    readFileSync(new URL(`../src/fixtures/${name}.json`, import.meta.url), "utf8"),
  );

const home = Object.fromEntries(LANGS.map((lang) => [lang, fixture(`home.${lang}`)]));
const stories = Object.fromEntries(LANGS.map((lang) => [lang, fixture(`stories.${lang}`)]));

// A story that only the broken-image test opens: its cover file does not exist. It is not in the
// lists, so no other test sees it.
const BROKEN_IMAGE_STORY = {
  slug: "e2e-anh-loi",
  title: "[MẪU] Bài có ảnh bìa bị lỗi",
  excerpt: "[MẪU] Trích đoạn",
  publishedAt: "2026-01-01T02:00:00Z",
  cover: { url: "/media/e2e/khong-co.webp", width: 1600, height: 900, alt: "[MẪU] Ảnh bìa không có" },
  bodyHtml: "<p>[MẪU] Nội dung</p>",
  alternateSlug: null,
};

const newestFirst = (lang) =>
  [...stories[lang]].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

function toSummary({ slug, title, excerpt, publishedAt, cover }) {
  return { slug, title, excerpt, publishedAt, cover };
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function handleTagline(req, res) {
  try {
    const changes = JSON.parse(await readBody(req));
    for (const [lang, tagline] of Object.entries(changes)) {
      if (!LANGS.includes(lang) || typeof tagline !== "string") {
        return send(res, 400, { error: "bad body" });
      }
      home[lang].brand.tagline = tagline;
    }
    return send(res, 200, { ok: true });
  } catch {
    return send(res, 400, { error: "bad body" });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}`);

  if (req.method === "POST" && url.pathname === "/__test/tagline") {
    return handleTagline(req, res);
  }
  if (req.method !== "GET") return send(res, 405, { error: "method" });

  const match = /^\/api\/public\/([^/]+)\/(home|stories)(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match) return send(res, 404, { error: "not found" });
  const [, lang, resource, rawSlug] = match;
  if (!LANGS.includes(lang)) return send(res, 404, { error: "unknown language" });

  if (resource === "home" && rawSlug === undefined) {
    const items = newestFirst(lang).slice(0, HOME_STORY_COUNT).map(toSummary);
    return send(res, 200, { ...home[lang], lang, stories: items });
  }

  if (resource === "stories" && rawSlug === undefined) {
    const page = Number(url.searchParams.get("page") ?? "0");
    if (!Number.isInteger(page) || page < 0) return send(res, 400, { error: "bad page" });
    const items = newestFirst(lang).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return send(res, 200, items.map(toSummary));
  }

  if (resource === "stories") {
    const slug = decodeURIComponent(rawSlug);
    if (slug === BROKEN_IMAGE_STORY.slug) return send(res, 200, BROKEN_IMAGE_STORY);
    const story = stories[lang].find((item) => item.slug === slug);
    return story ? send(res, 200, story) : send(res, 404, { error: "no such story" });
  }

  return send(res, 404, { error: "not found" });
});

server.listen(Number(process.env.PORT ?? FAKE_API_PORT), HOST, () => {
  console.log(`fake API on ${HOST}:${server.address().port}`);
});
