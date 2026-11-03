package vn.nepnhaxudong.press;

/** The body of POST /admin/press/preview. A missing or unusable url gives an empty preview. */
public record PressPreviewRequest(String url) {}
