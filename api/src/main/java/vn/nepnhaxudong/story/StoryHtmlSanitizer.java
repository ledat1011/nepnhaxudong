package vn.nepnhaxudong.story;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * Cleans the HTML of a story body before it is saved: only the tags of the story editor stay, and
 * only the attributes and address protocols listed here.
 */
final class StoryHtmlSanitizer {

  /**
   * jsoup resolves relative addresses against a base address to check their protocol, and drops
   * them when there is no base. Relative addresses such as {@code /media/x.webp} are kept as
   * written (see {@code preserveRelativeLinks}); this value is never written to the output.
   */
  private static final String BASE_URI = "https://base.invalid/";

  private static final Safelist SAFELIST =
      Safelist.none()
          .addTags("p", "h2", "h3", "strong", "em", "a", "ul", "ol", "li", "blockquote", "img")
          .addAttributes("a", "href")
          .addAttributes("img", "src", "alt")
          .addProtocols("a", "href", "http", "https", "mailto", "tel")
          .addProtocols("img", "src", "http", "https")
          .preserveRelativeLinks(true);

  private StoryHtmlSanitizer() {}

  static String clean(String html) {
    // Output settings keep an encoder inside, so each call gets its own.
    return Jsoup.clean(html, BASE_URI, SAFELIST, new Document.OutputSettings().prettyPrint(false));
  }
}
