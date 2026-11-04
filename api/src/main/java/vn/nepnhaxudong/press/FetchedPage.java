package vn.nepnhaxudong.press;

/**
 * The answer of one HTTP request. {@code location} and {@code contentType} are null when the
 * server did not send them. {@code body} is at most 2 MB; it is empty for a redirect.
 */
public record FetchedPage(int status, String location, String contentType, byte[] body) {}
