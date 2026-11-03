package vn.nepnhaxudong.press;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Optional;

/**
 * The rule for an article address: an absolute http or https address with a host, at most 2000
 * characters.
 */
final class WebAddress {

  static final int MAX_LENGTH = 2000;

  private WebAddress() {}

  static Optional<URI> parse(String text) {
    if (text == null || text.isBlank() || text.length() > MAX_LENGTH) {
      return Optional.empty();
    }
    URI uri;
    try {
      uri = new URI(text);
    } catch (URISyntaxException e) {
      return Optional.empty();
    }
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
    boolean web = scheme.equals("http") || scheme.equals("https");
    if (!web || uri.getHost() == null || uri.getHost().isBlank()) {
      return Optional.empty();
    }
    return Optional.of(uri);
  }

  /** The host for a lookup or SNI: an IPv6 literal without its brackets. */
  static String resolvableHost(URI uri) {
    String host = uri.getHost();
    boolean bracketed = host.startsWith("[") && host.endsWith("]");
    return bracketed ? host.substring(1, host.length() - 1) : host;
  }
}
