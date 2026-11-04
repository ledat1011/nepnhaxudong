import { revalidateTag } from "next/cache";
import { isValidSecret, parseRevalidateTags } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const given = request.headers.get("x-revalidate-secret");
  if (!isValidSecret(given, process.env.REVALIDATE_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid tags" }, { status: 400 });
  }

  const tags = parseRevalidateTags(body);
  if (tags === null) {
    return Response.json({ error: "invalid tags" }, { status: 400 });
  }

  // { expire: 0 }: stale content is never served, so the next visitor
  // gets a blocking revalidate instead of the old page.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
