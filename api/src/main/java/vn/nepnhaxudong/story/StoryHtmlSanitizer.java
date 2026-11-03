package vn.nepnhaxudong.story;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * Cleans the HTML of a story body before it is saved: only the tags, attributes and addresses
 * allowed by {@link StorySafelist} stay.
 */
final class StoryHtmlSanitizer {

  /**
   * jsoup resolves relative addresses against a base address to check their protocol, and drops
   * them when there is no base. This value is never written to the output.
   */
  private static final String BASE_URI = "https://base.invalid/";

  private static final Safelist SAFELIST = new StorySafelist();

  private StoryHtmlSanitizer() {}

  static String clean(String html) {
    // Output settings keep an encoder inside, so each call gets its own.
    return Jsoup.clean(html, BASE_URI, SAFELIST, new Document.OutputSettings().prettyPrint(false));
  }
}
