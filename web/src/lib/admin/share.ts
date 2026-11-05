export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

type ShareContent = { title?: string; text: string; url?: string };

/**
 * Opens the share sheet of the phone (Web Share API), so the user can pick Zalo, Messenger or a message. Without a
 * share sheet (most computers) the text and the link are copied instead, to paste in Zalo. "cancelled" means the
 * user closed the share sheet: nothing else happens then.
 */
export async function shareOrCopy(content: ShareContent): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(content);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Refused for another reason (for example not allowed here): copying still works.
    }
  }
  try {
    if (!navigator.clipboard) throw new Error("No clipboard API");
    await navigator.clipboard.writeText(content.url === undefined ? content.text : `${content.text}\n${content.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
